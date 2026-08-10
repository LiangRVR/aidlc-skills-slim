import Phaser from 'phaser';
import { LocalGameController } from './core/game-controller';
import { MenuScene } from './scenes/menu-scene';
import { GameScene } from './scenes/game-scene';

const controller = new LocalGameController();

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game-container',
  width: 540,
  height: 700,
  backgroundColor: '#fafafa',
  scene: [MenuScene, GameScene],
};

const game = new Phaser.Game(config);
game.registry.set('controller', controller);
