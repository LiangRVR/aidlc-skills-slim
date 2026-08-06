import Phaser from 'phaser';

export class ResultOverlay {
  private readonly container: Phaser.GameObjects.Container;

  constructor(scene: Phaser.Scene, width: number, height: number) {
    const bg = scene.add.rectangle(0, 0, width, height, 0x000000, 0.55).setOrigin(0).setInteractive();
    const panel = scene.add.rectangle(width / 2, height / 2, 360, 220, 0xffffff).setStrokeStyle(3, 0x424242);
    const title = scene.add
      .text(width / 2, height / 2 - 60, '', { fontFamily: 'Arial', fontSize: '34px', color: '#212121' })
      .setOrigin(0.5);
    const subtitle = scene.add
      .text(width / 2, height / 2 - 10, '', { fontFamily: 'Arial', fontSize: '20px', color: '#616161' })
      .setOrigin(0.5);
    const buttonBg = scene.add
      .rectangle(width / 2, height / 2 + 65, 160, 44, 0x1565c0)
      .setInteractive({ useHandCursor: true });
    const buttonLabel = scene.add
      .text(width / 2, height / 2 + 65, '', { fontFamily: 'Arial', fontSize: '20px', color: '#ffffff' })
      .setOrigin(0.5);
    this.container = scene.add
      .container(0, 0, [bg, panel, title, subtitle, buttonBg, buttonLabel])
      .setVisible(false)
      .setDepth(100);
    this.container.setData('title', title);
    this.container.setData('subtitle', subtitle);
    this.container.setData('buttonLabel', buttonLabel);
    this.container.setData('buttonBg', buttonBg);
  }

  show(title: string, subtitle: string, buttonLabel: string, onClick: () => void): void {
    (this.container.getData('title') as Phaser.GameObjects.Text).setText(title);
    (this.container.getData('subtitle') as Phaser.GameObjects.Text).setText(subtitle);
    (this.container.getData('buttonLabel') as Phaser.GameObjects.Text).setText(buttonLabel);
    const buttonBg = this.container.getData('buttonBg') as Phaser.GameObjects.Rectangle;
    buttonBg.removeAllListeners('pointerdown');
    buttonBg.on('pointerdown', onClick);
    this.container.setVisible(true);
  }

  hide(): void {
    this.container.setVisible(false);
  }
}
