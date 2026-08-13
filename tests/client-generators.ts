import fc from 'fast-check';
import type { CellEntry, ClearedNote, ClientMessage, Op, PlayerId, PlayerInfo, ServerMessage, Snapshot } from '../shared/protocol';
import { EventBus } from '../src/core/event-bus';
import { OnlineGameController } from '../src/net/online-game-controller';
import {
  arbCellEntry,
  arbCompletedUnit,
  arbDifficulty,
  arbIndex,
  arbNotes,
  arbRoomId,
  arbValue,
} from './generators';
import { GIVENS } from './server-generators';

export { arbGameOver } from './generators';

export interface WsStub {
  sent: ClientMessage[];
  closed: boolean;
  messageCb: ((msg: ServerMessage) => void) | null;
  closeCb: (() => void) | null;
  connect(url: string): Promise<void>;
  send(msg: ClientMessage): void;
  onMessage(cb: (msg: ServerMessage) => void): void;
  onClose(cb: () => void): void;
  close(): void;
  emitMessage(msg: ServerMessage): void;
  emitClose(): void;
}

export function makeWsStub(): WsStub {
  const stub: WsStub = {
    sent: [],
    closed: false,
    messageCb: null,
    closeCb: null,
    connect: () => Promise.resolve(),
    send(msg) {
      stub.sent.push(msg);
    },
    onMessage(cb) {
      stub.messageCb = cb;
    },
    onClose(cb) {
      stub.closeCb = cb;
    },
    close() {
      stub.closed = true;
    },
    emitMessage(msg) {
      stub.messageCb?.(msg);
    },
    emitClose() {
      stub.closeCb?.();
    },
  };
  return stub;
}

export function makeController(): { bus: EventBus; ws: WsStub; oc: OnlineGameController } {
  const bus = new EventBus();
  const ws = makeWsStub();
  const oc = new OnlineGameController(bus, ws);
  return { bus, ws, oc };
}

/** v2 Snapshot（GIVENS 棋盘）：cells 无 notes、players 含 score、yourNotes 整数键 */
export function makeSnapshot(
  you = 'me',
  opponent: string | null = 'op',
  yourNotes: Record<number, number[]> = {}
): Snapshot {
  const cells: CellEntry[] = GIVENS.map((v) => ({ value: v, given: v !== 0, owner: null, wrong: false }));
  const players: PlayerInfo[] = [{ id: you, score: 0 }];
  if (opponent !== null) players.push({ id: opponent, score: 0 });
  return {
    roomId: 'r1',
    difficulty: 'medium',
    cells,
    players,
    yourNotes,
    startedAt: Date.now() - 5000,
    status: 'playing',
    you,
  };
}

export function joinController(
  _oc: OnlineGameController,
  ws: WsStub,
  you = 'me',
  opponent: string | null = 'op',
  yourNotes: Record<number, number[]> = {}
): void {
  ws.emitMessage({ type: 'joined', payload: makeSnapshot(you, opponent, yourNotes) });
}

/** 白盒镜像视图（测试专用）：直接核对 mirror.cells / ownNotes / players */
export interface MirrorView {
  cells: CellEntry[];
  ownNotes: Map<number, Set<number>>;
  players: PlayerInfo[];
}

export function mirrorOf(oc: OnlineGameController): MirrorView {
  const mirror = (oc as unknown as { mirror: MirrorView | null }).mirror;
  if (!mirror) throw new Error('controller 未初始化（需先 joined）');
  return mirror;
}

/**
 * 笔记专用格 / 玩法格划分（PBT-07 个性化生成器的合法性基础）：
 * - note op 与 yourNotes 只落在 NOTE_CELLS（快照强制恒为空、玩法 op 永不触及 → 不变量"笔记仅存在于空格"成立）；
 * - 玩法 op（fill/erase/undo/redo 及格子写入）只落在 PLAY_CELLS。
 */
const EMPTY_INDICES = GIVENS.map((v, i) => (v === 0 ? i : -1)).filter((i) => i >= 0);
const NOTE_CELLS = EMPTY_INDICES.slice(-3);
const PLAY_CELLS = Array.from({ length: 81 }, (_, i) => i).filter((i) => !NOTE_CELLS.includes(i));

/** Snapshot v2 生成器：yourNotes 整数键（仅 NOTE_CELLS 空格）、players 含 score */
export const arbClientSnapshot = (you: PlayerId, opponent: PlayerId): fc.Arbitrary<Snapshot> =>
  fc
    .tuple(
      arbRoomId,
      arbDifficulty,
      fc.array(arbCellEntry, { minLength: 81, maxLength: 81 }),
      fc.integer({ min: 0, max: 100000 }),
      fc.integer({ min: 0, max: 100000 }),
      fc.integer({ min: 0, max: Number.MAX_SAFE_INTEGER })
    )
    .chain(([roomId, difficulty, rawCells, youScore, opScore, startedAt]) => {
      const cells = rawCells.map((c, i) =>
        NOTE_CELLS.includes(i) ? { value: 0, given: false, owner: null, wrong: false } : { ...c }
      );
      return fc
        .subarray(NOTE_CELLS.map(String))
        .chain((keys) =>
          fc
            .record(Object.fromEntries(keys.map((k) => [k, arbNotes])))
            .map((yourNotes) => ({
              roomId,
              difficulty,
              cells,
              players: [
                { id: you, score: youScore },
                { id: opponent, score: opScore },
              ],
              startedAt,
              status: 'playing' as const,
              you,
              yourNotes: yourNotes as Record<number, number[]>,
            }))
        );
    });

