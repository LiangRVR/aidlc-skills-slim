import Phaser from 'phaser';
import { EventBus } from '../core/event-bus';
import { LocalGameController } from '../core/game-controller';
import type { Difficulty } from '../core/types';
import { OnlineGameController } from '../net/online-game-controller';
import { WebSocketClient } from '../net/ws-client';
import { SaveManager } from '../persistence/save-manager';

const DIFFICULTY_OPTIONS: { difficulty: Difficulty; label: string }[] = [
  { difficulty: 'easy', label: '简单' },
  { difficulty: 'medium', label: '中等' },
  { difficulty: 'hard', label: '困难' },
  { difficulty: 'expert', label: '专家' },
];

const SLIDE_DURATION = 280;

export class MenuScene extends Phaser.Scene {
  private controller!: LocalGameController;
  private page1!: Phaser.GameObjects.Container;
  private page2!: Phaser.GameObjects.Container;
  private statusText: Phaser.GameObjects.Text | null = null;
  private mode: 'local' | 'online' = 'local';
  private connecting = false;
  private sliding = false;

  constructor() {
    super('MenuScene');
  }

  create(): void {
    if (this.registry.get('mode') === 'online') {
      this.registry.set('controller', new LocalGameController());
      this.registry.set('mode', 'local');
      this.registry.set('onlineController', null);
    }
    this.controller = this.registry.get('controller') as LocalGameController;
    this.connecting = false;
    this.sliding = false;
    const { width, height } = this.scale;
    this.buildPage1(width, height);
    this.buildPage2(width, height);
  }

  private buildPage1(width: number, height: number): void {
    const children: Phaser.GameObjects.GameObject[] = [];
    children.push(
      this.add
        .text(width / 2, height / 4, '数独', { fontFamily: 'Arial', fontSize: '64px', color: '#1565c0' })
        .setOrigin(0.5),
    );
    const saveManager = new SaveManager();
    const hasSave = saveManager.hasSave();
    const totalButtons = (hasSave ? 1 : 0) + 2;
    let y = Math.max(height / 2 - ((totalButtons - 1) * 70) / 2, height / 4 + 90);
    if (hasSave) {
      children.push(
        ...this.makeButton(width / 2, y, '继续上次游戏', () => {
          const save = saveManager.load();
          if (save) {
            this.controller.continueGame(save);
            this.scene.start('GameScene');
          } else {
            this.scene.restart();
          }
        }),
      );
      y += 70;
    }
    children.push(...this.makeButton(width / 2, y, '本地游戏', () => this.slideToPage2('local')));
    children.push(...this.makeButton(width / 2, y + 70, '线上游戏', () => this.slideToPage2('online')));
    this.page1 = this.add.container(0, 0, children);
  }

  private buildPage2(width: number, height: number): void {
    const children: Phaser.GameObjects.GameObject[] = [];
    children.push(
      this.add
        .text(width / 2, height / 4, '选择难度', { fontFamily: 'Arial', fontSize: '40px', color: '#1565c0' })
        .setOrigin(0.5),
    );
    const startY = height / 4 + 80;
    DIFFICULTY_OPTIONS.forEach(({ difficulty, label }, i) => {
      children.push(
        ...this.makeButton(width / 2, startY + i * 70, label, () => {
          if (this.sliding || this.connecting) return;
          if (this.mode === 'local') {
            this.controller.newGame(difficulty);
            this.scene.start('GameScene');
          } else {
            this.startOnline(difficulty);
          }
        }),
      );
    });
    children.push(
      ...this.makeButton(width / 2, startY + 4 * 70 + 10, '返回', () => this.slideToPage1()),
    );
    this.statusText = this.add
      .text(width / 2, height - 30, '', { fontFamily: 'Arial', fontSize: '16px', color: '#d32f2f' })
      .setOrigin(0.5);
    children.push(this.statusText);
    this.page2 = this.add.container(width, 0, children);
  }

  private slideToPage2(mode: 'local' | 'online'): void {
    if (this.sliding) return;
    this.sliding = true;
    this.mode = mode;
    const { width } = this.scale;
    this.tweens.add({
      targets: this.page1,
      x: -width,
      duration: SLIDE_DURATION,
      ease: 'Cubic.easeInOut',
    });
    this.tweens.add({
      targets: this.page2,
      x: 0,
      duration: SLIDE_DURATION,
      ease: 'Cubic.easeInOut',
      onComplete: () => {
        this.sliding = false;
      },
    });
  }

  private slideToPage1(): void {
    if (this.sliding || this.connecting) return;
    this.sliding = true;
    const { width } = this.scale;
    this.statusText?.setText('');
    this.tweens.add({
      targets: this.page1,
      x: 0,
      duration: SLIDE_DURATION,
      ease: 'Cubic.easeInOut',
    });
    this.tweens.add({
      targets: this.page2,
      x: width,
      duration: SLIDE_DURATION,
      ease: 'Cubic.easeInOut',
      onComplete: () => {
        this.sliding = false;
      },
    });
  }

  private startOnline(difficulty: Difficulty): void {
    if (this.connecting) return;
    this.connecting = true;
    this.statusText?.setColor('#37474f');
    this.statusText?.setText('连接中…');
    const ws = new WebSocketClient();
    const hostname = typeof location !== 'undefined' ? location.hostname : 'localhost';
    ws.connect(`ws://${hostname}:8081`).then(
      () => {
        const online = new OnlineGameController(new EventBus(), ws);
        online.join(difficulty);
        this.registry.set('controller', online);
        this.registry.set('onlineController', online);
        this.registry.set('mode', 'online');
        this.scene.start('GameScene');
      },
      () => {
        this.connecting = false;
        this.statusText?.setColor('#d32f2f');
        this.statusText?.setText('无法连接到服务器，请确认服务已启动');
      },
    );
  }

  private makeButton(x: number, y: number, label: string, onClick: () => void): Phaser.GameObjects.GameObject[] {
    const bg = this.add
      .rectangle(x, y, 240, 52, 0xffffff)
      .setStrokeStyle(2, 0x1565c0)
      .setInteractive({ useHandCursor: true });
    const text = this.add
      .text(x, y, label, { fontFamily: 'Arial', fontSize: '22px', color: '#1565c0' })
      .setOrigin(0.5);
    bg.on('pointerdown', onClick);
    bg.on('pointerover', () => bg.setFillStyle(0xe3f2fd));
    bg.on('pointerout', () => bg.setFillStyle(0xffffff));
    return [bg, text];
  }
}
