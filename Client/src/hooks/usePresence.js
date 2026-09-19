import { useState, useEffect } from 'react';

const usePresence = (documentId, socket) => {
    const [users, setUsers] = useState([]);
    const [selfId, setSelfId] = useState(null);

    useEffect(() => {
        if (!socket) return;

        const handlePresenceUpdate = (list) => setUsers(list);
        const handlePresenceSelf = ({ socketId }) => setSelfId(socketId);

        socket.on('presence-update', handlePresenceUpdate);
        socket.on('presence-self', handlePresenceSelf);

        return () => {
            socket.off('presence-update', handlePresenceUpdate);
            socket.off('presence-self', handlePresenceSelf);
        };
    }, [socket]);

    const otherUsers = users.filter(u => u.socketId !== selfId);
    return { otherUsers };
};

export default usePresence;