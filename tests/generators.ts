import fc from 'fast-check';
import type {
  CellEntry,
  ClearedNote,
  ClientMessage,
  CompletedUnit,
  Op,
  PlayerId,
  PlayerInfo,
  ProtocolMessage,
  ServerMessage,
  Snapshot,
} from '../shared/protocol';

export const arbPlayerId = fc.string({ minLength: 1, maxLength: 12 }).filter((s) => s.trim().length > 0);
export const arbRoomId = arbPlayerId;
export const arbDifficulty = fc.constantFrom('easy', 'medium', 'hard', 'expert') as fc.Arbitrary<
  'easy' | 'medium' | 'hard' | 'expert'
>;
export const arbIndex = fc.integer({ min: 0, max: 80 });
export const arbValue = fc.integer({ min: 1, max: 9 });
export const arbNotes = fc.uniqueArray(arbValue, { maxLength: 9 });

export const arbCellEntry: fc.Arbitrary<CellEntry> = fc.oneof(
  fc.record({
    value: arbValue,
    given: fc.constant(true),
    owner: fc.constant(null),
    wrong: fc.constant(false),
  }),
  fc.record({
    value: fc.constant(0),
    given: fc.constant(false),
    owner: fc.constant(null),
    wrong: fc.constant(false),
  }),
  fc.record({
    value: arbValue,
    given: fc.constant(false),
    owner: arbPlayerId,
    wrong: fc.boolean(),
  })
);

export const arbPlayerInfo: fc.Arbitrary<PlayerInfo> = fc.record({
  id: arbPlayerId,
  score: fc.integer({ min: 0, max: 100000 }),
});

export const arbSnapshot: fc.Arbitrary<Snapshot> = fc
  .tuple(
    arbRoomId,
    arbDifficulty,
    fc.array(arbCellEntry, { minLength: 81, maxLength: 81 }),
    fc.array(arbPlayerInfo, { minLength: 1, maxLength: 2 }),
    fc.integer({ min: 0, max: Number.MAX_SAFE_INTEGER }),
    fc.constantFrom('playing', 'won') as fc.Arbitrary<'playing' | 'won'>
  )
  .chain(([roomId, difficulty, cells, players, startedAt, status]) => {
    const emptyIndexes = cells
      .map((cell, index) => (cell.value === 0 ? String(index) : ''))
      .filter((k) => k !== '');
    return fc
      .subarray(emptyIndexes)
      .chain((keys) =>
        fc
          .record(Object.fromEntries(keys.map((k) => [k, arbNotes])))
          .map((yourNotes) => ({
            roomId,
            difficulty,
            cells,
            players,
            startedAt,
            status,
            you: players[0].id,
            yourNotes,
          }))
      );
  });

export const arbCompletedUnit: fc.Arbitrary<CompletedUnit> = fc.record({
  type: fc.constantFrom('row', 'col', 'box') as fc.Arbitrary<'row' | 'col' | 'box'>,
  index: fc.integer({ min: 0, max: 8 }),
});

export const arbOp: fc.Arbitrary<Op> = fc.oneof(
  fc.record({ kind: fc.constant('fill' as const), index: arbIndex, value: arbValue }),
  fc.record({ kind: fc.constant('erase' as const), index: arbIndex }),
  fc.record({ kind: fc.constant('note' as const), index: arbIndex, value: arbValue }),
  fc.record({ kind: fc.constant('undo' as const) }),
  fc.record({ kind: fc.constant('redo' as const) })
);

export const arbClientMessage: fc.Arbitrary<ClientMessage> = fc.oneof(
  arbDifficulty.map((difficulty) => ({ type: 'join' as const, payload: { difficulty } })),
  arbOp.map((op) => ({ type: 'op' as const, payload: { op } })),
  fc.constant({ type: 'leave' as const, payload: {} })
);

const arbScores: fc.Arbitrary<Record<PlayerId, number>> = fc
  .array(arbPlayerId, { minLength: 1, maxLength: 2 })
  .chain((ids) =>
    fc
      .record(Object.fromEntries(ids.map((id) => [id, fc.integer({ min: 0, max: 100000 })])))
      .map((scores) => scores as Record<PlayerId, number>)
  );

const arbClearedNotes = fc.array(fc.record({ index: arbIndex, value: arbValue }), { maxLength: 20 });

