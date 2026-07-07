import Phaser from 'phaser'
import { BootScene } from './scenes/BootScene'
import { PreloadScene } from './scenes/PreloadScene'
import { MenuScene } from './scenes/MenuScene'
import { BattleScene } from './scenes/BattleScene'

export const GAME_WIDTH = 960
export const GAME_HEIGHT = 540

export function createGame(parent: HTMLElement): Phaser.Game {
  return new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    backgroundColor: '#0B0D10',
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    scene: [BootScene, PreloadScene, MenuScene, BattleScene],
    fps: {
      target: 60,
      forceSetTimeOut: false,
    },
  })
}