const arbScoresFor = (ids: PlayerId[]): fc.Arbitrary<Record<PlayerId, number>> =>
  fc
    .array(fc.constantFrom(...ids), { minLength: 1, maxLength: 2 })
    .chain((keys) =>
      fc
        .record(Object.fromEntries([...new Set(keys)].map((k) => [k, fc.integer({ min: 0, max: 100000 })])))
        .map((scores) => scores as Record<PlayerId, number>)
    );

const arbClearedNotes = fc.array(fc.record({ index: arbIndex, value: arbValue }), { maxLength: 20 });

const arbNoteOp = fc.record({
  kind: fc.constant('note' as const),
  index: fc.constantFrom(...NOTE_CELLS),
  value: arbValue,
});

const arbPlayIndex = fc.constantFrom(...PLAY_CELLS);

const arbFillOp = fc.record({ kind: fc.constant('fill' as const), index: arbPlayIndex, value: arbValue });
const arbEraseOp = fc.record({ kind: fc.constant('erase' as const), index: arbPlayIndex });
const arbPlayOp = fc.oneof(
  arbFillOp,
  arbEraseOp,
  fc.constant({ kind: 'undo' as const }),
  fc.constant({ kind: 'redo' as const })
);

/** 个性化 opApplied 生成器（按接收方视角，结果联合与 shared/protocol 判别联合严格对齐）：
 * - note 变体仅自己副本携带（服务端 handleNote 只 send 给操作者且不带 clearedNotes），notes 整格替换；
 * - clearedNotes 可选（服务端 clearedByPlayer 按玩家个性化下发，且只含 peer 格、不含本消息 cellIndex）；
 * - correct 变体带 completedUnits；wrong/erased/undone/redone 不带。 */
export const arbOpAppliedFor = (
  you: PlayerId,
  opponent: PlayerId
): fc.Arbitrary<Extract<ServerMessage, { type: 'opApplied' }>> =>
  fc.oneof(arbOpAppliedNote(you, opponent), arbOpAppliedCorrect(you, opponent), arbOpAppliedOther(you, opponent));

const arbOpAppliedNote = (
  you: PlayerId,
  opponent: PlayerId
): fc.Arbitrary<Extract<ServerMessage, { type: 'opApplied' }>> =>
  fc
    .record({
      playerId: fc.constant(you),
      op: arbNoteOp,
      result: fc.constant('note' as const),
      scores: arbScoresFor([you, opponent]),
      notes: arbNotes,
    })
    .map((p) => ({
      type: 'opApplied' as const,
      payload: { playerId: p.playerId, op: p.op, result: p.result, scores: p.scores, notes: p.notes },
    }));

const arbOpAppliedCorrect = (
  you: PlayerId,
  opponent: PlayerId
): fc.Arbitrary<Extract<ServerMessage, { type: 'opApplied' }>> =>
  fc
    .record({
      playerId: fc.constantFrom(you, opponent),
      op: arbFillOp,
      result: fc.constant('correct' as const),
      cellIndex: arbPlayIndex,
      cell: arbCellEntry,
      completedUnits: fc.array(arbCompletedUnit, { maxLength: 3 }),
      scores: arbScoresFor([you, opponent]),
      clearedNotes: fc.option(arbClearedNotes, { nil: undefined }),
    })
    .map((p) => {
      const payload: {
        playerId: PlayerId;
        op: Op;
        result: 'correct';
        cellIndex: number;
        cell: CellEntry;
        completedUnits: { type: 'row' | 'col' | 'box'; index: number }[];
        scores: Record<PlayerId, number>;
        clearedNotes?: ClearedNote[];
      } = { ...p };
      if (payload.clearedNotes === undefined) delete payload.clearedNotes;
      return { type: 'opApplied' as const, payload };
    });

const arbOpAppliedOther = (
  you: PlayerId,
  opponent: PlayerId
): fc.Arbitrary<Extract<ServerMessage, { type: 'opApplied' }>> =>
  fc
    .record({
      playerId: fc.constantFrom(you, opponent),
      op: arbPlayOp,
      result: fc.constantFrom('wrong', 'erased', 'undone', 'redone') as fc.Arbitrary<
        'wrong' | 'erased' | 'undone' | 'redone'
      >,
      cellIndex: arbPlayIndex,
      cell: arbCellEntry,
      scores: arbScoresFor([you, opponent]),
      clearedNotes: fc.option(arbClearedNotes, { nil: undefined }),
      notes: fc.option(arbNotes, { nil: undefined }),
    })
    .map((p) => {
      const payload: {
        playerId: PlayerId;
        op: Op;
        result: 'wrong' | 'erased' | 'undone' | 'redone';
        cellIndex: number;
        cell: CellEntry;
        scores: Record<PlayerId, number>;
        clearedNotes?: ClearedNote[];
        notes?: number[];
      } = { ...p };
      if (payload.clearedNotes === undefined) delete payload.clearedNotes;
      if (payload.notes === undefined || payload.cell.value !== 0) delete payload.notes;
      return { type: 'opApplied' as const, payload };
    });

export const arbOpAppliedStream = (
  you: PlayerId,
  opponent: PlayerId,
  maxLen = 20
): fc.Arbitrary<Extract<ServerMessage, { type: 'opApplied' }>[]> =>
  fc.array(arbOpAppliedFor(you, opponent), { maxLength: maxLen });
