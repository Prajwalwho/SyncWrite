export const applyOp = (content, op) => {
    if (op.type === 'insert') {
        return content.slice(0, op.pos) + op.text + content.slice(op.pos);
    } else if (op.type === 'delete') {
        return content.slice(0, op.pos) + content.slice(op.pos + op.length);
    }
    return content;
};

export const transformAgainst = (op, otherOp) => {
    if (op.type === 'insert' && otherOp.type === 'insert') {
        if (op.pos < otherOp.pos || (op.pos === otherOp.pos && op.clientId < otherOp.clientId)) {
            return { ...op };
        } else {
            return { ...op, pos: op.pos + otherOp.text.length };
        }
    } else if (op.type === 'delete' && otherOp.type === 'delete') {
        if (op.pos < otherOp.pos) {
            return { ...op, length: Math.min(op.length, otherOp.pos - op.pos) };
        } else if (op.pos > otherOp.pos) {
            return { ...op, pos: op.pos - otherOp.length };
        } else {
            return null; // Concurrent delete
        }
    } else if (op.type === 'insert' && otherOp.type === 'delete') {
        if (op.pos <= otherOp.pos) {
            return { ...op };
        } else {
            return { ...op, pos: op.pos - otherOp.length };
        }
    } else if (op.type === 'delete' && otherOp.type === 'insert') {
        if (op.pos >= otherOp.pos) {
            return { ...op, pos: op.pos + otherOp.text.length };
        } else {
            return { ...op };
        }
    }
    return op;
};

export const transformSequence = (op, ops) => {
    return ops.reduce(transformAgainst, op);
};