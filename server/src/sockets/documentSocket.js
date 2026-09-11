import mongoose from 'mongoose';
import { loadDocument, appendOperation } from '../utils/documentStore.js';
import { applyOp, transformSequence, validateOp } from '../ot/operations.js';
import Document from '../models/Document.js';

const registerDocumentSocket = (io) => {
const userSocketMap = {};

const documentLocks = new Map(); // documentId -> Promise chain

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
          const docData = await loadDocument(documentId);
          if (!docData) {
            socket.emit('operation-error', { message: 'Document not found' });
            return;
          }

          let { doc, content, revision } = docData;

          const concurrentOps = doc.opsLog.filter(o => o.appliedRevision > baseRevision);
          const transformedOp = transformSequence(op, concurrentOps);

          content = applyOp(content, transformedOp);
          const newRevision = revision + 1;

          const opToLog = { ...transformedOp, clientId, baseRevision, appliedRevision: newRevision, createdAt: new Date() };
          await appendOperation(documentId, opToLog, newRevision);
          await Document.findByIdAndUpdate(documentId, { content });

          socket.emit('operation-ack', { appliedRevision: newRevision, op: transformedOp });
          socket.to(documentId).emit('document-operation', { op: transformedOp, appliedRevision: newRevision, clientId });
      });
    });

    socket.on('request-resync', async ({ documentId }) => {
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
