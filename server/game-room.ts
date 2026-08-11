import type { Puzzle, Difficulty } from '../src/core/types';
import { RuleValidator } from '../src/core/rule-validator';
import type {
  CellEntry,
  CompletedUnit,
  Op,
  PlayerId,
  PlayerInfo,
  RoomId,
  ServerMessage,
  Snapshot,
} from '../shared/protocol';
import {
  applyErase,
  applyFillCorrect,
  applyFillWrong,
  applyRedoFill,
  applyUndoFill,
  type ScoreState,
} from './score-engine';

export interface MoveRecord {
  op: Op;
  cellIndex: number;
  before: CellEntry;
  after: CellEntry;
  clearedNotes: { index: number; value: number }[];
  scoreDelta: number;
}

export interface RoomPlayer {
  playerId: PlayerId;
  undoStack: MoveRecord[];
  redoStack: MoveRecord[];
}

export type RoomSender = (playerId: PlayerId, msg: ServerMessage) => void;

type UnitType = 'row' | 'col' | 'box';

export class GameRoom {
  private readonly roomId: RoomId;
  private readonly difficulty: Difficulty;
  private readonly startedAt: number;
  private readonly send: RoomSender;
  private readonly solution: number[];
  private readonly cells: CellEntry[];
  private readonly players = new Map<PlayerId, RoomPlayer>();
  private readonly scores = new Map<PlayerId, ScoreState>();
  private readonly notesByPlayer = new Map<PlayerId, Map<number, Set<number>>>();
  private hadTwoPlayers = false;
  private status: 'playing' | 'won' = 'playing';

  constructor(
    puzzle: Puzzle,
    difficulty: Difficulty,
    roomId: RoomId,
    startedAt: number,
    send: RoomSender,
  ) {
    this.roomId = roomId;
    this.difficulty = difficulty;
    this.startedAt = startedAt;
    this.send = send;
    this.solution = puzzle.solution;
    this.cells = puzzle.givens.map((v) => ({
      value: v,
      given: v !== 0,
      owner: null,
      wrong: false,
    }));
  }

  getRoomId(): RoomId {
    return this.roomId;
  }

  getDifficulty(): Difficulty {
    return this.difficulty;
  }

  getStatus(): 'playing' | 'won' {
    return this.status;
  }

  getStartedAt(): number {
    return this.startedAt;
  }

  getPlayerCount(): number {
    return this.players.size;
  }

  isJoinable(): boolean {
    return this.status === 'playing' && this.players.size === 1;
  }

  getPlayers(): RoomPlayer[] {
    return Array.from(this.players.values());
  }

  getCells(): CellEntry[] {
    return this.cells.map((c) => this.cloneCell(c));
  }

  addPlayer(playerId: PlayerId): void {
    this.players.set(playerId, { playerId, undoStack: [], redoStack: [] });
    this.scores.set(playerId, { score: 0, combo: 0 });
    this.notesByPlayer.set(playerId, new Map());
    if (this.players.size === 2) this.hadTwoPlayers = true;
    this.send(playerId, { type: 'joined', payload: this.snapshotFor(playerId) });
    for (const p of this.players.values()) {
      if (p.playerId !== playerId) {
        this.send(p.playerId, { type: 'playerJoined', payload: { player: { id: playerId, score: 0 } } });
      }
    }
  }

  removePlayer(playerId: PlayerId): void {
    if (!this.players.has(playerId)) return;
    if (this.status === 'playing' && this.hadTwoPlayers) {
      this.finalize('forfeit', playerId);
    } else if (this.status === 'won') {
      for (const p of this.players.values()) {
        if (p.playerId !== playerId) {
          this.send(p.playerId, { type: 'playerLeft', payload: { playerId } });
        }
      }
    }
    this.players.delete(playerId);
    this.scores.delete(playerId);
    this.notesByPlayer.delete(playerId);
  }

