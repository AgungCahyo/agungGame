import Phaser from 'phaser'
import { HERO_LIST } from '../data/heroes'
import type { HeroFolder } from '../data/animations'
import { GameRegistry } from '../data/gameState'
import { GAME_WIDTH, GAME_HEIGHT } from '../main'

const COLS = 3
const CARD_W = 140
const CARD_H = 120
const GAP = 16

export class MenuScene extends Phaser.Scene {
  private selectedIndex = 0
  private cards: Phaser.GameObjects.Container[] = []
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys
  private keyEnter!: Phaser.Input.Keyboard.Key

  constructor() {
    super({ key: 'MenuScene' })
  }

  create() {
    this.add
      .text(GAME_WIDTH / 2, 28, 'PILIH HERO', {
        fontFamily: 'monospace',
        fontSize: '22px',
        color: '#ffffff',
      })
      .setOrigin(0.5)

    this.add
      .text(GAME_WIDTH / 2, 52, '← → ↑ ↓ navigasi   [Enter] mulai   lawan: AI random', {
        fontFamily: 'monospace',
        fontSize: '10px',
        color: '#666677',
      })
      .setOrigin(0.5)

    const startX = (GAME_WIDTH - (COLS * CARD_W + (COLS - 1) * GAP)) / 2 + CARD_W / 2
    const startY = 130

    HERO_LIST.forEach((hero, i) => {
      const col = i % COLS
      const row = Math.floor(i / COLS)
      const x = startX + col * (CARD_W + GAP)
      const y = startY + row * (CARD_H + GAP)
      this.cards.push(this.createCard(x, y, hero.folder, hero.label, hero.color, hero.skillLabel, hero.tagline))
    })

    this.refreshSelection()

    this.cursors = this.input.keyboard!.createCursorKeys()
    this.keyEnter = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER)

    this.input.keyboard!.on('keydown-ONE', () => this.selectIndex(0))
    this.input.keyboard!.on('keydown-TWO', () => this.selectIndex(1))
    this.input.keyboard!.on('keydown-THREE', () => this.selectIndex(2))
    this.input.keyboard!.on('keydown-FOUR', () => this.selectIndex(3))
    this.input.keyboard!.on('keydown-FIVE', () => this.selectIndex(4))
    this.input.keyboard!.on('keydown-SIX', () => this.selectIndex(5))
  }

  update() {
    if (Phaser.Input.Keyboard.JustDown(this.cursors.left!)) this.moveSelection(-1)
    if (Phaser.Input.Keyboard.JustDown(this.cursors.right!)) this.moveSelection(1)
    if (Phaser.Input.Keyboard.JustDown(this.cursors.up!)) this.moveSelection(-COLS)
    if (Phaser.Input.Keyboard.JustDown(this.cursors.down!)) this.moveSelection(COLS)

    if (Phaser.Input.Keyboard.JustDown(this.keyEnter)) {
      this.startBattle()
    }
  }

  private createCard(
    x: number,
    y: number,
    folder: HeroFolder,
    label: string,
    color: string,
    skill: string,
    tagline: string,
  ): Phaser.GameObjects.Container {
    const container = this.add.container(x, y)
    const bg = this.add.rectangle(0, 0, CARD_W, CARD_H, 0x14141e).setStrokeStyle(2, 0x333344)
    const preview = this.add.sprite(0, -8, `${folder}_Idle`, 0).setScale(0.85)
    preview.anims.play(`${folder}_Idle`)

    const name = this.add.text(0, 38, label, {
      fontFamily: 'monospace',
      fontSize: '11px',
      color,
    }).setOrigin(0.5)

    const skillText = this.add.text(0, 52, skill, {
      fontFamily: 'monospace',
      fontSize: '9px',
      color: '#888899',
    }).setOrigin(0.5)

    const tag = this.add.text(0, 66, tagline, {
      fontFamily: 'monospace',
      fontSize: '8px',
      color: '#555566',
      wordWrap: { width: CARD_W - 12 },
      align: 'center',
    }).setOrigin(0.5)

    container.add([bg, preview, name, skillText, tag])
    container.setSize(CARD_W, CARD_H)
    container.setInteractive({ useHandCursor: true })
    container.on('pointerdown', () => {
      this.selectedIndex = this.cards.indexOf(container)
      this.refreshSelection()
      this.startBattle()
    })

    return container
  }

  private moveSelection(delta: number): void {
    this.selectIndex(Phaser.Math.Wrap(this.selectedIndex + delta, 0, HERO_LIST.length))
  }

  private selectIndex(index: number): void {
    this.selectedIndex = index
    this.refreshSelection()
  }

  private refreshSelection(): void {
    this.cards.forEach((card, i) => {
      const bg = card.getAt(0) as Phaser.GameObjects.Rectangle
      const selected = i === this.selectedIndex
      bg.setStrokeStyle(selected ? 3 : 2, selected ? 0xffffff : 0x333344)
      card.setScale(selected ? 1.04 : 1)
    })
  }

  private startBattle(): void {
    const playerHero = HERO_LIST[this.selectedIndex]
    const otherHeroes = HERO_LIST.filter((h) => h.folder !== playerHero.folder)
    const enemyHero = Phaser.Utils.Array.GetRandom(otherHeroes)

    GameRegistry.battle = {
      playerFolder: playerHero.folder,
      enemyFolder: enemyHero.folder,
    }

    this.scene.start('BattleScene')
  }
}
