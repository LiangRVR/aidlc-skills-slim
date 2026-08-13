import Phaser from 'phaser';
import type { IGameController } from '../core/game-controller';
import { RuleValidator } from '../../shared/rule-validator';
import { EVENTS, type Difficulty } from '../core/types';
import type { OnlineGameController } from '../net/online-game-controller';
import { ONLINE_SCORES_EVENT } from '../net/online-game-controller';
import { BoardView, BOARD_SIZE, type BoardSnapshot } from '../ui/board-view';
import { NumberPad } from '../ui/number-pad';
import { ControlBar, formatTime, type ControlAction } from '../ui/control-bar';
import { ResultOverlay } from '../ui/result-overlay';
import { JoinToast } from '../ui/join-toast';
import { PlayerCountBadge } from '../ui/player-count-badge';
import { ScoreBoard } from '../ui/score-board';
import { GameOverOverlay } from '../ui/game-over-overlay';
import { VfxManager, type CompletedUnit } from '../ui/vfx-manager';
import type { PlayerId } from '../../shared/protocol';

const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  easy: '简单',
  medium: '中等',
  hard: '困难',
  expert: '专家',
};

export class GameScene extends Phaser.Scene {
  private controller!: IGameController;
  private online: OnlineGameController | null = null;
  private boardView!: BoardView;
  private numberPad!: NumberPad;
  private controlBar!: ControlBar;
  private overlay!: ResultOverlay;
  private vfx!: VfxManager;
  private badge: PlayerCountBadge | null = null;
  private toast: JoinToast | null = null;
  private scoreBoard: ScoreBoard | null = null;
  private gameOverOverlay: GameOverOverlay | null = null;
  private timerEvent?: Phaser.Time.TimerEvent;
  private readonly onVisibility = (): void => {
    if (this.timerEvent && !this.online) this.timerEvent.paused = document.hidden;
  };

  constructor() {
    super('GameScene');
  }