  handleOp(playerId: PlayerId, op: Op): void {
    if (!this.players.has(playerId)) return;
    if (this.status !== 'playing') {
      this.reject(playerId, 'game-over');
      return;
    }
    switch (op.kind) {
      case 'fill':
        this.handleFill(playerId, op);
        break;
      case 'erase':
        this.handleErase(playerId, op);
        break;
      case 'note':
        this.handleNote(playerId, op);
        break;
      case 'undo':
        this.handleUndo(playerId);
        break;
      case 'redo':
        this.handleRedo(playerId);
        break;
    }
  }

  snapshotFor(you: PlayerId): Snapshot {
    const yourNotes: Record<number, number[]> = {};
    const notes = this.notesByPlayer.get(you);
    if (notes) {
      for (const [index, set] of notes) {
        if (this.cells[index].value === 0) {
          yourNotes[index] = Array.from(set).sort((a, b) => a - b);
        }
      }
    }
    return {
      roomId: this.roomId,
      difficulty: this.difficulty,
      cells: this.getCells(),
      players: this.getPlayers().map((p) => this.playerInfo(p)),
      yourNotes,
      startedAt: this.startedAt,
      status: this.status,
      you,
    };
  }

  private handleFill(playerId: PlayerId, op: Extract<Op, { kind: 'fill' }>): void {
    const cell = this.cells[op.index];
    if (cell.given) {
      this.reject(playerId, 'given-cell');
      return;
    }
    if (cell.value === op.value) {
      this.reject(playerId, 'no-op');
      return;
    }
    if (cell.value !== 0 && cell.owner !== playerId && !cell.wrong) {
      this.reject(playerId, 'not-overwritable');
      return;
    }
    const before = this.cloneCell(cell);
    if (RuleValidator.isCorrect(this.solution, op.index, op.value)) {
      const clearedByPlayer = new Map<PlayerId, number[]>();
      const clearedEntries: { index: number; value: number }[] = [];
      for (const pid of this.players.keys()) {
        this.notesByPlayer.get(pid)?.delete(op.index);
      }
      for (const pid of this.players.keys()) {
        const indexes: number[] = [];
        for (const peer of this.peersOf(op.index)) {
          const notes = this.notesByPlayer.get(pid)?.get(peer);
          if (notes && notes.has(op.value)) {
            notes.delete(op.value);
            if (notes.size === 0) this.notesByPlayer.get(pid)?.delete(peer);
            if (pid === playerId) clearedEntries.push({ index: peer, value: op.value });
            indexes.push(peer);
          }
        }
        if (indexes.length > 0) clearedByPlayer.set(pid, indexes);
      }
      cell.value = op.value;
      cell.given = false;
      cell.owner = playerId;
      cell.wrong = false;
      const after = this.cloneCell(cell);
      const { next, delta } = applyFillCorrect(this.scores.get(playerId)!);
      this.scores.set(playerId, next);
      this.record(this.players.get(playerId)!, {
        op,
        cellIndex: op.index,
        before,
        after,
        clearedNotes: clearedEntries,
        scoreDelta: delta,
      });
      const completedUnits = this.completedUnitsFor(op.index);
      this.broadcastOpApplied(playerId, op, {
        result: 'correct',
        cellIndex: op.index,
        cell: after,
        completedUnits,
        scores: this.scoresSnapshot(),
        clearedByPlayer,
      });
      if (RuleValidator.isComplete(this.boardValues(), this.solution)) {
        this.finalize('completed');
      }
    } else {
      for (const pid of this.players.keys()) {
        this.notesByPlayer.get(pid)?.delete(op.index);
      }
      cell.value = op.value;
      cell.given = false;
      cell.owner = playerId;
      cell.wrong = true;
      const after = this.cloneCell(cell);
      const { next, delta } = applyFillWrong(this.scores.get(playerId)!);
      this.scores.set(playerId, next);
      this.record(this.players.get(playerId)!, {
        op,
        cellIndex: op.index,
        before,
        after,
        clearedNotes: [],
        scoreDelta: delta,
      });
      this.broadcastOpApplied(playerId, op, {
        result: 'wrong',
        cellIndex: op.index,
        cell: after,
        scores: this.scoresSnapshot(),
        clearedByPlayer: new Map(),
      });
    }
  }

