import Phaser from 'phaser';
import { BOARD_SIZE, CELL_SIZE } from './board-view';

export type CompletedUnit = 'row' | 'col' | 'box';

const TIER_COLORS = [0x42a5f5, 0xffb300, 0xff7043, 0xab47bc];
const TIER_BURST = [12, 20, 30, 44];

export class VfxManager {
  private readonly scene: Phaser.Scene;
  private readonly originX: number;
  private readonly originY: number;
  private streak = 0;
  private ambientTier = -1;
  private ambientObjects: Phaser.GameObjects.GameObject[] = [];
  private ambientTweens: Phaser.Tweens.Tween[] = [];
  private ambientEmitter?: Phaser.GameObjects.Particles.ParticleEmitter;

  constructor(scene: Phaser.Scene, originX: number, originY: number) {
    this.scene = scene;
    this.originX = originX;
    this.originY = originY;
    this.ensureTexture();
  }

  playCorrect(index: number, completedUnits: CompletedUnit[]): void {
    this.streak++;
    const tier = this.tierOf(this.streak);
    const color = TIER_COLORS[tier];
    const { cx, cy } = this.cellCenter(index);
    this.burst(cx, cy, TIER_BURST[tier], color, 60 + tier * 40);
    this.ring(cx, cy, color, 1.6 + tier * 0.5);
    this.flashCell(index, color);
    for (const unit of completedUnits) this.sweepUnit(index, unit, color);
    if (tier >= 3) this.confetti();
    this.applyAmbient(tier);
  }

  playWrong(index: number): void {
    const { cx, cy } = this.cellCenter(index);
    const emitter = this.scene.add.particles(cx, cy, 'vfx-dot', {
      speed: { min: 80, max: 220 },
      angle: { min: 0, max: 360 },
      lifespan: 500,
      gravityY: 400,
      scale: { start: 1, end: 0 },
      tint: [0xd32f2f, 0x9e9e9e, 0x424242],
      emitting: false,
    });
    emitter.explode(26);
    emitter.once('complete', () => emitter.destroy());
    this.scene.cameras.main.shake(150, 0.01);
    this.reset();
  }

  reset(): void {
    this.streak = 0;
    this.ambientTier = -1;
    for (const tween of this.ambientTweens) tween.stop();
    for (const obj of this.ambientObjects) obj.destroy();
    this.ambientTweens = [];
    this.ambientObjects = [];
    this.ambientEmitter = undefined;
  }

  destroy(): void {
    this.reset();
  }

  private tierOf(streak: number): number {
    if (streak >= 9) return 3;
    if (streak >= 6) return 2;
    if (streak >= 3) return 1;
    return 0;
  }

  private ensureTexture(): void {
    if (this.scene.textures.exists('vfx-dot')) return;
    const g = this.scene.add.graphics();
    g.fillStyle(0xffffff, 1).fillCircle(4, 4, 4);
    g.generateTexture('vfx-dot', 8, 8);
    g.destroy();
  }

  private cellCenter(index: number): { cx: number; cy: number } {
    return {
      cx: this.originX + (index % 9) * CELL_SIZE + CELL_SIZE / 2,
      cy: this.originY + Math.floor(index / 9) * CELL_SIZE + CELL_SIZE / 2,
    };
  }

  private burst(x: number, y: number, count: number, tint: number, maxSpeed: number): void {
    const emitter = this.scene.add.particles(x, y, 'vfx-dot', {
      speed: { min: 40, max: maxSpeed },
      angle: { min: 0, max: 360 },
      lifespan: { min: 300, max: 600 },
      scale: { start: 1, end: 0 },
      tint: [tint, 0xffffff],
      emitting: false,
    });
    emitter.explode(count);
    emitter.once('complete', () => emitter.destroy());
  }

  private ring(cx: number, cy: number, color: number, scaleTo: number): void {
    const circle = this.scene.add
      .circle(cx, cy, CELL_SIZE / 2 - 4, 0xffffff, 0)
      .setStrokeStyle(3, color, 1);
    this.scene.tweens.add({
      targets: circle,
      scaleX: scaleTo,
      scaleY: scaleTo,
      alpha: 0,
      duration: 400,
      ease: 'Cubic.easeOut',
      onComplete: () => circle.destroy(),
    });
  }

  private flashCell(index: number, color: number): void {
    const x = this.originX + (index % 9) * CELL_SIZE;
    const y = this.originY + Math.floor(index / 9) * CELL_SIZE;
    const rect = this.scene.add.rectangle(x, y, CELL_SIZE, CELL_SIZE, color, 0.35).setOrigin(0);
    this.scene.tweens.add({
      targets: rect,
      alpha: 0,
      duration: 350,
      onComplete: () => rect.destroy(),
    });
  }

