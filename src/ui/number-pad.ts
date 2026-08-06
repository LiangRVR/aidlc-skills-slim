import Phaser from 'phaser';

const BUTTON_WIDTH = 46;
const BUTTON_HEIGHT = 52;
const BUTTON_GAP = 8;

export class NumberPad {
  private readonly buttons: { bg: Phaser.GameObjects.Rectangle; label: Phaser.GameObjects.Text }[] = [];
  private readonly modeLabel: Phaser.GameObjects.Text;
  private noteMode = false;
  private disabledDigits = new Set<number>();

  constructor(scene: Phaser.Scene, x: number, y: number, onInput: (value: number | 'erase') => void) {
    for (let i = 0; i < 10; i++) {
      const bx = x + i * (BUTTON_WIDTH + BUTTON_GAP) + BUTTON_WIDTH / 2;
      const by = y + BUTTON_HEIGHT / 2;
      const isErase = i === 9;
      const bg = scene.add
        .rectangle(bx, by, BUTTON_WIDTH, BUTTON_HEIGHT, 0xffffff)
        .setStrokeStyle(2, 0x90a4ae)
        .setInteractive({ useHandCursor: true });
      const label = scene.add
        .text(bx, by, isErase ? '清除' : String(i + 1), {
          fontFamily: 'Arial',
          fontSize: isErase ? '16px' : '22px',
          color: '#1565c0',
        })
        .setOrigin(0.5);
      const value: number | 'erase' = isErase ? 'erase' : i + 1;
      bg.on('pointerdown', () => onInput(value));
      bg.on('pointerover', () => bg.setFillStyle(this.noteMode ? 0x1565c0 : 0xe3f2fd));
      bg.on('pointerout', () => this.applyStyle());
      this.buttons.push({ bg, label });
    }
    this.modeLabel = scene.add
      .text(x + 10 * BUTTON_WIDTH + 9 * BUTTON_GAP, y - 14, '笔记模式', {
        fontFamily: 'Arial',
        fontSize: '14px',
        color: '#1565c0',
      })
      .setOrigin(1, 1)
      .setVisible(false);
  }

  setNoteMode(on: boolean): void {
    this.noteMode = on;
    this.modeLabel.setVisible(on);
    this.applyStyle();
  }

  setDisabledDigits(digits: Set<number>): void {
    this.disabledDigits = new Set(digits);
    this.applyStyle();
  }

  private applyStyle(): void {
    this.buttons.forEach(({ bg, label }, i) => {
      if (i < 9 && this.disabledDigits.has(i + 1)) {
        bg.setFillStyle(0xe0e0e0).setStrokeStyle(2, 0xbdbdbd).disableInteractive();
        label.setColor('#9e9e9e');
        return;
      }
      bg.setInteractive({ useHandCursor: true });
      if (this.noteMode) {
        bg.setFillStyle(0x1565c0).setStrokeStyle(3, 0x0d47a1);
        label.setColor('#ffffff');
      } else {
        bg.setFillStyle(0xffffff).setStrokeStyle(2, 0x90a4ae);
        label.setColor('#1565c0');
      }
    });
  }
}