  create(): void {
    this.controller = this.registry.get('controller') as IGameController;
    this.online = (this.registry.get('onlineController') as OnlineGameController | null) ?? null;
    if (!this.online && !this.controller.getState()) {
      this.scene.start('MenuScene');
      return;
    }
    const { width, height } = this.scale;
    this.controlBar = new ControlBar(this, 4, 12, width - 8, (action) => this.onAction(action));
    this.boardView = new BoardView(this, (width - BOARD_SIZE) / 2, 100, (index) =>
      this.controller.selectCell(index),
    );
    this.vfx = new VfxManager(this, (width - BOARD_SIZE) / 2, 100);
    this.numberPad = new NumberPad(this, 4, 600, (value) => {
      if (value === 'erase') this.controller.erase();
      else this.onDigitInput(value);
    });
    this.overlay = new ResultOverlay(this, width, height);
    if (this.online) {
      this.badge = new PlayerCountBadge(this, width - 4, 34);
      this.toast = new JoinToast(this, width - 4, 58);
      this.scoreBoard = new ScoreBoard(this, width / 2, 14);
      this.gameOverOverlay = new GameOverOverlay(this, width, height);
    }
    this.subscribeBus();
    this.bindKeyboard();
    this.timerEvent = this.time.addEvent({
      delay: 1000,
      loop: true,
      callback: () => {
        if (this.online) {
          this.renderAll();
        } else if (this.controller.getState()?.getStatus() === 'playing') {
          this.controller.tick(1);
        }
      },
    });
    document.addEventListener('visibilitychange', this.onVisibility);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.cleanup());
    this.renderAll();
  }

  private subscribeBus(): void {
    const bus = this.controller.getBus();
    bus.on(EVENTS.STATE_CHANGED, this.renderAll);
    bus.on(EVENTS.CONFLICT_UPDATED, this.renderAll);
    bus.on(EVENTS.MISTAKES_CHANGED, this.renderAll);
    bus.on(EVENTS.TIMER_TICK, this.renderAll);
    bus.on(EVENTS.NOTE_MODE_CHANGED, this.renderAll);
    bus.on(EVENTS.GAME_WON, this.onWon);
    bus.on(EVENTS.GAME_LOST, this.onLost);
    if (this.online) {
      bus.on(EVENTS.VFX_CORRECT, this.onVfxCorrect);
      bus.on(EVENTS.CONNECTION_LOST, this.onConnectionLost);
      bus.on(EVENTS.ONLINE_PLAYER_JOINED, this.onPlayerJoined);
      bus.on(EVENTS.ONLINE_PLAYER_LEFT, this.onPlayerLeft);
      bus.on(EVENTS.ERROR_MESSAGE, this.onErrorMessage);
      bus.on(ONLINE_SCORES_EVENT, this.onScoresUpdated);
    }
  }

  private bindKeyboard(): void {
    this.input.keyboard?.on('keydown', (event: KeyboardEvent) => {
      if (this.controller.isReadOnly()) return;
      if (event.key >= '1' && event.key <= '9') this.onDigitInput(Number(event.key));
      else if (event.key === 'Backspace' || event.key === 'Delete') this.controller.erase();
      else if (event.key === 'n' || event.key === 'N') this.controller.toggleNoteMode();
      else if (event.key === 'z' || event.key === 'Z') this.controller.undo();
      else if (event.key === 'y' || event.key === 'Y') this.controller.redo();
      else if ((event.key === 'h' || event.key === 'H') && this.controller.capabilities().hint) this.controller.hint();
    });
  }

  private onAction(action: ControlAction): void {
    if (this.controller.isReadOnly() && action !== 'new') return;
    switch (action) {
      case 'undo':
        this.controller.undo();
        break;
      case 'redo':
        this.controller.redo();
        break;
      case 'hint':
        this.controller.hint();
        break;
      case 'note':
        this.controller.toggleNoteMode();
        break;
      case 'reset':
        this.overlay.hide();
        this.controller.reset();
        this.vfx.reset();
        break;
      case 'new':
        this.leaveAndMenu();
        break;
    }
  }

  private leaveAndMenu(): void {
    this.online?.leave();
    this.scene.start('MenuScene');
  }

  private readonly renderAll = (): void => {
    if (this.online) {
      this.renderOnline();
      return;
    }
    this.renderLocal();
  };

  private renderLocal(): void {
    const state = this.controller.getState();
    if (!state) return;
    const board = state.getBoard();
    const solution = state.getPuzzle().solution;
    const conflicts = new Set<number>();
    const wrongCells = new Set<number>();
    for (let i = 0; i < 81; i++) {
      if (board[i] === 0) continue;
      for (const c of RuleValidator.conflictsAt(board, i)) conflicts.add(c);
      if (RuleValidator.conflictsAt(board, i).length > 0) conflicts.add(i);
      if (!state.isGivenCell(i) && board[i] !== solution[i]) wrongCells.add(i);
    }
    const snapshot: BoardSnapshot = {
      board,
      notes: state.getNotes(),
      isGiven: (index) => state.isGivenCell(index),
      selectedIndex: state.getSelectedIndex(),
      conflicts,
      wrongCells,
    };
    this.boardView.render(snapshot);
    const completedDigits = new Set<number>();
    for (let d = 1; d <= 9; d++) {
      let placed = 0;
      for (let i = 0; i < 81; i++) if (solution[i] === d && board[i] === d) placed++;
      if (placed === 9) completedDigits.add(d);
    }
    this.numberPad.setDisabledDigits(completedDigits);
    this.numberPad.setNoteMode(state.getNoteMode());
    this.controlBar.render({
      elapsedSeconds: state.getElapsedSeconds(),
      canUndo: state.canUndo(),
      canRedo: state.canRedo(),
      noteMode: state.getNoteMode(),
      difficultyLabel: DIFFICULTY_LABELS[state.getDifficulty()],
    });
  }

  private renderOnline(): void {
    const online = this.online;
    if (!online || !online.isInitialized()) return;
    const snapshot = online.snapshot();
    this.boardView.render(snapshot);
    const completedDigits = new Set<number>();
    for (let d = 1; d <= 9; d++) {
      let placed = 0;
      for (let i = 0; i < 81; i++) {
        if (snapshot.board[i] === d && !snapshot.wrongCells.has(i)) placed++;
      }
      if (placed === 9) completedDigits.add(d);
    }
    this.numberPad.setDisabledDigits(completedDigits);
    this.numberPad.setNoteMode(online.getNoteMode());
    this.controlBar.render({
      elapsedSeconds: online.getElapsedSeconds(),
      canUndo: !online.isReadOnly(),
      canRedo: !online.isReadOnly(),
      noteMode: online.getNoteMode(),
      difficultyLabel: DIFFICULTY_LABELS[online.getDifficulty()],
      capabilities: online.capabilities(),
      newButtonLabel: '菜单',
    });
    this.badge?.setCount(online.getPlayerCount());
  }

  private onDigitInput(value: number): void {
    if (this.online) {
      this.controller.inputDigit(value as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9);
      return;
    }
    const outcome = this.controller.inputDigit(value as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9);
    if (!outcome) return;
    if (outcome.result === 'correct') {
      this.vfx.playCorrect(outcome.index, this.completedUnitsOf(outcome.index));
    } else if (outcome.result === 'wrong') {
      this.vfx.playWrong(outcome.index);
    }
  }

  private completedUnitsOf(index: number): CompletedUnit[] {
    const state = this.controller.getState();
    if (!state) return [];
    const board = state.getBoard();
    const solution = state.getPuzzle().solution;
    const filled = (i: number): boolean => board[i] !== 0 && board[i] === solution[i];
    const row = Math.floor(index / 9);
    const col = index % 9;
    const units: CompletedUnit[] = [];
    if (Array.from({ length: 9 }, (_, k) => row * 9 + k).every(filled)) units.push('row');
    if (Array.from({ length: 9 }, (_, k) => k * 9 + col).every(filled)) units.push('col');
    const br = Math.floor(row / 3) * 3;
    const bc = Math.floor(col / 3) * 3;
    const boxCells: number[] = [];
    for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) boxCells.push((br + r) * 9 + (bc + c));
    if (boxCells.every(filled)) units.push('box');
    return units;
  }

  private readonly onWon = (): void => {
    if (this.online) {
      const data = this.online.getGameOverData();
      const you = this.online.snapshot().you;
      if (data && you && this.gameOverOverlay) {
        this.gameOverOverlay.show(data, you, () => this.leaveAndMenu());
      }
      return;
    }
    const state = this.controller.getState();
    this.overlay.show('胜利！', `用时 ${formatTime(state?.getElapsedSeconds() ?? 0)}`, '再来一局', () =>
      this.scene.start('MenuScene'),
    );
  };

  private readonly onLost = (): void => {
    if (this.online) return;
    this.overlay.show('失败', '错误次数已达上限', '重新开始', () => this.scene.start('MenuScene'));
  };

  private readonly onVfxCorrect = (payload?: unknown): void => {
    const data = payload as { index: number; completedUnits: CompletedUnit[] };
    this.vfx.playCorrect(data.index, data.completedUnits);
  };

  private readonly onConnectionLost = (): void => {
    this.overlay.show('连接已断开', '', '返回主菜单', () => this.leaveAndMenu());
  };

  private readonly onPlayerJoined = (): void => {
    this.toast?.show('有玩家加入');
  };

  private readonly onPlayerLeft = (): void => {
    this.toast?.show('对方已离开');
  };

  private readonly onScoresUpdated = (payload?: unknown): void => {
    const data = payload as { scores: Record<PlayerId, number>; you: PlayerId };
    this.scoreBoard?.update(data.scores, data.you);
  };

  private readonly onErrorMessage = (payload?: unknown): void => {
    this.toast?.show(String(payload ?? ''));
  };

  private cleanup(): void {
    const bus = this.controller.getBus();
    bus.off(EVENTS.STATE_CHANGED, this.renderAll);
    bus.off(EVENTS.CONFLICT_UPDATED, this.renderAll);
    bus.off(EVENTS.MISTAKES_CHANGED, this.renderAll);
    bus.off(EVENTS.TIMER_TICK, this.renderAll);
    bus.off(EVENTS.NOTE_MODE_CHANGED, this.renderAll);
    bus.off(EVENTS.GAME_WON, this.onWon);
    bus.off(EVENTS.GAME_LOST, this.onLost);
    bus.off(EVENTS.VFX_CORRECT, this.onVfxCorrect);
    bus.off(EVENTS.CONNECTION_LOST, this.onConnectionLost);
    bus.off(EVENTS.ONLINE_PLAYER_JOINED, this.onPlayerJoined);
    bus.off(EVENTS.ONLINE_PLAYER_LEFT, this.onPlayerLeft);
    bus.off(EVENTS.ERROR_MESSAGE, this.onErrorMessage);
    bus.off(ONLINE_SCORES_EVENT, this.onScoresUpdated);
    this.vfx.destroy();
    document.removeEventListener('visibilitychange', this.onVisibility);
  }
}
