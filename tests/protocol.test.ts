import { describe, expect, it } from 'vitest';
import {
  deserialize,
  serialize,
  type ClientMessage,
  type ProtocolMessage,
  type ServerMessage,
  type Snapshot,
} from '../shared/protocol';

const snapshot: Snapshot = {
  roomId: 'room-1',
  difficulty: 'medium',
  cells: Array.from({ length: 81 }, () => ({
    value: 0,
    given: false,
    owner: null,
    wrong: false,
  })),
  players: [{ id: 'p1', score: 0 }],
  startedAt: 1723000000000,
  status: 'playing',
  you: 'p1',
  yourNotes: { 12: [1, 2, 3], 40: [7] },
};

const clientMessages: ClientMessage[] = [
  { type: 'join', payload: { difficulty: 'hard' } },
  { type: 'op', payload: { op: { kind: 'fill', index: 40, value: 7 } } },
  { type: 'leave', payload: {} },
];

const serverMessages: ServerMessage[] = [
  { type: 'joined', payload: snapshot },
  {
    type: 'opApplied',
    payload: {
      playerId: 'p1',
      op: { kind: 'fill', index: 40, value: 7 },
      result: 'correct',
      cellIndex: 40,
      cell: { value: 7, given: false, owner: 'p1', wrong: false },
      completedUnits: [{ type: 'row', index: 4 }],
      scores: { p1: 10, p2: 5 },
    },
  },
  {
    type: 'opApplied',
    payload: {
      playerId: 'p1',
      op: { kind: 'note', index: 40, value: 7 },
      result: 'note',
      scores: { p1: 10 },
      notes: [7, 8, 9],
      clearedNotes: [39, 41],
    },
  },
  {
    type: 'opApplied',
    payload: {
      playerId: 'p2',
      op: { kind: 'fill', index: 41, value: 3 },
      result: 'wrong',
      cellIndex: 41,
      cell: { value: 3, given: false, owner: 'p2', wrong: true },
      scores: { p1: 10, p2: 5 },
    },
  },
  { type: 'opRejected', payload: { playerId: 'p1', reason: 'invalid-op' } },
  { type: 'playerJoined', payload: { player: { id: 'p2', score: 0 } } },
  { type: 'playerLeft', payload: { playerId: 'p2' } },
  {
    type: 'gameOver',
    payload: { winnerId: 'p1', reason: 'completed', scores: { p1: 120, p2: 80 }, elapsedSeconds: 600 },
  },
  {
    type: 'gameOver',
    payload: { winnerId: null, reason: 'completed', scores: { p1: 100, p2: 100 }, elapsedSeconds: 610 },
  },
  {
    type: 'gameOver',
    payload: { winnerId: 'p2', reason: 'forfeit', scores: { p1: 40, p2: 90 }, elapsedSeconds: 300 },
  },
  { type: 'error', payload: { message: 'bad message' } },
];

