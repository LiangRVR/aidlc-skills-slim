import Phaser from 'phaser';

export class JoinToast {
  private readonly scene: Phaser.Scene;
  private readonly x: number;
  private readonly y: number;
  private current: Phaser.GameObjects.Text | null = null;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.scene = scene;
    this.x = x;
    this.y = y;
  }

  show(text: string): void {
    this.current?.destroy();
    const toast = this.scene.add
      .text(this.x, this.y, text, {
        fontFamily: 'Arial',
        fontSize: '14px',
        color: '#2e7d32',
        backgroundColor: '#e8f5e9',
        padding: { x: 8, y: 4 },
      })
      .setOrigin(1, 0)
      .setDepth(90);
    this.current = toast;
    this.scene.tweens.add({
      targets: toast,
      alpha: 0,
      delay: 2500,
      duration: 500,
      onComplete: () => {
        if (this.current === toast) this.current = null;
        toast.destroy();
      },
    });
  }
}