  private handleErase(playerId: PlayerId, op: Extract<Op, { kind: 'erase' }>): void {
    const cell = this.cells[op.index];
    if (cell.given || cell.value === 0 || cell.owner !== playerId) {
      this.reject(playerId, 'not-erasable');
      return;
    }
    const before = this.cloneCell(cell);
    const { next, delta } = applyErase(this.scores.get(playerId)!, !cell.wrong);
    this.scores.set(playerId, next);
    cell.value = 0;
    cell.owner = null;
    cell.wrong = false;
    const after = this.cloneCell(cell);
    this.record(this.players.get(playerId)!, {
      op,
      cellIndex: op.index,
      before,
      after,
      clearedNotes: [],
      scoreDelta: delta,
    });
    this.broadcastOpApplied(playerId, op, {
      result: 'erased',
      cellIndex: op.index,
      cell: after,
      scores: this.scoresSnapshot(),
      clearedByPlayer: new Map(),
    });
  }

  private handleNote(playerId: PlayerId, op: Extract<Op, { kind: 'note' }>): void {
    const cell = this.cells[op.index];
    if (cell.given || cell.value !== 0) {
      this.reject(playerId, 'invalid-note-cell');
      return;
    }
    const before = this.cloneCell(cell);
    this.toggleNote(playerId, op.index, op.value);
    const after = this.cloneCell(cell);
    this.record(this.players.get(playerId)!, {
      op,
      cellIndex: op.index,
      before,
      after,
      clearedNotes: [],
      scoreDelta: 0,
    });
    const notes = Array.from(this.notesByPlayer.get(playerId)?.get(op.index) ?? []).sort((a, b) => a - b);
    this.send(playerId, {
      type: 'opApplied',
      payload: { playerId, op, result: 'note', scores: this.scoresSnapshot(), notes },
    });
  }

  private handleUndo(playerId: PlayerId): void {
    const player = this.players.get(playerId)!;
    const record = player.undoStack.pop();
    if (!record) {
      this.reject(playerId, 'nothing-to-undo');
      return;
    }
    const restored: number[] = [];
    if (this.cellsEqual(this.cells[record.cellIndex], record.after)) {
      if (record.op.kind === 'note') {
        if (this.cells[record.cellIndex].value === 0) {
          this.toggleNote(playerId, record.cellIndex, record.op.value);
          restored.push(record.cellIndex);
        }
      } else if (record.op.kind === 'fill') {
        this.cells[record.cellIndex] = this.cloneCell(record.before);
        for (const entry of record.clearedNotes) {
          if (entry.index === record.cellIndex) continue;
          if (this.cells[entry.index].value === 0 && !this.hasNote(playerId, entry.index, entry.value)) {
            this.addNote(playerId, entry.index, entry.value);
            restored.push(entry.index);
          }
        }
      } else {
        this.cells[record.cellIndex] = this.cloneCell(record.before);
      }
      const { next } = applyUndoFill(this.scores.get(playerId)!, record.scoreDelta);
      this.scores.set(playerId, next);
      player.redoStack.push(record);
    }
    this.broadcastOpApplied(playerId, { kind: 'undo' }, {
      result: 'undone',
      cellIndex: record.cellIndex,
      cell: this.cloneCell(this.cells[record.cellIndex]),
      scores: this.scoresSnapshot(),
      clearedByPlayer: restored.length > 0 ? new Map([[playerId, restored]]) : new Map(),
    });
  }

