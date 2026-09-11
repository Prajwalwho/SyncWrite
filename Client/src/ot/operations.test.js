import { describe, it, expect } from 'vitest';
import { applyOp, transformAgainst, transformSequence } from './operations.js';

describe('applyOp', () => {
  it('inserts text at the correct position', () => {
    expect(applyOp('hello world', { type: 'insert', pos: 5, text: ',' })).toBe('hello, world');
  });

  it('deletes text at the correct position', () => {
    expect(applyOp('hello world', { type: 'delete', pos: 5, length: 6 })).toBe('hello');
  });
});

describe('transformAgainst — insert vs insert', () => {
  it('shifts a later insert forward when another insert lands before it', () => {
    const op = { type: 'insert', pos: 5, text: 'X', clientId: 'b' };
    const other = { type: 'insert', pos: 2, text: 'YY', clientId: 'a' };
    expect(transformAgainst(op, other)).toEqual({ ...op, pos: 7 });
  });

  it('does not shift an earlier insert', () => {
    const op = { type: 'insert', pos: 2, text: 'X', clientId: 'a' };
    const other = { type: 'insert', pos: 5, text: 'YY', clientId: 'b' };
    expect(transformAgainst(op, other)).toEqual(op);
  });

  it('breaks ties at the same position using clientId ordering', () => {
    const opA = { type: 'insert', pos: 3, text: 'A', clientId: 'a' };
    const opB = { type: 'insert', pos: 3, text: 'B', clientId: 'b' };
    // 'a' < 'b', so A stays, B shifts forward by A's length
    expect(transformAgainst(opA, opB)).toEqual(opA);
    expect(transformAgainst(opB, opA)).toEqual({ ...opB, pos: 4 });
  });
});

describe('transformAgainst — delete vs delete', () => {
  it('shortens an overlapping later delete', () => {
    const op = { type: 'delete', pos: 3, length: 5, clientId: 'a' };
    const other = { type: 'delete', pos: 5, length: 5, clientId: 'b' };
    expect(transformAgainst(op, other)).toEqual({ ...op, length: 2 });
  });

  it('shifts a delete positioned after another delete', () => {
    const op = { type: 'delete', pos: 10, length: 2, clientId: 'a' };
    const other = { type: 'delete', pos: 2, length: 3, clientId: 'b' };
    expect(transformAgainst(op, other)).toEqual({ ...op, pos: 7 });
  });

  it('cancels out an identical concurrent delete', () => {
    const op = { type: 'delete', pos: 4, length: 3, clientId: 'a' };
    const other = { type: 'delete', pos: 4, length: 3, clientId: 'b' };
    expect(transformAgainst(op, other)).toBeNull();
  });
});

describe('transformAgainst — insert vs delete / delete vs insert', () => {
  it('keeps an insert in place if it lands at or before a concurrent delete', () => {
    const op = { type: 'insert', pos: 2, text: 'X', clientId: 'a' };
    const other = { type: 'delete', pos: 5, length: 3, clientId: 'b' };
    expect(transformAgainst(op, other)).toEqual(op);
  });

  it('shifts an insert back if it lands after a concurrent delete', () => {
    const op = { type: 'insert', pos: 10, text: 'X', clientId: 'a' };
    const other = { type: 'delete', pos: 2, length: 4, clientId: 'b' };
    expect(transformAgainst(op, other)).toEqual({ ...op, pos: 6 });
  });

  it('shifts a delete forward if a concurrent insert lands before it', () => {
    const op = { type: 'delete', pos: 5, length: 2, clientId: 'a' };
    const other = { type: 'insert', pos: 2, text: 'YY', clientId: 'b' };
    expect(transformAgainst(op, other)).toEqual({ ...op, pos: 7 });
  });
});

describe('convergence — the property that actually matters', () => {
  it('produces the same final document regardless of operation order', () => {
    const base = 'hello world';
    const opA = { type: 'insert', pos: 5, text: ',', clientId: 'a' };
    const opB = { type: 'insert', pos: 11, text: '!', clientId: 'b' };

    // Client A applies its own op locally, then applies B transformed against A
    const clientAView = applyOp(applyOp(base, opA), transformAgainst(opB, opA));

    // Client B applies its own op locally, then applies A transformed against B
    const clientBView = applyOp(applyOp(base, opB), transformAgainst(opA, opB));

    expect(clientAView).toBe(clientBView);
  });

  it('converges correctly with an insert and a delete happening concurrently', () => {
    const base = 'the quick fox';
    const opInsert = { type: 'insert', pos: 4, text: 'very ', clientId: 'a' };
    const opDelete = { type: 'delete', pos: 10, length: 4, clientId: 'b' }; // deletes "fox"

    const clientAView = applyOp(applyOp(base, opInsert), transformAgainst(opDelete, opInsert));
    const clientBView = applyOp(applyOp(base, opDelete), transformAgainst(opInsert, opDelete));

    expect(clientAView).toBe(clientBView);
  });
});