import { useState, useEffect, useCallback } from 'react';

// Shifts a stored cursor position to account for an edit applied elsewhere in the document
const shiftPosition = (pos, op) => {
    if (op.type === 'insert') {
        return pos >= op.pos ? pos + op.text.length : pos;
    }
    if (op.type === 'delete') {
        if (pos >= op.pos + op.length) return pos - op.length;
        if (pos > op.pos) return op.pos;
        return pos;
    }
    return pos;
};

const useCursors = (documentId, socket, textareaRef) => {
    const [cursors, setCursors] = useState({});

    useEffect(() => {
        if (!socket) return;

        const handleCursorUpdate = ({ socketId, pos }) => {
            setCursors(prev => ({ ...prev, [socketId]: pos }));
        };

        // NEW: whenever someone else's edit arrives, shift every stored cursor
        // position so markers stay anchored to the correct character
        const handleDocumentOperation = ({ op }) => {
            setCursors(prev => {
                const updated = {};
                for (const [id, pos] of Object.entries(prev)) {
                    updated[id] = shiftPosition(pos, op);
                }
                return updated;
            });
        };

        socket.on('cursor-update', handleCursorUpdate);
        socket.on('document-operation', handleDocumentOperation);

        return () => {
            socket.off('cursor-update', handleCursorUpdate);
            socket.off('document-operation', handleDocumentOperation);
        };
    }, [socket]);

    const emitCursor = useCallback(() => {
        const textarea = textareaRef.current;
        if (!textarea || !socket) return;
        socket.emit('cursor-update', { documentId, pos: textarea.selectionStart });
    }, [documentId, socket, textareaRef]);

    // NEW: called when WE submit a local edit — our own op never broadcasts back to us,
    // so we have to shift stored cursors ourselves the moment we type
    const shiftCursorsForLocalOp = useCallback((op) => {
        setCursors(prev => {
            const updated = {};
            for (const [id, pos] of Object.entries(prev)) {
                updated[id] = shiftPosition(pos, op);
            }
            return updated;
        });
    }, []);

    return { cursors, emitCursor, shiftCursorsForLocalOp };
};

export default useCursors;