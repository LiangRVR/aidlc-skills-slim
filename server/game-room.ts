import type { Puzzle, Difficulty } from '../src/core/types';
import { RuleValidator } from '../src/core/rule-validator';
import type { CellEntry, Op, PlayerId, RoomId, ServerMessage, Snapshot } from '../shared/protocol';

export interface MoveRecord {
  op: Op;
  cellIndex: number;
  before: CellEntry;
  after: CellEntry;
  clearedNotes: { index: number; value: number }[];
}

export interface RoomPlayer {
  playerId: PlayerId;
  mistakes: number;
  spectating: boolean;
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
      notes: [],
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
    const player: RoomPlayer = {
      playerId,
      mistakes: 0,
      spectating: false,
      undoStack: [],
      redoStack: [],
    };
    this.players.set(playerId, player);
    this.send(playerId, { type: 'joined', payload: this.snapshotFor(playerId) });
    const info = this.playerInfo(player);
    for (const p of this.players.values()) {
      if (p.playerId !== playerId) {
        this.send(p.playerId, { type: 'playerJoined', payload: { player: info } });
      }
    }
  }

  removePlayer(playerId: PlayerId): void {
    if (!this.players.delete(playerId)) return;
    for (const p of this.players.values()) {
      this.send(p.playerId, { type: 'playerLeft', payload: { playerId } });
    }
  }

  handleOp(playerId: PlayerId, op: Op): void {
    const player = this.players.get(playerId);
    if (!player) return;
    if (this.status !== 'playing') {
      this.reject(playerId, 'game-over');
      return;
    }
    if (player.spectating) {
      this.reject(playerId, 'spectating');
      return;
    }
    switch (op.kind) {
      case 'fill':
        this.handleFill(player, op);
        break;
      case 'erase':
        this.handleErase(player, op);
        break;
      case 'note':
        this.handleNote(player, op);
        break;
      case 'undo':
        this.handleUndo(player);
        break;
      case 'redo':
        this.handleRedo(player);
        break;
    }
  }

  snapshotFor(you: PlayerId): Snapshot {
    return {
      roomId: this.roomId,
      difficulty: this.difficulty,
      cells: this.getCells(),
      players: this.getPlayers().map((p) => this.playerInfo(p)),
      startedAt: this.startedAt,
      status: this.status,
      you,
    };
  }

  private handleFill(player: RoomPlayer, op: Extract<Op, { kind: 'fill' }>): void {
    const cell = this.cells[op.index];
    if (cell.given) {
      this.reject(player.playerId, 'given-cell');
      return;
    }
    if (cell.value !== 0 && cell.owner !== player.playerId && !cell.wrong) {
      this.reject(player.playerId, 'not-overwritable');
      return;
    }
    if (cell.wrong && cell.value === op.value && cell.owner === player.playerId) {
      this.reject(player.playerId, 'no-op');
      return;
    }
    if (this.isNoOpFill(cell, op, player.playerId)) {
      this.reject(player.playerId, 'no-op');
      return;
    }
    const before = this.cloneCell(cell);
    if (RuleValidator.isCorrect(this.solution, op.index, op.value)) {
      const clearedNotes: { index: number; value: number }[] = [];
      for (const peer of this.peersOf(op.index)) {
        const peerCell = this.cells[peer];
        if (peerCell.notes.includes(op.value)) {
          peerCell.notes = peerCell.notes.filter((n) => n !== op.value);
          clearedNotes.push({ index: peer, value: op.value });
        }
      }
      if (cell.notes.includes(op.value)) {
        clearedNotes.push({ index: op.index, value: op.value });
      }
      cell.value = op.value;
      cell.given = false;
      cell.owner = player.playerId;
      cell.wrong = false;
      cell.notes = [];
      const after = this.cloneCell(cell);
      this.record(player, { op, cellIndex: op.index, before, after, clearedNotes });
      const completedUnits = this.completedUnitsFor(op.index);
      this.broadcast({
        type: 'opApplied',
        payload: {
          playerId: player.playerId,
          op,
          result: 'correct',
          cellIndex: op.index,
          cell: after,
          clearedNotes: clearedNotes.map((n) => n.index),
          completedUnits,
        },
      });
      if (RuleValidator.isComplete(this.boardValues(), this.solution)) {
        this.status = 'won';
        this.broadcast({
          type: 'gameWon',
          payload: { elapsedSeconds: Math.floor((Date.now() - this.startedAt) / 1000) },
        });
      }
    } else {
      cell.value = op.value;
      cell.given = false;
      cell.owner = player.playerId;
      cell.wrong = true;
      cell.notes = [];
      const after = this.cloneCell(cell);
      this.record(player, { op, cellIndex: op.index, before, after, clearedNotes: [] });
      player.mistakes += 1;
      this.broadcast({
        type: 'opApplied',
        payload: {
          playerId: player.playerId,
          op,
          result: 'wrong',
          cellIndex: op.index,
          cell: after,
          clearedNotes: [],
          completedUnits: [],
        },
      });
      if (player.mistakes >= 3) {
        player.spectating = true;
        this.broadcast({ type: 'playerLost', payload: { playerId: player.playerId } });
      }
    }
  }

  private handleErase(player: RoomPlayer, op: Extract<Op, { kind: 'erase' }>): void {
    const cell = this.cells[op.index];
    if (cell.given || cell.value === 0 || (!cell.wrong && cell.owner !== player.playerId)) {
      this.reject(player.playerId, 'not-erasable');
      return;
    }
    const before = this.cloneCell(cell);
    cell.value = 0;
    cell.owner = null;
    cell.wrong = false;
    const after = this.cloneCell(cell);
    this.record(player, { op, cellIndex: op.index, before, after, clearedNotes: [] });
    this.broadcast({
      type: 'opApplied',
      payload: {
        playerId: player.playerId,
        op,
        result: 'erased',
        cellIndex: op.index,
        cell: after,
        clearedNotes: [],
        completedUnits: [],
      },
    });
  }

  private handleNote(player: RoomPlayer, op: Extract<Op, { kind: 'note' }>): void {
    const cell = this.cells[op.index];
    if (cell.given || cell.value !== 0) {
      this.reject(player.playerId, 'invalid-note-cell');
      return;
    }
    const before = this.cloneCell(cell);
    if (cell.notes.includes(op.value)) {
      cell.notes = cell.notes.filter((n) => n !== op.value);
    } else {
      cell.notes = [...cell.notes, op.value].sort((a, b) => a - b);
    }
    const after = this.cloneCell(cell);
    this.record(player, { op, cellIndex: op.index, before, after, clearedNotes: [] });
    this.broadcast({
      type: 'opApplied',
      payload: {
        playerId: player.playerId,
        op,
        result: 'note',
        cellIndex: op.index,
        cell: after,
        clearedNotes: [],
        completedUnits: [],
      },
    });
  }

  private handleUndo(player: RoomPlayer): void {
    const record = player.undoStack.pop();
    if (!record) {
      this.reject(player.playerId, 'nothing-to-undo');
      return;
    }
    const restored: { index: number; value: number }[] = [];
    if (this.cellsEqual(this.cells[record.cellIndex], record.after)) {
      this.cells[record.cellIndex] = this.cloneCell(record.before);
      for (const entry of record.clearedNotes) {
        if (entry.index === record.cellIndex) continue;
        const cell = this.cells[entry.index];
        if (cell.value === 0 && !cell.notes.includes(entry.value)) {
          cell.notes = [...cell.notes, entry.value].sort((a, b) => a - b);
          restored.push({ index: entry.index, value: entry.value });
        }
      }
      if (record.after.wrong) {
        player.mistakes -= 1;
      }
    }
    player.redoStack.push(record);
    this.broadcast({
      type: 'opApplied',
      payload: {
        playerId: player.playerId,
        op: { kind: 'undo' },
        result: 'undone',
        cellIndex: record.cellIndex,
        cell: this.cloneCell(this.cells[record.cellIndex]),
        clearedNotes: [],
        completedUnits: [],
      },
    });
    for (const entry of restored) {
      this.broadcastNoteChange(player, entry.index, entry.value);
    }
  }

  private handleRedo(player: RoomPlayer): void {
    const record = player.redoStack.pop();
    if (!record) {
      this.reject(player.playerId, 'nothing-to-redo');
      return;
    }
    const cleared: { index: number; value: number }[] = [];
    if (this.cellsEqual(this.cells[record.cellIndex], record.before)) {
      this.cells[record.cellIndex] = this.cloneCell(record.after);
      for (const entry of record.clearedNotes) {
        if (entry.index === record.cellIndex) continue;
        const cell = this.cells[entry.index];
        if (cell.value === 0 && cell.notes.includes(entry.value)) {
          cell.notes = cell.notes.filter((n) => n !== entry.value);
          cleared.push({ index: entry.index, value: entry.value });
        }
      }
      if (record.after.wrong) {
        player.mistakes += 1;
      }
    }
    player.undoStack.push(record);
    this.broadcast({
      type: 'opApplied',
      payload: {
        playerId: player.playerId,
        op: { kind: 'redo' },
        result: 'redone',
        cellIndex: record.cellIndex,
        cell: this.cloneCell(this.cells[record.cellIndex]),
        clearedNotes: [],
        completedUnits: [],
      },
    });
    for (const entry of cleared) {
      this.broadcastNoteChange(player, entry.index, entry.value);
    }
  }

  private isNoOpFill(cell: CellEntry, op: Extract<Op, { kind: 'fill' }>, playerId: PlayerId): boolean {
    if (cell.value !== op.value || cell.wrong || cell.owner !== playerId) return false;
    if (cell.notes.length > 0) return false;
    for (const peer of this.peersOf(op.index)) {
      if (this.cells[peer].notes.includes(op.value)) return false;
    }
    return true;
  }

  private broadcastNoteChange(player: RoomPlayer, index: number, value: number): void {
    this.broadcast({
      type: 'opApplied',
      payload: {
        playerId: player.playerId,
        op: { kind: 'note', index, value },
        result: 'note',
        cellIndex: index,
        cell: this.cloneCell(this.cells[index]),
        clearedNotes: [],
        completedUnits: [],
      },
    });
  }

  private record(player: RoomPlayer, move: MoveRecord): void {
    player.undoStack.push(move);
    player.redoStack.length = 0;
  }

  private completedUnitsFor(index: number): { type: UnitType; index: number }[] {
    const row = Math.floor(index / 9);
    const col = index % 9;
    const box = Math.floor(row / 3) * 3 + Math.floor(col / 3);
    const units: { type: UnitType; index: number }[] = [
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
    return { value: cell.value, given: cell.given, owner: cell.owner, wrong: cell.wrong, notes: [...cell.notes] };
  }

  private cellsEqual(a: CellEntry, b: CellEntry): boolean {
    return (
      a.value === b.value &&
      a.given === b.given &&
      a.owner === b.owner &&
      a.wrong === b.wrong &&
      a.notes.length === b.notes.length &&
      a.notes.every((n, i) => n === b.notes[i])
    );
  }

  private playerInfo(player: RoomPlayer): { id: PlayerId; mistakes: number; spectating: boolean } {
    return { id: player.playerId, mistakes: player.mistakes, spectating: player.spectating };
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