  private handleRedo(playerId: PlayerId): void {
    const player = this.players.get(playerId)!;
    const record = player.redoStack.pop();
    if (!record) {
      this.reject(playerId, 'nothing-to-redo');
      return;
    }
    const cleared: number[] = [];
    if (this.cellsEqual(this.cells[record.cellIndex], record.before)) {
      if (record.op.kind === 'note') {
        if (this.cells[record.cellIndex].value === 0) {
          this.toggleNote(playerId, record.cellIndex, record.op.value);
          cleared.push(record.cellIndex);
        }
      } else if (record.op.kind === 'fill') {
        this.cells[record.cellIndex] = this.cloneCell(record.after);
        for (const entry of record.clearedNotes) {
          if (entry.index === record.cellIndex) continue;
          if (this.cells[entry.index].value === 0 && this.hasNote(playerId, entry.index, entry.value)) {
            this.removeNote(playerId, entry.index, entry.value);
            cleared.push(entry.index);
          }
        }
      } else {
        this.cells[record.cellIndex] = this.cloneCell(record.after);
      }
      const { next } = applyRedoFill(this.scores.get(playerId)!, record.scoreDelta);
      this.scores.set(playerId, next);
      player.undoStack.push(record);
    }
    this.broadcastOpApplied(playerId, { kind: 'redo' }, {
      result: 'redone',
      cellIndex: record.cellIndex,
      cell: this.cloneCell(this.cells[record.cellIndex]),
      scores: this.scoresSnapshot(),
      clearedByPlayer: cleared.length > 0 ? new Map([[playerId, cleared]]) : new Map(),
    });
  }

  private broadcastOpApplied(
    playerId: PlayerId,
    op: Op,
    common: {
      result: 'correct' | 'wrong' | 'erased' | 'undone' | 'redone';
      cellIndex: number;
      cell: CellEntry;
      completedUnits?: CompletedUnit[];
      scores: Record<PlayerId, number>;
      clearedByPlayer: Map<PlayerId, number[]>;
    },
  ): void {
    for (const p of this.players.values()) {
      const payload: Record<string, unknown> = {
        playerId,
        op,
        result: common.result,
        cellIndex: common.cellIndex,
        cell: common.cell,
        scores: common.scores,
      };
      if (common.result === 'correct') {
        payload.completedUnits = common.completedUnits ?? [];
      }
      const cleared = common.clearedByPlayer.get(p.playerId);
      if (cleared !== undefined && cleared.length > 0) {
        payload.clearedNotes = cleared;
      }
      this.send(p.playerId, { type: 'opApplied', payload } as ServerMessage);
    }
  }

  private record(player: RoomPlayer, move: MoveRecord): void {
    player.undoStack.push(move);
    player.redoStack.length = 0;
  }

  private finalize(reason: 'completed' | 'forfeit', leavingPlayerId?: PlayerId): void {
    let winnerId: PlayerId | null = null;
    const ids = Array.from(this.players.keys());
    if (reason === 'completed') {
      if (ids.length === 1) {
        winnerId = ids[0];
      } else if (ids.length === 2) {
        const [a, b] = ids;
        const sa = this.scores.get(a)?.score ?? 0;
        const sb = this.scores.get(b)?.score ?? 0;
        if (sa > sb) winnerId = a;
        else if (sb > sa) winnerId = b;
      }
    } else {
      for (const id of ids) {
        if (id !== leavingPlayerId) {
          winnerId = id;
          break;
        }
      }
    }
    this.status = 'won';
    this.broadcast({
      type: 'gameOver',
      payload: {
        winnerId,
        reason,
        scores: this.scoresSnapshot(),
        elapsedSeconds: Math.floor((Date.now() - this.startedAt) / 1000),
      },
    });
  }

  private toggleNote(playerId: PlayerId, index: number, value: number): void {
    const notes = this.notesByPlayer.get(playerId)!;
    const set = notes.get(index);
    if (set && set.has(value)) {
      set.delete(value);
      if (set.size === 0) notes.delete(index);
    } else if (set) {
      set.add(value);
    } else {
      notes.set(index, new Set([value]));
    }
  }