const arbOpAppliedNote: fc.Arbitrary<ServerMessage> = fc
  .record({
    playerId: arbPlayerId,
    op: arbOp,
    result: fc.constant('note' as const),
    scores: arbScores,
    notes: arbNotes,
    clearedNotes: fc.option(arbClearedNotes, { nil: undefined }),
  })
  .map((p) => {
    const payload: {
      playerId: PlayerId;
      op: Op;
      result: 'note';
      scores: Record<PlayerId, number>;
      notes: number[];
      clearedNotes?: ClearedNote[];
    } = { ...p };
    if (payload.clearedNotes === undefined) delete payload.clearedNotes;
    return { type: 'opApplied' as const, payload };
  });

const arbOpAppliedCorrect: fc.Arbitrary<ServerMessage> = fc
  .record({
    playerId: arbPlayerId,
    op: arbOp,
    result: fc.constant('correct' as const),
    scores: arbScores,
    cellIndex: arbIndex,
    cell: arbCellEntry,
    completedUnits: fc.array(arbCompletedUnit, { maxLength: 3 }),
    clearedNotes: fc.option(arbClearedNotes, { nil: undefined }),
  })
  .map((p) => {
    const payload: {
      playerId: PlayerId;
      op: Op;
      result: 'correct';
      scores: Record<PlayerId, number>;
      cellIndex: number;
      cell: CellEntry;
      completedUnits: CompletedUnit[];
      clearedNotes?: ClearedNote[];
    } = { ...p };
    if (payload.clearedNotes === undefined) delete payload.clearedNotes;
    return { type: 'opApplied' as const, payload };
  });

const arbOpAppliedCellResult: fc.Arbitrary<ServerMessage> = fc
  .record({
    playerId: arbPlayerId,
    op: arbOp,
    result: fc.constantFrom('wrong', 'erased', 'undone', 'redone') as fc.Arbitrary<
      'wrong' | 'erased' | 'undone' | 'redone'
    >,
    scores: arbScores,
    cellIndex: arbIndex,
    cell: arbCellEntry,
    clearedNotes: fc.option(arbClearedNotes, { nil: undefined }),
  })
  .map((p) => {
    const payload: {
      playerId: PlayerId;
      op: Op;
      result: 'wrong' | 'erased' | 'undone' | 'redone';
      scores: Record<PlayerId, number>;
      cellIndex: number;
      cell: CellEntry;
      clearedNotes?: ClearedNote[];
    } = { ...p };
    if (payload.clearedNotes === undefined) delete payload.clearedNotes;
    return { type: 'opApplied' as const, payload };
  });

export const arbOpApplied: fc.Arbitrary<ServerMessage> = fc.oneof(
  arbOpAppliedNote,
  arbOpAppliedCorrect,
  arbOpAppliedCellResult
);

const arbGameOverCompletedWinner: fc.Arbitrary<ServerMessage> = fc
  .record({
    winnerId: arbPlayerId,
    reason: fc.constant('completed' as const),
    scores: arbScores,
    elapsedSeconds: fc.integer({ min: 0, max: 100000 }),
  })
  .map((payload) => ({ type: 'gameOver' as const, payload }));

const arbGameOverCompletedDraw: fc.Arbitrary<ServerMessage> = fc
  .record({
    winnerId: fc.constant(null),
    reason: fc.constant('completed' as const),
    scores: arbScores,
    elapsedSeconds: fc.integer({ min: 0, max: 100000 }),
  })
  .map((payload) => ({ type: 'gameOver' as const, payload }));

const arbGameOverForfeit: fc.Arbitrary<ServerMessage> = fc
  .record({
    winnerId: arbPlayerId,
    reason: fc.constant('forfeit' as const),
    scores: arbScores,
    elapsedSeconds: fc.integer({ min: 0, max: 100000 }),
  })
  .map((payload) => ({ type: 'gameOver' as const, payload }));

export const arbGameOver: fc.Arbitrary<ServerMessage> = fc.oneof(
  arbGameOverCompletedWinner,
  arbGameOverCompletedDraw,
  arbGameOverForfeit
);

export const arbServerMessage: fc.Arbitrary<ServerMessage> = fc.oneof(
  arbSnapshot.map((snapshot) => ({ type: 'joined' as const, payload: snapshot })),
  arbOpApplied,
  fc.tuple(arbPlayerId, fc.string({ minLength: 1 })).map(([playerId, reason]) => ({
    type: 'opRejected' as const,
    payload: { playerId, reason },
  })),
  arbPlayerInfo.map((player) => ({ type: 'playerJoined' as const, payload: { player } })),
  arbPlayerId.map((playerId) => ({ type: 'playerLeft' as const, payload: { playerId } })),
  arbGameOver,
  fc.string({ minLength: 1 }).map((message) => ({ type: 'error' as const, payload: { message } }))
);

