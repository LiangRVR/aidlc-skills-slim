import Phaser from 'phaser';

export type ControlAction = 'undo' | 'redo' | 'hint' | 'note' | 'new' | 'reset';

export interface ControlBarInfo {
  elapsedSeconds: number;
  mistakes: number;
  maxMistakes: number;
  canUndo: boolean;
  canRedo: boolean;
  noteMode: boolean;
  difficultyLabel: string;
  capabilities?: { hint: boolean; reset: boolean; newGame: boolean };
  newButtonLabel?: string;
}

const ACTIONS: { action: ControlAction; label: string }[] = [
  { action: 'undo', label: '撤销' },
  { action: 'redo', label: '重做' },
  { action: 'hint', label: '提示' },
  { action: 'note', label: '笔记' },
  { action: 'reset', label: '重开' },
  { action: 'new', label: '新游戏' },
];

export function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export class ControlBar {
  private readonly timerText: Phaser.GameObjects.Text;
  private readonly mistakesText: Phaser.GameObjects.Text;
  private readonly difficultyText: Phaser.GameObjects.Text;
  private readonly buttons = new Map<ControlAction, { bg: Phaser.GameObjects.Rectangle; label: Phaser.GameObjects.Text }>();

  constructor(scene: Phaser.Scene, x: number, y: number, width: number, onAction: (action: ControlAction) => void) {
    this.timerText = scene.add.text(x, y, '时间 00:00', { fontFamily: 'Arial', fontSize: '18px', color: '#37474f' });
    this.mistakesText = scene.add
      .text(x + width / 2, y, '错误 0/3', { fontFamily: 'Arial', fontSize: '18px', color: '#37474f' })
      .setOrigin(0.5, 0);
    this.difficultyText = scene.add
      .text(x + width, y, '', { fontFamily: 'Arial', fontSize: '18px', color: '#37474f' })
      .setOrigin(1, 0);
    const bw = 82;
    const gap = (width - ACTIONS.length * bw) / (ACTIONS.length - 1);
    ACTIONS.forEach(({ action, label }, i) => {
      const bx = x + i * (bw + gap) + bw / 2;
      const by = y + 62;
      const bg = scene.add
        .rectangle(bx, by, bw, 36, 0xffffff)
        .setStrokeStyle(2, 0x90a4ae)
        .setInteractive({ useHandCursor: true });
      const text = scene.add
        .text(bx, by, label, { fontFamily: 'Arial', fontSize: '16px', color: '#37474f' })
        .setOrigin(0.5);
      bg.on('pointerdown', () => onAction(action));
      this.buttons.set(action, { bg, label: text });
    });
  }

  render(info: ControlBarInfo): void {
    this.timerText.setText(`时间 ${formatTime(info.elapsedSeconds)}`);
    this.mistakesText.setText(`错误 ${info.mistakes}/${info.maxMistakes}`);
    this.difficultyText.setText(info.difficultyLabel);
    this.setEnabled('undo', info.canUndo);
    this.setEnabled('redo', info.canRedo);
    if (info.capabilities) {
      this.setEnabled('hint', info.capabilities.hint);
      this.setEnabled('reset', info.capabilities.reset);
    }
    const newButton = this.buttons.get('new');
    if (newButton && info.newButtonLabel) {
      newButton.label.setText(info.newButtonLabel);
    }
    const note = this.buttons.get('note');
    if (note) {
      note.bg.setFillStyle(info.noteMode ? 0x1565c0 : 0xffffff);
      note.label.setColor(info.noteMode ? '#ffffff' : '#37474f');
    }
  }

  private setEnabled(action: ControlAction, enabled: boolean): void {
    const button = this.buttons.get(action);
    if (!button) return;
    button.bg.setAlpha(enabled ? 1 : 0.4);
    button.label.setAlpha(enabled ? 1 : 0.4);
    if (enabled) button.bg.setInteractive({ useHandCursor: true });
    else button.bg.disableInteractive();
  }
}