  private hasNote(playerId: PlayerId, index: number, value: number): boolean {
    return this.notesByPlayer.get(playerId)?.get(index)?.has(value) ?? false;
  }

  private addNote(playerId: PlayerId, index: number, value: number): void {
    const notes = this.notesByPlayer.get(playerId)!;
    let set = notes.get(index);
    if (!set) {
      set = new Set();
      notes.set(index, set);
    }
    set.add(value);
  }

  private removeNote(playerId: PlayerId, index: number, value: number): void {
    const notes = this.notesByPlayer.get(playerId)!;
    const set = notes.get(index);
    if (set) {
      set.delete(value);
      if (set.size === 0) notes.delete(index);
    }
  }

  private scoresSnapshot(): Record<PlayerId, number> {
    const out: Record<PlayerId, number> = {};
    for (const [id, s] of this.scores) {
      out[id] = s.score;
    }
    return out;
  }

  private playerInfo(player: RoomPlayer): PlayerInfo {
    return { id: player.playerId, score: this.scores.get(player.playerId)?.score ?? 0 };
  }

  private completedUnitsFor(index: number): CompletedUnit[] {
    const row = Math.floor(index / 9);
    const col = index % 9;
    const box = Math.floor(row / 3) * 3 + Math.floor(col / 3);
    const units: CompletedUnit[] = [
      { type: 'row', index: row },
      { type: 'col', index: col },
      { type: 'box', index: box },
    ];
    return units.filter((u) => this.isUnitComplete(u.type, u.index));
  }

  private isUnitComplete(type: UnitType, unit: number): boolean {
    const cells = this.unitCells(type, unit);
    for (const i of cells) {
      if (this.cells[i].value !== this.solution[i]) return false;
    }
    return true;
  }

  private unitCells(type: UnitType, unit: number): number[] {
    const cells: number[] = [];
    for (let k = 0; k < 9; k++) {
      if (type === 'row') {
        cells.push(unit * 9 + k);
      } else if (type === 'col') {
        cells.push(k * 9 + unit);
      } else {
        const br = Math.floor(unit / 3) * 3;
        const bc = (unit % 3) * 3;
        cells.push((br + Math.floor(k / 3)) * 9 + (bc + (k % 3)));
      }
    }
    return cells;
  }

  private peersOf(index: number): number[] {
    const row = Math.floor(index / 9);
    const col = index % 9;
    const boxRow = Math.floor(row / 3) * 3;
    const boxCol = Math.floor(col / 3) * 3;
    const peers = new Set<number>();
    for (let c = 0; c < 9; c++) {
      const peer = row * 9 + c;
      if (peer !== index) peers.add(peer);
    }
    for (let r = 0; r < 9; r++) {
      const peer = r * 9 + col;
      if (peer !== index) peers.add(peer);
    }
    for (let r = boxRow; r < boxRow + 3; r++) {
      for (let c = boxCol; c < boxCol + 3; c++) {
        const peer = r * 9 + c;
        if (peer !== index) peers.add(peer);
      }
    }
    return Array.from(peers);
  }

  private boardValues(): number[] {
    return this.cells.map((c) => c.value);
  }

  private cloneCell(cell: CellEntry): CellEntry {
    return { value: cell.value, given: cell.given, owner: cell.owner, wrong: cell.wrong };
  }

  private cellsEqual(a: CellEntry, b: CellEntry): boolean {
    return (
      a.value === b.value &&
      a.given === b.given &&
      a.owner === b.owner &&
      a.wrong === b.wrong
    );
  }

  private reject(playerId: PlayerId, reason: string): void {
    this.send(playerId, { type: 'opRejected', payload: { playerId, reason } });
  }

  private broadcast(msg: ServerMessage): void {
    for (const p of this.players.values()) {
      this.send(p.playerId, msg);
    }
  }
}
