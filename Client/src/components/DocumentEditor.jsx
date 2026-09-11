import React, { useState, useEffect } from 'react';
import { getDocument, updateDocument } from '../api/documentService';
import { socket } from '../api/socketService';
import useOperationalDocument from '../hooks/useOperationalDocument';

const DocumentEditor = ({ documentId, onBack }) => {
    const [initialData, setInitialData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (documentId) {
            socket.connect();
            socket.emit('join-document', { documentId });

            getDocument(documentId).then(doc => {
                setInitialData(doc);
                setLoading(false);
            });

            return () => {
                socket.emit('leave-document', { documentId });
                socket.disconnect();
            };
        }
    }, [documentId]);

    if (loading) {
        return <div>Loading...</div>;
    }

    return <Editor initialData={initialData} onBack={onBack} documentId={documentId} />;
};

const Editor = ({ initialData, onBack, documentId }) => {
    const { content, title, handleContentChange, connected, error } = useOperationalDocument(
        documentId,
        initialData.title,
        initialData.content,
        initialData.revision,
        socket
    );

    const handleTitleChange = (newTitle) => {
        // For now, title changes are handled via REST
        updateDocument(documentId, { title: newTitle });
    };

    return (
        <div className="document-editor">
            <input
                type="text"
                defaultValue={title}
                onChange={(e) => handleTitleChange(e.target.value)}
                placeholder="Document Title"
                className="title-input"
            />
            <textarea
                value={content}
                onChange={(e) => handleContentChange(e.target.value)}
                placeholder="Document Content"
                className="content-textarea"
            />
            <div className="editor-actions">
                <button className="btn btn-secondary" onClick={onBack}>Back</button>
                <span>{connected ? 'Connected' : 'Auto-Save On'}</span>
                {error && <span style={{ color: 'red' }}>{error}</span>}
            </div>
        </div>
    );
};

export default DocumentEditor;