  private unitRect(index: number, unit: CompletedUnit): { x: number; y: number; w: number; h: number } {
    const row = Math.floor(index / 9);
    const col = index % 9;
    if (unit === 'row') return { x: this.originX, y: this.originY + row * CELL_SIZE, w: BOARD_SIZE, h: CELL_SIZE };
    if (unit === 'col') return { x: this.originX + col * CELL_SIZE, y: this.originY, w: CELL_SIZE, h: BOARD_SIZE };
    const br = Math.floor(row / 3) * 3;
    const bc = Math.floor(col / 3) * 3;
    return {
      x: this.originX + bc * CELL_SIZE,
      y: this.originY + br * CELL_SIZE,
      w: CELL_SIZE * 3,
      h: CELL_SIZE * 3,
    };
  }

  private sweepUnit(index: number, unit: CompletedUnit, color: number): void {
    const r = this.unitRect(index, unit);
    const zone = this.scene.add.rectangle(r.x, r.y, r.w, r.h, color, 0.18).setOrigin(0);
    this.scene.tweens.add({
      targets: zone,
      alpha: 0,
      duration: 600,
      onComplete: () => zone.destroy(),
    });
    const horizontal = unit !== 'col';
    const bar = this.scene.add
      .rectangle(r.x, r.y, horizontal ? CELL_SIZE * 1.5 : r.w, horizontal ? r.h : CELL_SIZE * 1.5, color, 0.55)
      .setOrigin(0);
    this.scene.tweens.add({
      targets: bar,
      x: horizontal ? r.x + r.w - bar.width : r.x,
      y: horizontal ? r.y : r.y + r.h - bar.height,
      alpha: 0,
      duration: 500,
      ease: 'Sine.easeInOut',
      onComplete: () => bar.destroy(),
    });
  }

  private confetti(): void {
    const { width } = this.scene.scale;
    for (let i = 0; i < 3; i++) {
      const x = Phaser.Math.Between(width * 0.1, width * 0.9);
      const y = Phaser.Math.Between(60, this.originY + BOARD_SIZE);
      this.burst(x, y, 16, TIER_COLORS[3], 180);
    }
  }

  private applyAmbient(tier: number): void {
    if (tier <= this.ambientTier) return;
    this.ambientTier = tier;
    const color = TIER_COLORS[tier];
    if (tier >= 1 && !this.ambientObjects.some((o) => o.name === 'vfx-border')) {
      const border = this.scene.add.graphics();
      border.name = 'vfx-border';
      this.ambientObjects.push(border);
      this.ambientTweens.push(
        this.scene.tweens.add({ targets: border, alpha: { from: 1, to: 0.25 }, duration: 700, yoyo: true, repeat: -1 }),
      );
    }
    const border = this.ambientObjects.find((o) => o.name === 'vfx-border') as Phaser.GameObjects.Graphics | undefined;
    if (border) {
      border.clear();
      border.lineStyle(3 + tier, color, 1);
      border.strokeRect(this.originX - 4, this.originY - 4, BOARD_SIZE + 8, BOARD_SIZE + 8);
    }
    if (tier >= 2 && !this.ambientEmitter) {
      this.ambientEmitter = this.scene.add.particles(0, this.originY + BOARD_SIZE + 6, 'vfx-dot', {
        x: { min: this.originX, max: this.originX + BOARD_SIZE },
        speedY: { min: -30, max: -70 },
        lifespan: 2600,
        scale: { start: 0.8, end: 0 },
        alpha: { start: 0.7, end: 0 },
        tint: color,
        frequency: 120,
      });
      this.ambientObjects.push(this.ambientEmitter);
    }
    if (this.ambientEmitter) this.ambientEmitter.setParticleTint(color);
    if (tier >= 3 && !this.ambientObjects.some((o) => o.name === 'vfx-edge')) {
      const { width, height } = this.scene.scale;
      const rect = new Phaser.Geom.Rectangle(4, 4, width - 8, height - 8);
      const edgeZone = new Phaser.GameObjects.Particles.Zones.EdgeZone(rect, 300, 0, false, true);
      const edgeEmitter = this.scene.add.particles(0, 0, 'vfx-dot', {
        emitZone: edgeZone,
        speed: { min: 10, max: 35 },
        angle: { min: 0, max: 360 },
        lifespan: { min: 1200, max: 2200 },
        scale: { start: 1, end: 0.2 },
        alpha: { start: 0.8, end: 0 },
        tint: [color, 0xffffff],
        frequency: 60,
      });
      edgeEmitter.name = 'vfx-edge';
      this.ambientObjects.push(edgeEmitter);
    }
    const edge = this.ambientObjects.find((o) => o.name === 'vfx-edge') as
      | Phaser.GameObjects.Particles.ParticleEmitter
      | undefined;
    if (edge) edge.setParticleTint([color, 0xffffff]);
  }
}