export const arbMessage: fc.Arbitrary<ProtocolMessage> = fc.oneof(arbClientMessage, arbServerMessage);

type Envelope = Record<string, unknown>;

export type Mutator = (envelope: Envelope) => Envelope | null;

const universalMutators: Mutator[] = [
  (e) => ({ ...e, version: 1 }),
  (e) => ({ ...e, version: '1' }),
  (e) => ({ ...e, version: 3 }),
  (e) => ({ ...e, type: '__unknown__' }),
  (e) => ({ ...e, type: 'playerLost' }),
  (e) => ({ ...e, type: 'gameWon' }),
  (e) => ({ ...e, payload: null }),
  (e) => ({ ...e, payload: 42 }),
  (e) => {
    const c = { ...e };
    delete c.payload;
    return c;
  },
  (e) => {
    const c = { ...e };
    delete c.type;
    return c;
  },
];

const targetedMutators: Mutator[] = [
  (e) => {
    const p = e.payload as Record<string, unknown> | undefined;
    if (e.type !== 'op' || !p || typeof p !== 'object') return null;
    const op = p.op as Record<string, unknown>;
    if (op.kind !== 'fill' && op.kind !== 'note') return null;
    return { ...e, payload: { ...p, op: { ...op, index: 81 } } };
  },
  (e) => {
    const p = e.payload as Record<string, unknown> | undefined;
    if (e.type !== 'op' || !p || typeof p !== 'object') return null;
    const op = p.op as Record<string, unknown>;
    if (op.kind !== 'fill' && op.kind !== 'note') return null;
    return { ...e, payload: { ...p, op: { ...op, value: 10 } } };
  },
  (e) => {
    const p = e.payload as Record<string, unknown> | undefined;
    if (e.type !== 'joined' || !p || typeof p !== 'object') return null;
    const cells = p.cells as unknown[];
    return { ...e, payload: { ...p, cells: cells.slice(0, 80) } };
  },
  (e) => {
    const p = e.payload as Record<string, unknown> | undefined;
    if (e.type !== 'joined' || !p || typeof p !== 'object') return null;
    return { ...e, payload: { ...p, players: [] } };
  },
  (e) => {
    const p = e.payload as Record<string, unknown> | undefined;
    if (e.type !== 'joined' || !p || typeof p !== 'object') return null;
    return { ...e, payload: { ...p, you: 'no-such-player' } };
  },
  (e) => {
    const p = e.payload as Record<string, unknown> | undefined;
    if (e.type !== 'joined' || !p || typeof p !== 'object') return null;
    const yourNotes = (p.yourNotes ?? {}) as Record<string, unknown>;
    return { ...e, payload: { ...p, yourNotes: { ...yourNotes, '81': [1] } } };
  },
  (e) => {
    const p = e.payload as Record<string, unknown> | undefined;
    if (e.type !== 'joined' || !p || typeof p !== 'object') return null;
    const cells = p.cells as { value: number }[];
    const index = cells.findIndex((c) => c.value === 0);
    if (index === -1) {
      const yourNotes = (p.yourNotes ?? {}) as Record<string, unknown>;
      return { ...e, payload: { ...p, yourNotes: { ...yourNotes, '81': [1] } } };
    }
    const yourNotes = (p.yourNotes ?? {}) as Record<string, unknown>;
    return { ...e, payload: { ...p, yourNotes: { ...yourNotes, [index]: [1, 1] } } };
  },
  (e) => {
    const p = e.payload as Record<string, unknown> | undefined;
    if (e.type !== 'joined' || !p || typeof p !== 'object') return null;
    const cells = p.cells as { value: number }[];
    const index = cells.findIndex((c) => c.value !== 0);
    if (index === -1) {
      const yourNotes = (p.yourNotes ?? {}) as Record<string, unknown>;
      return { ...e, payload: { ...p, yourNotes: { ...yourNotes, '81': [1] } } };
    }
    const yourNotes = (p.yourNotes ?? {}) as Record<string, unknown>;
    return { ...e, payload: { ...p, yourNotes: { ...yourNotes, [index]: [1] } } };
  },
  (e) => {
    const p = e.payload as Record<string, unknown> | undefined;
    if (e.type !== 'opApplied' || !p || typeof p !== 'object') return null;
    const cell = p.cell as Record<string, unknown> | undefined;
    if (!cell || typeof cell !== 'object') return null;
    return { ...e, payload: { ...p, cell: { ...cell, notes: [1] } } };
  },
  (e) => {
    const p = e.payload as Record<string, unknown> | undefined;
    if (e.type !== 'opApplied' || !p || typeof p !== 'object') return null;
    return { ...e, payload: { ...p, result: 'maybe' } };
  },
  (e) => {
    const p = e.payload as Record<string, unknown> | undefined;
    if (e.type !== 'opApplied' || !p || typeof p !== 'object' || p.result !== 'note') return null;
    return {
      ...e,
      payload: {
        ...p,
        cellIndex: 0,
        cell: { value: 5, given: false, owner: 'x', wrong: false },
      },
    };
  },
  (e) => {
    const p = e.payload as Record<string, unknown> | undefined;
    if (e.type !== 'opApplied' || !p || typeof p !== 'object' || p.result !== 'note') return null;
    const c = { ...p };
    delete c.notes;
    return { ...e, payload: c };
  },
  (e) => {
    const p = e.payload as Record<string, unknown> | undefined;
    if (e.type !== 'opApplied' || !p || typeof p !== 'object' || p.result !== 'correct') return null;
    const c = { ...p };
    delete c.completedUnits;
    return { ...e, payload: c };
  },
  (e) => {
    const p = e.payload as Record<string, unknown> | undefined;
    if (e.type !== 'opApplied' || !p || typeof p !== 'object' || p.result !== 'correct') return null;
    const c = { ...p };
    delete c.cellIndex;
    return { ...e, payload: c };
  },
  (e) => {
    const p = e.payload as Record<string, unknown> | undefined;
    if (e.type !== 'opApplied' || !p || typeof p !== 'object') return null;
    if (p.result !== 'wrong' && p.result !== 'erased' && p.result !== 'undone' && p.result !== 'redone') {
      return null;
    }
    return { ...e, payload: { ...p, completedUnits: [] } };
  },
  (e) => {
    const p = e.payload as Record<string, unknown> | undefined;
    if (e.type !== 'opApplied' || !p || typeof p !== 'object') return null;
    return { ...e, payload: { ...p, scores: {} } };
  },
  (e) => {
    const p = e.payload as Record<string, unknown> | undefined;
    if (e.type !== 'opApplied' || !p || typeof p !== 'object') return null;
    const scores = p.scores as Record<string, unknown>;
    const key = Object.keys(scores)[0];
    return { ...e, payload: { ...p, scores: { ...scores, [key]: -1 } } };
  },
  (e) => {
    const p = e.payload as Record<string, unknown> | undefined;
    if (e.type !== 'opApplied' || !p || typeof p !== 'object') return null;
    if (!('clearedNotes' in p)) return null;
    return { ...e, payload: { ...p, clearedNotes: [{ index: 81, value: 1 }] } };
  },
  (e) => {
    const p = e.payload as Record<string, unknown> | undefined;
    if (e.type !== 'gameOver' || !p || typeof p !== 'object' || p.reason !== 'forfeit') return null;
    return { ...e, payload: { ...p, winnerId: null } };
  },
  (e) => {
    const p = e.payload as Record<string, unknown> | undefined;
    if (e.type !== 'gameOver' || !p || typeof p !== 'object') return null;
    if (p.winnerId === null) return null;
    return { ...e, payload: { ...p, winnerId: '' } };
  },
  (e) => {
    const p = e.payload as Record<string, unknown> | undefined;
    if (e.type !== 'gameOver' || !p || typeof p !== 'object') return null;
    return { ...e, payload: { ...p, reason: 'resigned' } };
  },
  (e) => {
    const p = e.payload as Record<string, unknown> | undefined;
    if (e.type !== 'gameOver' || !p || typeof p !== 'object') return null;
    return { ...e, payload: { ...p, elapsedSeconds: -1 } };
  },
  (e) => {
    const p = e.payload as Record<string, unknown> | undefined;
    if (e.type !== 'playerJoined' || !p || typeof p !== 'object') return null;
    return { ...e, payload: { ...p, player: { id: 'p', score: -1 } } };
  },
];

export const allMutators: Mutator[] = [...universalMutators, ...targetedMutators];

export function applicableMutators(envelope: Envelope): Mutator[] {
  return allMutators.filter((m) => m(envelope) !== null);
}

export const arbEnvelopeMutation = (envelope: Envelope) =>
  fc.constantFrom(...applicableMutators(envelope));
