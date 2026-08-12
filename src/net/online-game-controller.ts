import { EventBus } from '../core/event-bus';
import type { ControllerCapabilities, IGameController } from '../core/game-controller';
import type { GameState } from '../core/game-state';
import { EVENTS, type CellIndex, type CellValue, type Difficulty, type GameSave } from '../core/types';
import type { BoardSnapshot } from '../ui/board-view';
import type { CellEntry, Op, PlayerId, PlayerInfo, ServerMessage } from '../../shared/protocol';
import type { WsTransport } from './ws-client';

/** ScoreBoard 数据更新事件（joined 与每条 opApplied 后派发；payload: { scores, you }） */
export const ONLINE_SCORES_EVENT = 'online:scores';

export interface GameOverData {
  winnerId: PlayerId | null;
  reason: 'completed' | 'forfeit';
  scores: Record<PlayerId, number>;
  elapsedSeconds: number;
}

interface MirrorState {
  cells: CellEntry[];
  ownNotes: Map<number, Set<number>>;
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
  private disconnected = false;
  private voluntaryClose = false;
  private gameOverData: GameOverData | null = null;
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
    return this.disconnected || this.mirror?.status === 'won';
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

  getElapsedSeconds(): number {
    if (this.gameOverData) return this.gameOverData.elapsedSeconds;
    if (!this.mirror) return 0;
    return Math.max(0, Math.floor((Date.now() - this.mirror.startedAt) / 1000));
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

  getGameOverData(): GameOverData | null {
    return this.gameOverData;
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
    const notes: number[][] = Array.from({ length: 81 }, () => []);
    for (const [index, set] of mirror.ownNotes) {
      notes[index] = Array.from(set);
    }
    return {
      board: mirror.cells.map((c) => c.value),
      notes,
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
        const ownNotes = new Map<number, Set<number>>();
        for (const key of Object.keys(s.yourNotes)) {
          const index = Number(key);
          ownNotes.set(index, new Set(s.yourNotes[index]));
        }
        this.mirror = {
          cells: s.cells.map((c) => ({ ...c })),
          ownNotes,
          players: s.players.map((p) => ({ ...p })),
          startedAt: s.startedAt,
          status: s.status,
          you: s.you,
          difficulty: s.difficulty,
        };
        this.bus.emit(EVENTS.STATE_CHANGED);
        this.emitScores(this.scoresFrom(s.players));
        break;
      }
      case 'opApplied': {
        const mirror = this.mirror;
        if (!mirror) return;
        const p = msg.payload;
        if (p.result === 'note') {
          // 私有部分：notes → 整格替换自己的笔记（BR-C-15）
          if (p.op.kind === 'note') {
            const index = p.op.index;
            if (p.notes.length === 0) mirror.ownNotes.delete(index);
            else mirror.ownNotes.set(index, new Set(p.notes));
          }
        } else {
          // 公共部分：应用格子变化
          mirror.cells[p.cellIndex] = { ...p.cell };
          if (p.cell.value !== 0) mirror.ownNotes.delete(p.cellIndex);
        }
        // 私有部分：clearedNotes 条目化——correct/redone 移除该数字；undone 恢复该数字（BR-C-15 v2.1）
        if (p.clearedNotes) {
          for (const entry of p.clearedNotes) {
            if (p.result === 'undone') {
              if (mirror.cells[entry.index].value !== 0) continue;
              let set = mirror.ownNotes.get(entry.index);
              if (!set) {
                set = new Set();
                mirror.ownNotes.set(entry.index, set);
              }
              set.add(entry.value);
            } else {
              const set = mirror.ownNotes.get(entry.index);
              if (set) {
                set.delete(entry.value);
                if (set.size === 0) mirror.ownNotes.delete(entry.index);
              }
            }
          }
        }
        // 公共部分：scores → 更新 players 镜像与 ScoreBoard
        for (const player of mirror.players) {
          const score = p.scores[player.id];
          if (score !== undefined) player.score = score;
        }
        this.emitScores(p.scores);
        // 仅自己 correct 派发本地 VFX（BR-C-03，含 completedUnits）
        if (p.playerId === mirror.you && p.result === 'correct') {
          this.bus.emit(EVENTS.VFX_CORRECT, {
            index: p.cellIndex,
            completedUnits: p.completedUnits.map((u) => u.type),
          });
        }
        this.bus.emit(EVENTS.STATE_CHANGED);
        break;
      }
      case 'opRejected':
        console.log('op rejected:', msg.payload.reason);
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
      case 'gameOver': {
        const mirror = this.mirror;
        if (!mirror) return;
        const p = msg.payload;
        this.gameOverData = {
          winnerId: p.winnerId,
          reason: p.reason,
          scores: { ...p.scores },
          elapsedSeconds: p.elapsedSeconds,
        };
        mirror.status = 'won';
        this.bus.emit(EVENTS.GAME_WON);
        this.bus.emit(EVENTS.STATE_CHANGED);
        break;
      }
      case 'error':
        this.bus.emit(EVENTS.ERROR_MESSAGE, msg.payload.message);
        break;
    }
  }

  private emitScores(scores: Record<PlayerId, number>): void {
    const mirror = this.mirror;
    if (!mirror) return;
    this.bus.emit(ONLINE_SCORES_EVENT, { scores: { ...scores }, you: mirror.you });
  }

  private scoresFrom(players: PlayerInfo[]): Record<PlayerId, number> {
    const out: Record<PlayerId, number> = {};
    for (const p of players) out[p.id] = p.score;
    return out;
  }
}
