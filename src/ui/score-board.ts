import Phaser from 'phaser';
import type { PlayerId } from '../../shared/protocol';
import { formatScoreLine } from './ui-text';

export class ScoreBoard {
  private readonly selfText: Phaser.GameObjects.Text;
  private readonly opponentText: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, centerX: number, y: number) {
    this.selfText = scene.add
      .text(centerX - 8, y, formatScoreLine('自己', 0), {
        fontFamily: 'Arial',
        fontSize: '16px',
        color: '#1565c0',
        fontStyle: 'bold',
      })
      .setOrigin(1, 0);
    this.opponentText = scene.add.text(centerX + 8, y, formatScoreLine('对方', 0), {
      fontFamily: 'Arial',
      fontSize: '16px',
      color: '#37474f',
    });
    const container = scene.add.container(0, 0, [this.selfText, this.opponentText]);
    container.setData('testid', 'score-board');
    this.selfText.setData('testid', 'score-board-self');
    this.opponentText.setData('testid', 'score-board-opponent');
  }

  update(scores: Record<PlayerId, number>, you: PlayerId): void {
    const opponentId = Object.keys(scores).find((id) => id !== you) ?? null;
    this.selfText.setText(formatScoreLine('自己', scores[you] ?? 0));
    this.opponentText.setText(formatScoreLine('对方', opponentId !== null ? scores[opponentId] ?? 0 : 0));
  }
}