describe('protocol serialize/deserialize (example-based)', () => {
  it.each([...clientMessages, ...serverMessages])('round-trips %s', (msg: ProtocolMessage) => {
    expect(deserialize(serialize(msg))).toEqual(msg);
  });

  it('serialize injects version 2 into the envelope', () => {
    const raw = JSON.parse(serialize(clientMessages[0]));
    expect(raw.version).toBe(2);
    expect(raw.type).toBe('join');
    expect(raw.payload).toEqual({ difficulty: 'hard' });
  });

  it.each([
    ['not json', 'not json at all'],
    ['empty string', ''],
    ['json array', '[1,2,3]'],
    ['json number', '42'],
    ['missing version', JSON.stringify({ type: 'join', payload: { difficulty: 'easy' } })],
    ['v1 frame (version 1)', JSON.stringify({ version: 1, type: 'join', payload: { difficulty: 'easy' } })],
    ['version 3', JSON.stringify({ version: 3, type: 'join', payload: { difficulty: 'easy' } })],
    ['string version', JSON.stringify({ version: '2', type: 'join', payload: { difficulty: 'easy' } })],
    ['unknown type', JSON.stringify({ version: 2, type: 'fly', payload: {} })],
    ['v1 playerLost type', JSON.stringify({ version: 2, type: 'playerLost', payload: { playerId: 'p2' } })],
    ['v1 gameWon type', JSON.stringify({ version: 2, type: 'gameWon', payload: { elapsedSeconds: 10 } })],
    ['missing payload', JSON.stringify({ version: 2, type: 'join' })],
    ['null payload', JSON.stringify({ version: 2, type: 'join', payload: null })],
  ])('rejects %s', (_label, raw) => {
    expect(deserialize(raw)).toBeNull();
  });

  it.each([
    ['bad difficulty', { type: 'join', payload: { difficulty: 'extreme' } }],
    ['fill index out of range', { type: 'op', payload: { op: { kind: 'fill', index: 81, value: 5 } } }],
    ['fill value out of range', { type: 'op', payload: { op: { kind: 'fill', index: 5, value: 0 } } }],
    ['erase without index', { type: 'op', payload: { op: { kind: 'erase' } } }],
    ['unknown op kind', { type: 'op', payload: { op: { kind: 'explode' } } }],
    ['opRejected empty reason', { type: 'opRejected', payload: { playerId: 'p1', reason: '' } }],
    ['opApplied invalid result', { type: 'opApplied', payload: { playerId: 'p1', op: { kind: 'fill', index: 0, value: 1 }, result: 'maybe', cellIndex: 0, cell: { value: 1, given: false, owner: 'p1', wrong: false }, completedUnits: [], scores: { p1: 0 } } }],
    ['opApplied note with cellIndex', { type: 'opApplied', payload: { playerId: 'p1', op: { kind: 'note', index: 0, value: 1 }, result: 'note', scores: { p1: 0 }, notes: [1], cellIndex: 0 } }],
    ['opApplied note without notes', { type: 'opApplied', payload: { playerId: 'p1', op: { kind: 'note', index: 0, value: 1 }, result: 'note', scores: { p1: 0 } } }],
    ['opApplied correct without completedUnits', { type: 'opApplied', payload: { playerId: 'p1', op: { kind: 'fill', index: 0, value: 1 }, result: 'correct', cellIndex: 0, cell: { value: 1, given: false, owner: 'p1', wrong: false }, scores: { p1: 0 } } }],
    ['opApplied wrong with completedUnits', { type: 'opApplied', payload: { playerId: 'p1', op: { kind: 'fill', index: 0, value: 1 }, result: 'wrong', cellIndex: 0, cell: { value: 1, given: false, owner: 'p1', wrong: false }, completedUnits: [], scores: { p1: 0 } } }],
    ['opApplied empty scores', { type: 'opApplied', payload: { playerId: 'p1', op: { kind: 'fill', index: 0, value: 1 }, result: 'wrong', cellIndex: 0, cell: { value: 1, given: false, owner: 'p1', wrong: false }, scores: {} } }],
    ['opApplied negative score', { type: 'opApplied', payload: { playerId: 'p1', op: { kind: 'fill', index: 0, value: 1 }, result: 'wrong', cellIndex: 0, cell: { value: 1, given: false, owner: 'p1', wrong: false }, scores: { p1: -1 } } }],
    ['opApplied cell with v1 notes field', { type: 'opApplied', payload: { playerId: 'p1', op: { kind: 'fill', index: 0, value: 1 }, result: 'wrong', cellIndex: 0, cell: { value: 1, given: false, owner: 'p1', wrong: false, notes: [] }, scores: { p1: 0 } } }],
    ['gameOver forfeit with null winner', { type: 'gameOver', payload: { winnerId: null, reason: 'forfeit', scores: { p1: 1 }, elapsedSeconds: 10 } }],
    ['gameOver bad reason', { type: 'gameOver', payload: { winnerId: 'p1', reason: 'resigned', scores: { p1: 1 }, elapsedSeconds: 10 } }],
    ['gameOver negative elapsedSeconds', { type: 'gameOver', payload: { winnerId: 'p1', reason: 'completed', scores: { p1: 1 }, elapsedSeconds: -1 } }],
    ['gameOver empty scores', { type: 'gameOver', payload: { winnerId: 'p1', reason: 'completed', scores: {}, elapsedSeconds: 10 } }],
    ['error empty message', { type: 'error', payload: { message: '' } }],
  ])('rejects invalid payload: %s', (_label, msg) => {
    expect(deserialize(JSON.stringify({ version: 2, ...(msg as object) }))).toBeNull();
  });

  describe('CellEntry consistency (BR-P-05/06/07/08)', () => {
    const cellCase = (cell: object) =>
      JSON.stringify({
        version: 2,
        type: 'opApplied',
        payload: {
          playerId: 'p1',
          op: { kind: 'fill', index: 0, value: 3 },
          result: 'correct',
          cellIndex: 0,
          cell,
          completedUnits: [],
          scores: { p1: 0 },
        },
      });

    it('accepts a given cell (value set, owner null)', () => {
      const raw = cellCase({ value: 5, given: true, owner: null, wrong: false });
      expect(deserialize(raw)).not.toBeNull();
    });

    it('rejects a given cell with an owner (BR-P-06)', () => {
      const raw = cellCase({ value: 5, given: true, owner: 'p1', wrong: false });
      expect(deserialize(raw)).toBeNull();
    });

    it('rejects an empty cell marked wrong (BR-P-07)', () => {
      const raw = cellCase({ value: 0, given: false, owner: null, wrong: true });
      expect(deserialize(raw)).toBeNull();
    });

    it('rejects a filled player cell without owner (BR-P-08)', () => {
      const raw = cellCase({ value: 5, given: false, owner: null, wrong: false });
      expect(deserialize(raw)).toBeNull();
    });

    it('rejects a cell carrying the v1 notes field (BR-P-05)', () => {
      const raw = cellCase({ value: 0, given: false, owner: null, wrong: false, notes: [] });
      expect(deserialize(raw)).toBeNull();
    });

    it('rejects a cell carrying an unknown extra field (BR-P-05 whitelist)', () => {
      const raw = cellCase({ value: 0, given: false, owner: null, wrong: false, extra: 1 });
      expect(deserialize(raw)).toBeNull();
    });
  });

  describe('Snapshot validation', () => {
    it('rejects cells array of wrong length', () => {
      expect(
        deserialize(JSON.stringify({ version: 2, type: 'joined', payload: { ...snapshot, cells: snapshot.cells.slice(0, 80) } }))
      ).toBeNull();
    });

    it('rejects you not present in players', () => {
      expect(
        deserialize(JSON.stringify({ version: 2, type: 'joined', payload: { ...snapshot, you: 'ghost' } }))
      ).toBeNull();
    });

    it('rejects negative player score', () => {
      const bad = { ...snapshot, players: [{ id: 'p1', score: -1 }] };
      expect(deserialize(JSON.stringify({ version: 2, type: 'joined', payload: bad }))).toBeNull();
    });

    it('accepts valid private notes in yourNotes', () => {
      const good = { ...snapshot, yourNotes: { 12: [1, 2, 3], 40: [7] } };
      expect(deserialize(JSON.stringify({ version: 2, type: 'joined', payload: good }))).not.toBeNull();
    });

    it('rejects yourNotes key out of range', () => {
      const bad = { ...snapshot, yourNotes: { ...snapshot.yourNotes, 81: [1] } };
      expect(deserialize(JSON.stringify({ version: 2, type: 'joined', payload: bad }))).toBeNull();
    });

    it('rejects yourNotes key of a non-empty cell', () => {
      const cells = snapshot.cells.slice();
      cells[5] = { value: 3, given: false, owner: 'p1', wrong: false };
      const bad = { ...snapshot, cells, yourNotes: { ...snapshot.yourNotes, 5: [1] } };
      expect(deserialize(JSON.stringify({ version: 2, type: 'joined', payload: bad }))).toBeNull();
    });

    it('rejects yourNotes value with duplicate digits', () => {
      const bad = { ...snapshot, yourNotes: { ...snapshot.yourNotes, 12: [1, 1] } };
      expect(deserialize(JSON.stringify({ version: 2, type: 'joined', payload: bad }))).toBeNull();
    });
  });
});
