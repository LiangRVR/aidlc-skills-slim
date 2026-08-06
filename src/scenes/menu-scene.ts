import Phaser from 'phaser';
import type { GameController } from '../core/game-controller';
import type { Difficulty } from '../core/types';
import { SaveManager } from '../persistence/save-manager';

export class MenuScene extends Phaser.Scene {
  private controller!: GameController;

  constructor() {
    super('MenuScene');
  }

  create(): void {
    this.controller = this.registry.get('controller') as GameController;
    const { width, height } = this.scale;
    this.add
      .text(width / 2, height / 4, '数独', { fontFamily: 'Arial', fontSize: '64px', color: '#1565c0' })
      .setOrigin(0.5);

    let y = height / 2 - 40;
    const saveManager = new SaveManager();
    if (saveManager.hasSave()) {
      this.addButton(width / 2, y, '继续上次游戏', () => {
        const save = saveManager.load();
        if (save) {
          this.controller.continueGame(save);
          this.scene.start('GameScene');
        } else {
          this.scene.restart();
        }
      });
      y += 70;
    }

    this.addButton(width / 2, y, '新游戏', () => this.showDifficulty(y + 70));
  }

  private showDifficulty(startY: number): void {
    const { width } = this.scale;
    const options: { difficulty: Difficulty; label: string }[] = [
      { difficulty: 'easy', label: '简单' },
      { difficulty: 'medium', label: '中等' },
      { difficulty: 'hard', label: '困难' },
    ];
    options.forEach(({ difficulty, label }, i) => {
      this.addButton(width / 2, startY + i * 70, label, () => {
        this.controller.newGame(difficulty);
        this.scene.start('GameScene');
      });
    });
  }

  private addButton(x: number, y: number, label: string, onClick: () => void): void {
    const bg = this.add
      .rectangle(x, y, 240, 52, 0xffffff)
      .setStrokeStyle(2, 0x1565c0)
      .setInteractive({ useHandCursor: true });
    this.add.text(x, y, label, { fontFamily: 'Arial', fontSize: '22px', color: '#1565c0' }).setOrigin(0.5);
    bg.on('pointerdown', onClick);
    bg.on('pointerover', () => bg.setFillStyle(0xe3f2fd));
    bg.on('pointerout', () => bg.setFillStyle(0xffffff));
  }
}
