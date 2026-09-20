import mongoose from 'mongoose';
import jwt from 'jsonwebtoken'; // NEW
import { loadDocument, appendOperation } from '../utils/documentStore.js';
import { applyOp, transformSequence, validateOp } from '../ot/operations.js';
import Document from '../models/Document.js';
import User from '../models/User.js'; // NEW

const registerDocumentSocket = (io) => {
const userSocketMap = {};

const documentLocks = new Map();
const liveDocuments = new Map();

const withDocumentLock = (documentId, fn) => {
    const prev = documentLocks.get(documentId) || Promise.resolve();
    const next = prev.then(fn, fn).finally(() => {
        if (documentLocks.get(documentId) === next) {
            documentLocks.delete(documentId);
        }
    });
    documentLocks.set(documentId, next);
    return next;
};

const documentUsers = new Map(); // documentId -> Map(socketId -> {name, color})

const COLORS = ['#e63946', '#2a9d8f', '#e9c46a', '#457b9d', '#f4a261', '#8338ec', '#3a86ff', '#fb5607'];
const randomColor = () => COLORS[Math.floor(Math.random() * COLORS.length)];

const broadcastPresence = (documentId) => {
    const users = documentUsers.get(documentId);
    const list = users ? Array.from(users.entries()).map(([socketId, u]) => ({ socketId, ...u })) : [];
    io.to(documentId).emit('presence-update', list);
};

const removeUserFromDocument = (documentId, socketId) => {
    const users = documentUsers.get(documentId);
    if (users) {
        users.delete(socketId);
        broadcastPresence(documentId);
    }
};

// NEW: authenticate every socket connection before it's allowed through
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth?.token;
    if (!token) {
      return next(new Error('Authentication required'));
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);
    if (!user) {
      return next(new Error('User no longer exists'));
    }
    socket.user = user;
    next();
  } catch (err) {
    next(new Error('Invalid or expired token'));
  }
});

  io.on('connection', (socket) => {
    console.log('a user connected:', socket.user?.name);

    socket.on('join-document', async ({ documentId }) => {
      if (!mongoose.Types.ObjectId.isValid(documentId)) {
        socket.emit('error', { message: 'Invalid document ID' });
        return;
      }

      // NEW: enforce the same access rules as the REST API
      const docCheck = await Document.findById(documentId);
      if (!docCheck) {
        socket.emit('error', { message: 'Document not found' });
        return;
      }
      const isOwner = docCheck.owner.equals(socket.user._id);
      const isCollaborator = docCheck.collaborators.some(c => c.equals(socket.user._id));
      if (!isOwner && !isCollaborator && !docCheck.isPublic) {
        socket.emit('error', { message: 'You do not have access to this document' });
        return;
      }

      userSocketMap[socket.id] = documentId;
      socket.join(documentId);

      if (!documentUsers.has(documentId)) documentUsers.set(documentId, new Map());
      const userInfo = { name: socket.user.name, color: randomColor(), cursorPos: 0 }; // CHANGED
      documentUsers.get(documentId).set(socket.id, userInfo);
      socket.emit('presence-self', { socketId: socket.id, ...userInfo });
      broadcastPresence(documentId);

      const live = liveDocuments.get(documentId);
      if (live) {
        socket.emit('document-state', { title: live.title, content: live.content, revision: live.revision, ops: [] });
        socket.to(documentId).emit('user-joined', { socketId: socket.id });
        return;
      }

      const doc = docCheck; // CHANGED: reuse already-fetched doc, avoid duplicate query
      if (doc.revision === undefined || doc.revision === null) {
        doc.revision = 0;
        await doc.save();
      }

      socket.emit('document-state', { title: doc.title, content: doc.content, revision: doc.revision, ops: [] });
      socket.to(documentId).emit('user-joined', { socketId: socket.id });
    });

    socket.on('submit-operation', async ({ documentId, op }) => {
        const { clientId, baseRevision } = op;
        if (!mongoose.Types.ObjectId.isValid(documentId) || !validateOp(op)) {
            socket.emit('operation-error', { message: 'Invalid operation' });
            return;
        }

        await withDocumentLock(documentId, async () => {
          let live = liveDocuments.get(documentId);
          if (!live) {
            const docData = await loadDocument(documentId);
            if (!docData) {
              socket.emit('operation-error', { message: 'Document not found' });
              return;
            }
            live = {
              content: docData.content,
              revision: docData.revision,
              opsLog: docData.doc.opsLog,
              title: docData.doc.title,
              saveTimer: null,
            };
            liveDocuments.set(documentId, live);
          }

          const concurrentOps = live.opsLog.filter(o => o.appliedRevision > baseRevision);
          const transformedOp = transformSequence(op, concurrentOps);

          live.content = applyOp(live.content, transformedOp);
          live.revision += 1;

          const opToLog = { ...transformedOp, clientId, baseRevision, appliedRevision: live.revision, createdAt: new Date() };
          live.opsLog.push(opToLog);

          socket.emit('operation-ack', { appliedRevision: live.revision, op: transformedOp });
          socket.to(documentId).emit('document-operation', { op: transformedOp, appliedRevision: live.revision, clientId });

          clearTimeout(live.saveTimer);
          live.saveTimer = setTimeout(() => {
            appendOperation(documentId, opToLog, live.revision).catch(console.error);
            Document.findByIdAndUpdate(documentId, { content: live.content }).catch(console.error);
          }, 1500);
      });
    });

    socket.on('request-resync', async ({ documentId }) => {
        const live = liveDocuments.get(documentId);
        if (live) {
            socket.emit('document-state', { title: live.title, content: live.content, revision: live.revision, ops: [] });
            return;
        }
        const doc = await Document.findById(documentId);
        if (doc) {
            socket.emit('document-state', { title: doc.title, content: doc.content, revision: doc.revision, ops: [] });
        }
    });

    socket.on('cursor-update', ({ documentId, pos }) => {
        const users = documentUsers.get(documentId);
        if (users && users.has(socket.id)) {
            users.get(socket.id).cursorPos = pos;
        }
        socket.to(documentId).emit('cursor-update', { socketId: socket.id, pos });
    });

    socket.on('leave-document', ({ documentId }) => {
      socket.leave(documentId);
      delete userSocketMap[socket.id];
      removeUserFromDocument(documentId, socket.id);
      socket.to(documentId).emit('user-left', { socketId: socket.id });
    });

    socket.on('disconnect', () => {
      const documentId = userSocketMap[socket.id];
      if (documentId) {
        removeUserFromDocument(documentId, socket.id);
        socket.to(documentId).emit('user-left', { socketId: socket.id });
        delete userSocketMap[socket.id];
      }
      console.log('user disconnected');
    });
  });
};

export default registerDocumentSocket;