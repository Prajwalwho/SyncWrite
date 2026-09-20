import React, { useState } from 'react';
import { shareDocument, removeCollaborator } from '../api/documentService';

const ShareModal = ({ documentId, isPublic: initialIsPublic, collaborators: initialCollaborators, onClose }) => {
    const [isPublic, setIsPublic] = useState(initialIsPublic);
    const [collaborators, setCollaborators] = useState(initialCollaborators || []);
    const [email, setEmail] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleTogglePublic = async () => {
        setLoading(true);
        setError('');
        try {
            const updated = await shareDocument(documentId, { isPublic: !isPublic });
            setIsPublic(updated.isPublic);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleAddCollaborator = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const updated = await shareDocument(documentId, { collaboratorEmail: email });
            setCollaborators(updated.collaborators);
            setEmail('');
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleRemoveCollaborator = async (collaboratorId) => {
        setLoading(true);
        setError('');
        try {
            const updated = await removeCollaborator(documentId, collaboratorId);
            setCollaborators(updated.collaborators);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const shareLink = `${window.location.origin}/document/${documentId}`;

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.4)', display: 'flex',
            alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
            <div style={{ background: '#fff', padding: '24px', borderRadius: '8px', width: '400px' }}>
                <h3>Share this document</h3>

                <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <input type="checkbox" checked={isPublic} onChange={handleTogglePublic} disabled={loading} />
                        Anyone with the link can edit
                    </label>
                    {isPublic && (
                        <input
                            type="text"
                            readOnly
                            value={shareLink}
                            onClick={(e) => e.target.select()}
                            style={{ width: '100%', marginTop: '8px', padding: '6px' }}
                        />
                    )}
                </div>

                <hr />

                <div style={{ marginBottom: '16px' }}>
                    <p style={{ marginBottom: '8px' }}>Add a collaborator by email:</p>
                    <form onSubmit={handleAddCollaborator} style={{ display: 'flex', gap: '8px' }}>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="someone@example.com"
                            required
                            style={{ flex: 1, padding: '6px' }}
                        />
                        <button type="submit" className="btn" disabled={loading}>Add</button>
                    </form>
                </div>

                {collaborators.length > 0 && (
                    <div style={{ marginBottom: '16px' }}>
                        <p>Collaborators:</p>
                        <ul style={{ listStyle: 'none', padding: 0 }}>
                            {collaborators.map(c => (
                                <li key={c._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0' }}>
                                    <span>{c.name} ({c.email})</span>
                                    <button
                                        onClick={() => handleRemoveCollaborator(c._id)}
                                        disabled={loading}
                                        style={{ background: 'none', border: 'none', color: 'red', cursor: 'pointer' }}
                                    >
                                        Remove
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                {error && <div style={{ color: 'red', marginBottom: '12px' }}>{error}</div>}

                <button className="btn btn-secondary" onClick={onClose}>Close</button>
            </div>
        </div>
    );
};

export default ShareModal;