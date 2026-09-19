import { useState, useEffect, useCallback } from 'react';

const useCursors = (documentId, socket, textareaRef) => {
    const [cursors, setCursors] = useState({}); // socketId -> position (number)

    useEffect(() => {
        if (!socket) return;
        const handleCursorUpdate = ({ socketId, pos }) => {
            setCursors(prev => ({ ...prev, [socketId]: pos }));
        };
        socket.on('cursor-update', handleCursorUpdate);
        return () => socket.off('cursor-update', handleCursorUpdate);
    }, [socket]);

    const emitCursor = useCallback(() => {
        const textarea = textareaRef.current;
        if (!textarea || !socket) return;
        socket.emit('cursor-update', { documentId, pos: textarea.selectionStart });
    }, [documentId, socket, textareaRef]);

    return { cursors, emitCursor };
};

export default useCursors;