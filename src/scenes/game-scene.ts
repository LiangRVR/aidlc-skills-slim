import Phaser from 'phaser';
import type { GameController } from '../core/game-controller';
import { RuleValidator } from '../core/rule-validator';
import { EVENTS, MAX_MISTAKES, type Difficulty } from '../core/types';
import { BoardView, BOARD_SIZE, type BoardSnapshot } from '../ui/board-view';
import { NumberPad } from '../ui/number-pad';
import { ControlBar, formatTime, type ControlAction } from '../ui/control-bar';
import { ResultOverlay } from '../ui/result-overlay';
import { VfxManager, type CompletedUnit } from '../ui/vfx-manager';

const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  easy: '简单',
  medium: '中等',
  hard: '困难',
};

export class GameScene extends Phaser.Scene {
  private controller!: GameController;
  private boardView!: BoardView;
  private numberPad!: NumberPad;
  private controlBar!: ControlBar;
  private overlay!: ResultOverlay;
  private vfx!: VfxManager;
  private timerEvent?: Phaser.Time.TimerEvent;
  private readonly onVisibility = (): void => {
    if (this.timerEvent) this.timerEvent.paused = document.hidden;
  };

  constructor() {
    super('GameScene');
  }

  create(): void {
    this.controller = this.registry.get('controller') as GameController;
    if (!this.controller.getState()) {
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
    this.subscribeBus();
    this.bindKeyboard();
    this.timerEvent = this.time.addEvent({
      delay: 1000,
      loop: true,
      callback: () => {
        if (this.controller.getState()?.getStatus() === 'playing') this.controller.tick(1);
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
  }

  private bindKeyboard(): void {
    this.input.keyboard?.on('keydown', (event: KeyboardEvent) => {
      if (event.key >= '1' && event.key <= '9') this.onDigitInput(Number(event.key));
      else if (event.key === 'Backspace' || event.key === 'Delete') this.controller.erase();
      else if (event.key === 'n' || event.key === 'N') this.controller.toggleNoteMode();
      else if (event.key === 'z' || event.key === 'Z') this.controller.undo();
      else if (event.key === 'y' || event.key === 'Y') this.controller.redo();
      else if (event.key === 'h' || event.key === 'H') this.controller.hint();
    });
  }

  private onAction(action: ControlAction): void {
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
        this.scene.start('MenuScene');
        break;
    }
  }

  private readonly renderAll = (): void => {
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
      mistakes: state.getMistakes(),
      maxMistakes: MAX_MISTAKES,
      canUndo: state.canUndo(),
      canRedo: state.canRedo(),
      noteMode: state.getNoteMode(),
      difficultyLabel: DIFFICULTY_LABELS[state.getDifficulty()],
    });
  };

  private onDigitInput(value: number): void {
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
    const state = this.controller.getState();
    this.overlay.show('胜利！', `用时 ${formatTime(state?.getElapsedSeconds() ?? 0)}`, '再来一局', () =>
      this.scene.start('MenuScene'),
    );
  };

  private readonly onLost = (): void => {
    this.overlay.show('失败', '错误次数已达上限', '重新开始', () => this.scene.start('MenuScene'));
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
    this.vfx.destroy();
    document.removeEventListener('visibilitychange', this.onVisibility);
  }
}
