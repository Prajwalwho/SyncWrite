import Document from '../models/Document.js';

export const loadDocument = async (documentId) => {
    const doc = await Document.findById(documentId);
    if (!doc) {
        return null;
    }

    if (doc.revision === undefined || doc.revision === null) {
        doc.revision = 0;
    }

    return {
        doc,
        content: doc.content,
        revision: doc.revision,
    };
};

export const appendOperation = async (documentId, operation, newRevision) => {
    await Document.findByIdAndUpdate(documentId, {
        $push: {
            opsLog: operation,
        },
        $set: {
            revision: newRevision,
        },
    });
};
