import React, { useState, useEffect, useRef } from 'react';
import { getDocument, updateDocument } from '../api/documentService';
import { socket } from '../api/socketService';
import useOperationalDocument from '../hooks/useOperationalDocument';
import usePresence from '../hooks/usePresence';
import useCursors from '../hooks/useCursors';
import { getCaretCoordinates } from '../utils/caretCoordinates';
import ShareModal from './ShareModal';

const DocumentEditor = ({ documentId, onBack }) => {
    const [initialData, setInitialData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState(null);

    useEffect(() => {
        if (documentId) {
            socket.connect();
            getDocument(documentId)
                .then(doc => {
                    setInitialData(doc);
                    setLoading(false);
                })
                .catch(err => {
                    setLoadError(err.message);
                    setLoading(false);
                });

            return () => {
                socket.emit('leave-document', { documentId });
                socket.disconnect();
            };
        }
    }, [documentId]);

    if (loading) return <div>Loading...</div>;

    if (loadError) {
        return (
            <div style={{ textAlign: 'center', marginTop: '80px' }}>
                <h2>Can't open this document</h2>
                <p style={{ color: '#666' }}>{loadError}</p>
                <button className="btn" onClick={onBack}>Back to documents</button>
            </div>
        );
    }

    return <Editor initialData={initialData} onBack={onBack} documentId={documentId} />;
};

const Editor = ({ initialData, onBack, documentId }) => {
    // CHANGED: usePresence and useCursors now come BEFORE useOperationalDocument,
    // since useOperationalDocument needs shiftCursorsForLocalOp as an argument
    const { otherUsers } = usePresence(documentId, socket);
    const textareaRef = useRef(null);
    const { cursors, emitCursor, shiftCursorsForLocalOp } = useCursors(documentId, socket, textareaRef);

    const { content, title, handleContentChange, connected, error } = useOperationalDocument(
        documentId, initialData.title, initialData.content, initialData.revision, socket, shiftCursorsForLocalOp
    );

    const [markers, setMarkers] = useState([]);
    const [showShareModal, setShowShareModal] = useState(false);

        useEffect(() => {
        const textarea = textareaRef.current;
        if (!textarea) return;

        const timeoutId = setTimeout(() => {
            const next = otherUsers
                .filter(u => cursors[u.socketId] !== undefined)
                .map(u => {
                    const { top, left } = getCaretCoordinates(textarea, cursors[u.socketId]);
                    return { ...u, top, left };
                });
            setMarkers(next);
        }, 30); // small delay smooths out rapid back-to-back updates

        return () => clearTimeout(timeoutId);
    }, [content, cursors, otherUsers]);

    const handleTitleChange = (newTitle) => {
        updateDocument(documentId, { title: newTitle });
    };

    return (
        <div className="document-editor">
            <div className="presence-bar" style={{ display: 'flex', gap: '8px', marginBottom: '8px', alignItems: 'center' }}>
                {otherUsers.map(u => (
                    <span key={u.socketId} style={{
                        backgroundColor: u.color, color: '#fff', padding: '2px 8px',
                        borderRadius: '12px', fontSize: '12px'
                    }}>
                        {u.name}
                    </span>
                ))}
                <button className="btn" onClick={() => setShowShareModal(true)} style={{ marginLeft: 'auto' }}>
                    Share
                </button>
            </div>

            <input
                type="text"
                defaultValue={title}
                onChange={(e) => handleTitleChange(e.target.value)}
                placeholder="Document Title"
                className="title-input"
            />

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

            {showShareModal && (
                <ShareModal
                    documentId={documentId}
                    isPublic={initialData.isPublic}
                    collaborators={initialData.collaborators}
                    onClose={() => setShowShareModal(false)}
                />
            )}
        </div>
    );
};

export default DocumentEditor;