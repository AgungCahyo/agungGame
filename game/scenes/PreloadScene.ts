import Phaser from 'phaser'
import { preloadCharacterSheets, registerCharacterAnims } from '../systems/AnimationSystem'

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super({ key: 'PreloadScene' })
  }

  preload() {
    const { width, height } = this.scale
    const bar = this.add.rectangle(width / 2, height / 2, width * 0.4, 8, 0x333344)
    const fill = this.add.rectangle(width / 2 - bar.width / 2, height / 2, 0, 8, 0x4a90d9).setOrigin(0, 0.5)

    this.load.on('progress', (value: number) => {
      fill.width = bar.width * value
    })

    preloadCharacterSheets(this.load)
  }

  create() {
    registerCharacterAnims(this)
    this.scene.start('MenuScene')
  }
}
