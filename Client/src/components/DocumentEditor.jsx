import React, { useState, useEffect, useRef } from 'react';
import { getDocument, updateDocument } from '../api/documentService';
import { socket } from '../api/socketService';
import useOperationalDocument from '../hooks/useOperationalDocument';
import usePresence from '../hooks/usePresence';
import useCursors from '../hooks/useCursors';
import { getCaretCoordinates } from '../utils/caretCoordinates';

const DocumentEditor = ({ documentId, onBack }) => {
    const [initialData, setInitialData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (documentId) {
            socket.connect();
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

    if (loading) return <div>Loading...</div>;

    return <Editor initialData={initialData} onBack={onBack} documentId={documentId} />;
};

const Editor = ({ initialData, onBack, documentId }) => {
    const { content, title, handleContentChange, connected, error } = useOperationalDocument(
        documentId, initialData.title, initialData.content, initialData.revision, socket
    );

    const { otherUsers } = usePresence(documentId, socket);
    const textareaRef = useRef(null);
    const { cursors, emitCursor } = useCursors(documentId, socket, textareaRef);
    const [markers, setMarkers] = useState([]);

    // Recompute pixel positions whenever content or received cursor positions change
    useEffect(() => {
        const textarea = textareaRef.current;
        if (!textarea) return;

        const next = otherUsers
            .filter(u => cursors[u.socketId] !== undefined)
            .map(u => {
                const { top, left } = getCaretCoordinates(textarea, cursors[u.socketId]);
                return { ...u, top, left };
            });
        setMarkers(next);
    }, [content, cursors, otherUsers]);

    const handleTitleChange = (newTitle) => {
        updateDocument(documentId, { title: newTitle });
    };

    return (
        <div className="document-editor">
            <div className="presence-bar" style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                {otherUsers.map(u => (
                    <span key={u.socketId} style={{
                        backgroundColor: u.color, color: '#fff', padding: '2px 8px',
                        borderRadius: '12px', fontSize: '12px'
                    }}>
                        {u.name}
                    </span>
                ))}
            </div>

            <input
                type="text"
                defaultValue={title}
                onChange={(e) => handleTitleChange(e.target.value)}
                placeholder="Document Title"
                className="title-input"
            />

            {/* Wrapper needed so the cursor overlay can be positioned absolutely on top of the textarea */}
            <div style={{ position: 'relative', flex: 1, display: 'flex' }}>
                <textarea
                    ref={textareaRef}
                    value={content}
                    onChange={(e) => handleContentChange(e.target.value)}
                    onKeyUp={emitCursor}
                    onClick={emitCursor}
                    onSelect={emitCursor}
                    placeholder="Document Content"
                    className="content-textarea"
                    style={{ width: '100%', flex: 1 }}
                />
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, pointerEvents: 'none', overflow: 'hidden' }}>
                    {markers.map(m => (
                        <div
                            key={m.socketId}
                            style={{
                                position: 'absolute',
                                top: m.top,
                                left: m.left,
                                width: '2px',
                                height: '1.2em',
                                backgroundColor: m.color,
                            }}
                        >
                            <span style={{
                                position: 'absolute',
                                top: '-1.4em',
                                left: 0,
                                backgroundColor: m.color,
                                color: '#fff',
                                fontSize: '10px',
                                padding: '1px 4px',
                                borderRadius: '4px',
                                whiteSpace: 'nowrap'
                            }}>
                                {m.name}
                            </span>
                        </div>
                    ))}
                </div>
            </div>

            <div className="editor-actions">
                <button className="btn btn-secondary" onClick={onBack}>Back</button>
                <span>{connected ? 'Connected' : 'Auto-Save On'}</span>
                {error && <span style={{ color: 'red' }}>{error}</span>}
            </div>
        </div>
    );
};

export default DocumentEditor;