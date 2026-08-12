import Phaser from 'phaser';
import type { PlayerId } from '../../shared/protocol';
import type { GameOverData } from '../net/online-game-controller';
import { formatTime } from './control-bar';
import { formatScoreLine } from './ui-text';

export class GameOverOverlay {
  private readonly container: Phaser.GameObjects.Container;
  private readonly titleText: Phaser.GameObjects.Text;
  private readonly subtitleText: Phaser.GameObjects.Text;
  private readonly scoresText: Phaser.GameObjects.Text;
  private readonly timeText: Phaser.GameObjects.Text;
  private readonly buttonBg: Phaser.GameObjects.Rectangle;

  constructor(scene: Phaser.Scene, width: number, height: number) {
    const bg = scene.add.rectangle(0, 0, width, height, 0x000000, 0.55).setOrigin(0).setInteractive();
    const panel = scene.add.rectangle(width / 2, height / 2, 360, 240, 0xffffff).setStrokeStyle(3, 0x424242);
    this.titleText = scene.add
      .text(width / 2, height / 2 - 80, '', { fontFamily: 'Arial', fontSize: '34px', color: '#212121' })
      .setOrigin(0.5);
    this.subtitleText = scene.add
      .text(width / 2, height / 2 - 35, '', { fontFamily: 'Arial', fontSize: '20px', color: '#d32f2f' })
      .setOrigin(0.5);
    this.scoresText = scene.add
      .text(width / 2, height / 2 + 2, '', {
        fontFamily: 'Arial',
        fontSize: '18px',
        color: '#37474f',
        align: 'center',
      })
      .setOrigin(0.5);
    this.timeText = scene.add
      .text(width / 2, height / 2 + 52, '', { fontFamily: 'Arial', fontSize: '16px', color: '#616161' })
      .setOrigin(0.5);
    this.buttonBg = scene.add
      .rectangle(width / 2, height / 2 + 92, 160, 44, 0x1565c0)
      .setInteractive({ useHandCursor: true });
    const buttonLabel = scene.add
      .text(width / 2, height / 2 + 92, '返回主菜单', { fontFamily: 'Arial', fontSize: '20px', color: '#ffffff' })
      .setOrigin(0.5);
    this.container = scene.add
      .container(0, 0, [bg, panel, this.titleText, this.subtitleText, this.scoresText, this.timeText, this.buttonBg, buttonLabel])
      .setVisible(false)
      .setDepth(100);
    this.container.setData('testid', 'game-over-overlay');
    this.titleText.setData('testid', 'game-over-title');
    this.scoresText.setData('testid', 'game-over-scores');
    this.timeText.setData('testid', 'game-over-time');
    this.buttonBg.setData('testid', 'game-over-back-button');
  }

  show(data: GameOverData, you: PlayerId, onBack: () => void): void {
    this.titleText.setText(data.winnerId === you ? '你赢了' : data.winnerId === null ? '平局' : '你输了');
    this.subtitleText.setText(data.reason === 'forfeit' ? '对方已离开' : '');
    const opponentId = Object.keys(data.scores).find((id) => id !== you) ?? null;
    this.scoresText.setText(
      `${formatScoreLine('自己', data.scores[you] ?? 0)}\n${formatScoreLine('对方', opponentId !== null ? data.scores[opponentId] ?? 0 : 0)}`,
    );
    this.timeText.setText(`用时 ${formatTime(data.elapsedSeconds)}`);
    this.buttonBg.removeAllListeners('pointerdown');
    this.buttonBg.on('pointerdown', onBack);
    this.container.setVisible(true);
  }
}
