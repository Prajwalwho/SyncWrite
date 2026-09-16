import { useState, useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { applyOp, transformSequence, transformAgainst } from '../ot/operations'; // FIXED: added transformAgainst import

const useOperationalDocument = (documentId, initialTitle, initialContent, initialRevision, socket) => {
    const [content, setContent] = useState(initialContent);
    const [title, setTitle] = useState(initialTitle);
    const [revision, setRevision] = useState(initialRevision);
    const [pendingOps, setPendingOps] = useState([]);
    const [connected, setConnected] = useState(false);
    const [error, setError] = useState(null);
    const clientId = useRef(uuidv4());

    useEffect(() => {
        if (socket) {
            socket.on('connect', () => {
                setConnected(true);
                // NEW: (re)join the document room every time we connect —
                // this covers both the first connection AND any reconnect after a drop
                socket.emit('join-document', { documentId });
            });

            socket.on('disconnect', () => setConnected(false));

            socket.on('document-state', (doc) => {
                // NEW: reapply any unacknowledged local edits on top of the fresh server content,
                // instead of just discarding them
                let newContent = doc.content;
                for (const pendingOp of pendingOps) {
                    newContent = applyOp(newContent, pendingOp);
                }
                setContent(newContent);
                setTitle(doc.title);
                setRevision(doc.revision);

                // NEW: resubmit unacknowledged ops against the new base revision
                if (pendingOps.length > 0) {
                    const resubmitOps = pendingOps.map(op => ({ ...op, baseRevision: doc.revision }));
                    setPendingOps(resubmitOps);
                    resubmitOps.forEach(op => {
                        socket.emit('submit-operation', { documentId, op });
                    });
                } else {
                    setPendingOps([]);
                }
            });

            socket.on('operation-ack', ({ appliedRevision }) => {
                setPendingOps(prev => prev.slice(1));
                setRevision(appliedRevision);
            });

            socket.on('document-operation', ({ op, appliedRevision, clientId: opClientId }) => {
                if (opClientId === clientId.current) return;

                let transformedIncomingOp = op;
                const newPendingOps = [];
                for (const pendingOp of pendingOps) {
                    transformedIncomingOp = transformAgainst(transformedIncomingOp, pendingOp);
                    newPendingOps.push(transformAgainst(pendingOp, op));
                }

                setContent(prev => applyOp(prev, transformedIncomingOp));
                setPendingOps(newPendingOps);
                setRevision(appliedRevision);
            });

            socket.on('operation-error', (err) => {
                setError(err.message);
                socket.emit('request-resync', { documentId });
            });

            return () => {
                socket.off('connect');
                socket.off('disconnect');
                socket.off('document-state');
                socket.off('operation-ack');
                socket.off('document-operation');
                socket.off('operation-error');
            };
        }
    }, [socket, documentId, content, pendingOps]);

    const handleContentChange = (newContent) => {
        const diff = (oldStr, newStr) => {
            let start = 0;
            while (start < oldStr.length && start < newStr.length && oldStr[start] === newStr[start]) {
                start++;
            }
            let endOld = oldStr.length;
            let endNew = newStr.length;
            while (endOld > start && endNew > start && oldStr[endOld - 1] === newStr[endNew - 1]) {
                endOld--;
                endNew--;
            }
            if (endOld > start) {
                return { type: 'delete', pos: start, length: endOld - start };
            }
            if (endNew > start) {
                return { type: 'insert', pos: start, text: newStr.slice(start, endNew) };
            }
            return null;
        };

        const op = diff(content, newContent);
        if (op) {
            const opWithRevision = { ...op, baseRevision: revision, clientId: clientId.current };
            setPendingOps(prev => [...prev, opWithRevision]);
            setContent(applyOp(content, op));
            socket.emit('submit-operation', { documentId, op: opWithRevision });
        }
    };

    return { content, title, handleContentChange, connected, error };
};

export default useOperationalDocument;