import { useState, useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { applyOp, transformSequence, transformAgainst } from '../ot/operations';

const useOperationalDocument = (documentId, initialTitle, initialContent, initialRevision, socket, onLocalOperation) => { // CHANGED: added onLocalOperation param
    const [content, setContent] = useState(initialContent);
    const [title, setTitle] = useState(initialTitle);
    const [revision, setRevision] = useState(initialRevision);
    const [connected, setConnected] = useState(false);
    const [error, setError] = useState(null);
    const clientId = useRef(uuidv4());

    const contentRef = useRef(initialContent);
    const revisionRef = useRef(initialRevision);
    const pendingOpsRef = useRef([]);

    useEffect(() => {
        if (!socket) return;

        const handleConnect = () => {
            setConnected(true);
            socket.emit('join-document', { documentId });
        };
        const handleDisconnect = () => setConnected(false);

        const handleDocumentState = (doc) => {
            let newContent = doc.content;
            for (const pendingOp of pendingOpsRef.current) {
                newContent = applyOp(newContent, pendingOp);
            }
            contentRef.current = newContent;
            revisionRef.current = doc.revision;
            setContent(newContent);
            setTitle(doc.title);
            setRevision(doc.revision);

            if (pendingOpsRef.current.length > 0) {
                const resubmitOps = pendingOpsRef.current.map(op => ({ ...op, baseRevision: doc.revision }));
                pendingOpsRef.current = resubmitOps;
                resubmitOps.forEach(op => socket.emit('submit-operation', { documentId, op }));
            } else {
                pendingOpsRef.current = [];
            }
        };

        const handleOperationAck = ({ appliedRevision }) => {
            pendingOpsRef.current = pendingOpsRef.current.slice(1);
            revisionRef.current = appliedRevision;
            setRevision(appliedRevision);
        };

        const handleDocumentOperation = ({ op, appliedRevision, clientId: opClientId }) => {
            if (opClientId === clientId.current) return;

            let transformedIncomingOp = op;
            const newPendingOps = [];
            for (const pendingOp of pendingOpsRef.current) {
                transformedIncomingOp = transformAgainst(transformedIncomingOp, pendingOp);
                newPendingOps.push(transformAgainst(pendingOp, op));
            }

            contentRef.current = applyOp(contentRef.current, transformedIncomingOp);
            pendingOpsRef.current = newPendingOps;
            revisionRef.current = appliedRevision;

            setContent(contentRef.current);
            setRevision(appliedRevision);
        };

        const handleOperationError = (err) => {
            setError(err.message);
            socket.emit('request-resync', { documentId });
        };

        socket.on('connect', handleConnect);
        socket.on('disconnect', handleDisconnect);
        socket.on('document-state', handleDocumentState);
        socket.on('operation-ack', handleOperationAck);
        socket.on('document-operation', handleDocumentOperation);
        socket.on('operation-error', handleOperationError);

        if (socket.connected) {
            handleConnect();
        }

        return () => {
            socket.off('connect', handleConnect);
            socket.off('disconnect', handleDisconnect);
            socket.off('document-state', handleDocumentState);
            socket.off('operation-ack', handleOperationAck);
            socket.off('document-operation', handleDocumentOperation);
            socket.off('operation-error', handleOperationError);
        };
    }, [socket, documentId]);

    const handleContentChange = (newContent) => {
        const diff = (oldStr, newStr) => {
            let start = 0;
            while (start < oldStr.length && start < newStr.length && oldStr[start] === newStr[start]) start++;
            let endOld = oldStr.length;
            let endNew = newStr.length;
            while (endOld > start && endNew > start && oldStr[endOld - 1] === newStr[endNew - 1]) {
                endOld--; endNew--;
            }
            if (endOld > start) return { type: 'delete', pos: start, length: endOld - start };
            if (endNew > start) return { type: 'insert', pos: start, text: newStr.slice(start, endNew) };
            return null;
        };

        const op = diff(contentRef.current, newContent);
        if (op) {
            const opWithRevision = { ...op, baseRevision: revisionRef.current, clientId: clientId.current };
            pendingOpsRef.current = [...pendingOpsRef.current, opWithRevision];
            contentRef.current = applyOp(contentRef.current, op);
            setContent(contentRef.current);
            socket.emit('submit-operation', { documentId, op: opWithRevision });
            if (onLocalOperation) onLocalOperation(op); // NEW: let cursor tracking know about our own edit
        }
    };

    return { content, title, handleContentChange, connected, error };
};

export default useOperationalDocument;