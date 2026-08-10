import { EventBus } from '../core/event-bus';
import type { ControllerCapabilities, IGameController } from '../core/game-controller';
import type { GameState } from '../core/game-state';
import { EVENTS, type CellIndex, type CellValue, type Difficulty, type GameSave } from '../core/types';
import type { BoardSnapshot } from '../ui/board-view';
import type { CellEntry, Op, PlayerId, PlayerInfo, ServerMessage } from '../../shared/protocol';
import type { WsTransport } from './ws-client';

interface MirrorState {
  cells: CellEntry[];
  players: PlayerInfo[];
  startedAt: number;
  status: 'playing' | 'won';
  you: PlayerId;
  difficulty: Difficulty;
}

export class OnlineGameController implements IGameController {
  private readonly bus: EventBus;
  private readonly ws: WsTransport;
  private mirror: MirrorState | null = null;
  private selectedIndex: CellIndex | null = null;
  private noteMode = false;
  private myMistakes = 0;
  private selfSpectating = false;
  private disconnected = false;
  private voluntaryClose = false;
  private wonElapsedSeconds = 0;
  private pendingDifficulty: Difficulty = 'medium';

  constructor(bus: EventBus, ws: WsTransport) {
    this.bus = bus;
    this.ws = ws;
    this.ws.onMessage((msg) => this.applyServerMessage(msg));
    this.ws.onClose(() => {
      if (this.voluntaryClose) return;
      this.disconnected = true;
      this.bus.emit(EVENTS.CONNECTION_LOST);
      this.bus.emit(EVENTS.STATE_CHANGED);
    });
  }

  join(difficulty: Difficulty): void {
    this.pendingDifficulty = difficulty;
    this.ws.send({ type: 'join', payload: { difficulty } });
  }

  leave(): void {
    this.voluntaryClose = true;
    this.ws.send({ type: 'leave', payload: {} });
    this.ws.close();
  }

  getState(): GameState | null {
    return null;
  }

  getBus(): EventBus {
    return this.bus;
  }

  newGame(_difficulty: Difficulty): void {}
  continueGame(_save: GameSave): void {}
  hint(): void {}
  reset(): void {}
  tick(_seconds: number): void {}

  inputDigit(value: CellValue): null {
    if (this.isReadOnly() || !this.mirror || this.mirror.status !== 'playing') return null;
    if (this.selectedIndex === null || value < 1 || value > 9) return null;
    const op: Op = this.noteMode
      ? { kind: 'note', index: this.selectedIndex, value }
      : { kind: 'fill', index: this.selectedIndex, value };
    this.ws.send({ type: 'op', payload: { op } });
    return null;
  }

  erase(): void {
    if (this.isReadOnly() || this.selectedIndex === null) return;
    this.ws.send({ type: 'op', payload: { op: { kind: 'erase', index: this.selectedIndex } } });
  }

  undo(): void {
    if (this.isReadOnly()) return;
    this.ws.send({ type: 'op', payload: { op: { kind: 'undo' } } });
  }

  redo(): void {
    if (this.isReadOnly()) return;
    this.ws.send({ type: 'op', payload: { op: { kind: 'redo' } } });
  }

  toggleNoteMode(): void {
    if (this.isReadOnly()) return;
    this.noteMode = !this.noteMode;
    this.bus.emit(EVENTS.NOTE_MODE_CHANGED, this.noteMode);
  }

  selectCell(index: CellIndex | null): void {
    this.selectedIndex = index;
    this.bus.emit(EVENTS.STATE_CHANGED);
  }

  isReadOnly(): boolean {
    return this.selfSpectating || this.disconnected;
  }

  capabilities(): ControllerCapabilities {
    return { hint: false, reset: false, newGame: false };
  }

  isInitialized(): boolean {
    return this.mirror !== null;
  }

  getNoteMode(): boolean {
    return this.noteMode;
  }

  getMyMistakes(): number {
    return this.myMistakes;
  }

  getElapsedSeconds(): number {
    if (!this.mirror) return 0;
    return Math.max(0, Math.floor((Date.now() - this.mirror.startedAt) / 1000));
  }

  getWonElapsedSeconds(): number {
    return this.wonElapsedSeconds;
  }

  getDifficulty(): Difficulty {
    return this.mirror?.difficulty ?? this.pendingDifficulty;
  }

  getStatus(): 'playing' | 'won' {
    return this.mirror?.status ?? 'playing';
  }

  getPlayerCount(): number {
    return this.mirror?.players.length ?? 1;
  }

  isSelfSpectating(): boolean {
    return this.selfSpectating;
  }

