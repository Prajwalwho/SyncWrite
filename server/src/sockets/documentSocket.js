import mongoose from 'mongoose';
import { loadDocument, appendOperation } from '../utils/documentStore.js';
import { applyOp, transformSequence, validateOp } from '../ot/operations.js';
import Document from '../models/Document.js';

const registerDocumentSocket = (io) => {
const userSocketMap = {};

const documentLocks = new Map(); // documentId -> Promise chain
const liveDocuments = new Map(); // NEW: documentId -> { content, revision, opsLog, saveTimer }

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

  io.on('connection', (socket) => {
    console.log('a user connected');

    socket.on('join-document', async ({ documentId }) => {
      if (!mongoose.Types.ObjectId.isValid(documentId)) {
        socket.emit('error', { message: 'Invalid document ID' });
        return;
      }

      userSocketMap[socket.id] = documentId;
      socket.join(documentId);

      const doc = await Document.findById(documentId);
      if (!doc) {
        socket.emit('error', { message: 'Document not found' });
        return;
      }

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
          // NEW: use the in-memory copy if we have one, only hit Mongo the first time
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

          // NEW: debounce the actual Mongo write instead of writing on every keystroke
          clearTimeout(live.saveTimer);
          live.saveTimer = setTimeout(() => {
            appendOperation(documentId, opToLog, live.revision).catch(console.error);
            Document.findByIdAndUpdate(documentId, { content: live.content }).catch(console.error);
          }, 1500);
      });
    });

    socket.on('request-resync', async ({ documentId }) => {
        // NEW: prefer the live in-memory copy so a resync doesn't hand back stale Mongo content
        const live = liveDocuments.get(documentId);
        if (live) {
            socket.emit('document-state', { title: undefined, content: live.content, revision: live.revision, ops: [] });
            return;
        }
        const doc = await Document.findById(documentId);
        if (doc) {
            socket.emit('document-state', { title: doc.title, content: doc.content, revision: doc.revision, ops: [] });
        }
    });

    socket.on('leave-document', ({ documentId }) => {
      socket.leave(documentId);
      delete userSocketMap[socket.id];
      socket.to(documentId).emit('user-left', { socketId: socket.id });
    });

    socket.on('disconnect', () => {
      const documentId = userSocketMap[socket.id];
      if (documentId) {
        socket.to(documentId).emit('user-left', { socketId: socket.id });
        delete userSocketMap[socket.id];
      }
      console.log('user disconnected');
    });
  });
};

export default registerDocumentSocket;