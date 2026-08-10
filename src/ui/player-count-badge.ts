import Phaser from 'phaser';
import { formatPlayerCount } from './ui-text';

export class PlayerCountBadge {
  private readonly text: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.text = scene.add
      .text(x, y, formatPlayerCount(1), { fontFamily: 'Arial', fontSize: '16px', color: '#37474f' })
      .setOrigin(1, 0);
  }

  setCount(n: number): void {
    this.text.setText(formatPlayerCount(n));
  }
}