  snapshot(): BoardSnapshot {
    const mirror = this.mirror;
    if (!mirror) {
      return {
        board: Array.from({ length: 81 }, () => 0),
        notes: Array.from({ length: 81 }, () => []),
        isGiven: () => false,
        selectedIndex: null,
        conflicts: new Set<number>(),
        wrongCells: new Set<number>(),
        owners: Array.from({ length: 81 }, () => null),
        you: null,
      };
    }
    const wrongCells = new Set<number>();
    for (let i = 0; i < 81; i++) {
      if (mirror.cells[i].wrong) wrongCells.add(i);
    }
    return {
      board: mirror.cells.map((c) => c.value),
      notes: mirror.cells.map((c) => [...c.notes]),
      isGiven: (index: number) => mirror.cells[index].given,
      selectedIndex: this.selectedIndex,
      conflicts: new Set<number>(),
      wrongCells,
      owners: mirror.cells.map((c) => c.owner),
      you: mirror.you,
    };
  }

  applyServerMessage(msg: ServerMessage): void {
    switch (msg.type) {
      case 'joined': {
        const s = msg.payload;
        this.mirror = {
          cells: s.cells.map((c) => ({ ...c, notes: [...c.notes] })),
          players: s.players.map((p) => ({ ...p })),
          startedAt: s.startedAt,
          status: s.status,
          you: s.you,
          difficulty: s.difficulty,
        };
        const me = this.mirror.players.find((p) => p.id === s.you);
        this.myMistakes = me?.mistakes ?? 0;
        this.selfSpectating = me?.spectating ?? false;
        this.bus.emit(EVENTS.STATE_CHANGED);
        break;
      }
      case 'opApplied': {
        const mirror = this.mirror;
        if (!mirror) return;
        const p = msg.payload;
        const beforeCell = mirror.cells[p.cellIndex];
        const wasMyWrongCell = beforeCell.wrong && beforeCell.owner === mirror.you;
        if (p.result === 'correct' && p.op.kind === 'fill') {
          const fillValue = p.op.value;
          for (const idx of p.clearedNotes) {
            const c = mirror.cells[idx];
            if (idx !== p.cellIndex && c.value === 0 && c.notes.includes(fillValue)) {
              c.notes = c.notes.filter((n) => n !== fillValue);
            }
          }
        }
        mirror.cells[p.cellIndex] = { ...p.cell, notes: [...p.cell.notes] };
        if (p.playerId === mirror.you) {
          if (p.result === 'correct') {
            this.bus.emit(EVENTS.VFX_CORRECT, { index: p.cellIndex, completedUnits: p.completedUnits.map((u) => u.type) });
          } else if (p.result === 'wrong') {
            this.myMistakes += 1;
            this.bus.emit(EVENTS.VFX_WRONG, { index: p.cellIndex });
          } else if (p.result === 'undone' && wasMyWrongCell) {
            this.myMistakes = Math.max(0, this.myMistakes - 1);
          }
        }
        this.bus.emit(EVENTS.STATE_CHANGED);
        break;
      }
      case 'opRejected':
        break;
      case 'playerJoined': {
        const mirror = this.mirror;
        if (!mirror) return;
        if (!mirror.players.some((pl) => pl.id === msg.payload.player.id)) {
          mirror.players.push({ ...msg.payload.player });
        }
        this.bus.emit(EVENTS.ONLINE_PLAYER_JOINED);
        this.bus.emit(EVENTS.STATE_CHANGED);
        break;
      }
      case 'playerLeft': {
        const mirror = this.mirror;
        if (!mirror) return;
        mirror.players = mirror.players.filter((pl) => pl.id !== msg.payload.playerId);
        this.bus.emit(EVENTS.ONLINE_PLAYER_LEFT);
        this.bus.emit(EVENTS.STATE_CHANGED);
        break;
      }
      case 'playerLost': {
        const mirror = this.mirror;
        if (!mirror) return;
        const target = mirror.players.find((pl) => pl.id === msg.payload.playerId);
        if (target) target.spectating = true;
        if (msg.payload.playerId === mirror.you) {
          this.selfSpectating = true;
        } else {
          this.bus.emit(EVENTS.ONLINE_OPPONENT_LOST);
        }
        this.bus.emit(EVENTS.STATE_CHANGED);
        break;
      }
      case 'gameWon': {
        const mirror = this.mirror;
        if (!mirror) return;
        mirror.status = 'won';
        this.wonElapsedSeconds = msg.payload.elapsedSeconds;
        this.bus.emit(EVENTS.GAME_WON);
        this.bus.emit(EVENTS.STATE_CHANGED);
        break;
      }
      case 'error':
        this.bus.emit(EVENTS.ERROR_MESSAGE, msg.payload.message);
        break;
    }
  }
}
