import Phaser from 'phaser'
import { HERO_LIST } from '../data/heroes'
import type { HeroFolder } from '../data/animations'
import {
  AI_DIFFICULTY_LABELS,
  GameRegistry,
  type AiDifficulty,
} from '../data/gameState'
import { GAME_WIDTH, GAME_HEIGHT } from '../main'

const COLS = 3
const CARD_W = 120
const CARD_H = 100
const GAP = 12
const DIFFICULTIES: AiDifficulty[] = ['easy', 'normal', 'hard']

export class MenuScene extends Phaser.Scene {
  private selectedIndex = 0
  private enemySelectionIndex = 1
  private difficultyIndex = 1
  private cards: Phaser.GameObjects.Container[] = []
  private difficultyButtons: Phaser.GameObjects.Container[] = []
  private difficultyText!: Phaser.GameObjects.Text
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys
  private keyEnter!: Phaser.Input.Keyboard.Key
  private keyTab!: Phaser.Input.Keyboard.Key
  private keyQ!: Phaser.Input.Keyboard.Key
  private keyE!: Phaser.Input.Keyboard.Key
  private isTransitioning = false
  private vsOverlay?: Phaser.GameObjects.Container

  // Cyber Background Grid
  private bgGraphics!: Phaser.GameObjects.Graphics
  private bgScrollOffset = 0

  // Symmetrical Split Panels
  private p1PanelSprite!: Phaser.GameObjects.Sprite
  private p1PanelNameText!: Phaser.GameObjects.Text
  private p1PanelTagText!: Phaser.GameObjects.Text
  private p1PanelStatsText!: Phaser.GameObjects.Text
  private p1PanelGraphics!: Phaser.GameObjects.Graphics

  private cpuPanelSprite!: Phaser.GameObjects.Sprite
  private cpuPanelNameText!: Phaser.GameObjects.Text
  private cpuPanelTagText!: Phaser.GameObjects.Text
  private cpuPanelStatsText!: Phaser.GameObjects.Text
  private cpuPanelGraphics!: Phaser.GameObjects.Graphics

  private startFightBtn!: Phaser.GameObjects.Container

  constructor() {
    super({ key: 'MenuScene' })
  }

  create() {
    this.cards = []
    this.difficultyButtons = []
    this.selectedIndex = 0
    this.enemySelectionIndex = 1
    this.difficultyIndex = 1
    this.isTransitioning = false
    this.input.keyboard?.removeAllListeners()

    // Disable standard context menu so right click works for CPU selection
    this.input.mouse?.disableContextMenu()

    // Create Background Graphics
    this.bgGraphics = this.add.graphics().setDepth(-1)

    // Heading Title
    this.add
      .text(GAME_WIDTH / 2, 28, 'CHARACTER SELECT', {
        fontFamily: 'monospace',
        fontSize: '22px',
        fontStyle: '900',
        color: '#ffffff',
        stroke: '#000000',
        strokeThickness: 3,
      })
      .setOrigin(0.5)

    this.add
      .text(
        GAME_WIDTH / 2,
        50,
        'LEFT CLICK: select P1   RIGHT CLICK / Q/E: select CPU   [Enter] fight',
        {
          fontFamily: 'monospace',
          fontSize: '9px',
          color: '#888899',
        },
      )
      .setOrigin(0.5)

    this.difficultyText = this.add
      .text(GAME_WIDTH / 2, 65, '', {
        fontFamily: 'monospace',
        fontSize: '9px',
        color: '#555566',
      })
      .setOrigin(0.5)

    // Render Side panels
    this.createSidePanels()

    // Create central grid of character cards
    const startX = (GAME_WIDTH - (COLS * CARD_W + (COLS - 1) * GAP)) / 2 + CARD_W / 2
    const startY = 115

    HERO_LIST.forEach((hero, i) => {
      const col = i % COLS
      const row = Math.floor(i / COLS)
      const x = startX + col * (CARD_W + GAP)
      const y = startY + row * (CARD_H + GAP)
      this.cards.push(
        this.createCard(x, y, hero.folder, hero.label, hero.color, hero.skillLabel, hero.tagline),
      )
    })

    // Create Interactive Difficulty capsules
    this.createDifficultySelector()

    // Create Pulsing Start button
    this.createStartButton()

    this.refreshSelection()
    this.refreshDifficultySelection()

    this.cursors = this.input.keyboard!.createCursorKeys()
    this.keyEnter = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER)
    this.keyTab = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.TAB)
    this.keyQ = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.Q)
    this.keyE = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.E)

    // Hook number keys
    for (let k = 1; k <= HERO_LIST.length; k++) {
      this.input.keyboard!.on(`keydown-${this.numToWord(k)}`, () => this.selectIndex(k - 1))
    }
  }

  update() {
    // Background dynamic grid rotation & offset
    this.bgScrollOffset = (this.bgScrollOffset + 0.3) % 40
    this.drawBgGrid()

    if (Phaser.Input.Keyboard.JustDown(this.cursors.left!)) this.moveSelection(-1)
    if (Phaser.Input.Keyboard.JustDown(this.cursors.right!)) this.moveSelection(1)
    if (Phaser.Input.Keyboard.JustDown(this.cursors.up!)) this.moveSelection(-COLS)
    if (Phaser.Input.Keyboard.JustDown(this.cursors.down!)) this.moveSelection(COLS)

    if (Phaser.Input.Keyboard.JustDown(this.keyTab)) {
      this.difficultyIndex = (this.difficultyIndex + 1) % DIFFICULTIES.length
      this.refreshDifficultySelection()
    }

    if (Phaser.Input.Keyboard.JustDown(this.keyQ)) {
      this.adjustEnemySelection(-1)
    }

    if (Phaser.Input.Keyboard.JustDown(this.keyE)) {
      this.adjustEnemySelection(1)
    }

    if (Phaser.Input.Keyboard.JustDown(this.keyEnter)) {
      this.startBattle()
    }
  }

  private drawBgGrid(): void {
    this.bgGraphics.clear()

    // Cyberpunk background gradient-like layout
    this.bgGraphics.fillStyle(0x06070d, 1)
    this.bgGraphics.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT)

    // Moving Coordinate grid lines
    this.bgGraphics.lineStyle(1, 0x111625, 0.8)
    for (let x = this.bgScrollOffset; x < GAME_WIDTH; x += 40) {
      this.bgGraphics.lineBetween(x, 0, x, GAME_HEIGHT)
    }
    for (let y = this.bgScrollOffset; y < GAME_HEIGHT; y += 40) {
      this.bgGraphics.lineBetween(0, y, GAME_WIDTH, y)
    }

    // Neon divider lines for columns
    this.bgGraphics.lineStyle(1, 0x223554, 0.2)
    this.bgGraphics.lineBetween(246, 0, 246, GAME_HEIGHT)
    this.bgGraphics.lineBetween(GAME_WIDTH - 246, 0, GAME_WIDTH - 246, GAME_HEIGHT)
  }

  private createSidePanels(): void {
    // Player 1 Symmetrical glass panel (Left)
    const p1Panel = this.add.container(130, 270)
    const p1Bg = this.add
      .rectangle(0, 0, 212, 370, 0x0a0d18, 0.85)
      .setStrokeStyle(1.5, 0x0055ff)

    const p1Header = this.add
      .text(0, -165, 'PLAYER 1', {
        fontFamily: 'monospace',
        fontSize: '12px',
        fontStyle: 'bold',
        color: '#00ccff',
      })
      .setOrigin(0.5)

    this.p1PanelSprite = this.add.sprite(0, -50, 'Fighter_Idle', 0).setScale(1.7)
    this.p1PanelSprite.anims.play('Fighter_Idle', true)

    this.p1PanelNameText = this.add
      .text(0, 35, 'Fighter', {
        fontFamily: 'monospace',
        fontSize: '17px',
        fontStyle: 'bold',
        color: '#3b82f6',
      })
      .setOrigin(0.5)

    this.p1PanelTagText = this.add
      .text(0, 56, 'Balance — High hit consistency', {
        fontFamily: 'monospace',
        fontSize: '8px',
        color: '#888899',
        wordWrap: { width: 180 },
        align: 'center',
      })
      .setOrigin(0.5)

    this.p1PanelStatsText = this.add
      .text(-80, 80, '', {
        fontFamily: 'monospace',
        fontSize: '9px',
        color: '#b4b4c6',
        lineSpacing: 18,
        align: 'left',
      })
      .setOrigin(0, 0)

    this.p1PanelGraphics = this.add.graphics()

    p1Panel.add([
      p1Bg,
      p1Header,
      this.p1PanelSprite,
      this.p1PanelNameText,
      this.p1PanelTagText,
      this.p1PanelStatsText,
      this.p1PanelGraphics,
    ])

    // CPU opponent Symmetrical glass panel (Right)
    const cpuPanel = this.add.container(GAME_WIDTH - 130, 270)
    const cpuBg = this.add
      .rectangle(0, 0, 212, 370, 0x0a0d18, 0.85)
      .setStrokeStyle(1.5, 0xff0055)

    const cpuHeader = this.add
      .text(0, -165, 'CPU OPPONENT', {
        fontFamily: 'monospace',
        fontSize: '12px',
        fontStyle: 'bold',
        color: '#ff3366',
      })
      .setOrigin(0.5)

    this.cpuPanelSprite = this.add.sprite(0, -50, 'Samurai_Idle', 0).setScale(1.7).setFlipX(true)
    this.cpuPanelSprite.anims.play('Samurai_Idle', true)

    this.cpuPanelNameText = this.add
      .text(0, 35, 'Samurai', {
        fontFamily: 'monospace',
        fontSize: '17px',
        fontStyle: 'bold',
        color: '#ec4899',
      })
      .setOrigin(0.5)

    this.cpuPanelTagText = this.add
      .text(0, 56, 'Heavy hitter — Executes low HP targets', {
        fontFamily: 'monospace',
        fontSize: '8px',
        color: '#888899',
        wordWrap: { width: 180 },
        align: 'center',
      })
      .setOrigin(0.5)

    this.cpuPanelStatsText = this.add
      .text(-80, 80, '', {
        fontFamily: 'monospace',
        fontSize: '9px',
        color: '#b4b4c6',
        lineSpacing: 18,
        align: 'left',
      })
      .setOrigin(0, 0)

    this.cpuPanelGraphics = this.add.graphics()

    cpuPanel.add([
      cpuBg,
      cpuHeader,
      this.cpuPanelSprite,
      this.cpuPanelNameText,
      this.cpuPanelTagText,
      this.cpuPanelStatsText,
      this.cpuPanelGraphics,
    ])
  }

  private updateSidePanels(): void {
    const p1Hero = HERO_LIST[this.selectedIndex]
    const cpuHero = HERO_LIST[this.enemySelectionIndex]

    // Defensive checks
    if (!p1Hero || !cpuHero) {
      console.warn('Hero data missing for side panels')
      return
    }

    // Update Player 1 panel
    this.p1PanelSprite.anims.play(`${p1Hero.folder}_Walk`, true)
    this.p1PanelNameText.setText(p1Hero.label.toUpperCase()).setColor(p1Hero.color)
    this.p1PanelTagText.setText(p1Hero.tagline)
    // Compute stats from player instances
    const p1Player = p1Hero.create(p1Hero.label)
    const cpuPlayer = cpuHero.create(cpuHero.label)
    this.p1PanelStatsText.setText(
      `HEALTH  ${p1Player.maxHealth}\n` +
        `DAMAGE  ${p1Player.hitPoint}\n` +
        `SPEED   ${Math.round(1000 - p1Player.cooldownMs)}`,
    )

    this.p1PanelGraphics.clear()
    this.drawStatBar(this.p1PanelGraphics, -80, 92, p1Player.maxHealth, 150, 0x3b82f6)
    this.drawStatBar(this.p1PanelGraphics, -80, 120, p1Player.hitPoint, 30, 0x3b82f6)
    this.drawStatBar(this.p1PanelGraphics, -80, 148, 1000 - p1Player.cooldownMs, 1000, 0x3b82f6)

    // Update CPU opponent panel
    this.cpuPanelSprite.anims.play(`${cpuHero.folder}_Walk`, true)
    this.cpuPanelNameText.setText(cpuHero.label.toUpperCase()).setColor(cpuHero.color)
    this.cpuPanelTagText.setText(cpuHero.tagline)
    this.cpuPanelStatsText.setText(
      `HEALTH  ${cpuPlayer.maxHealth}\n` +
        `DAMAGE  ${cpuPlayer.hitPoint}\n` +
        `SPEED   ${Math.round(1000 - cpuPlayer.cooldownMs)}`,
    )

    this.cpuPanelGraphics.clear()
    this.drawStatBar(this.cpuPanelGraphics, -80, 92, cpuPlayer.maxHealth, 150, 0xf43f5e)
    this.drawStatBar(this.cpuPanelGraphics, -80, 120, cpuPlayer.hitPoint, 30, 0xf43f5e)
    this.drawStatBar(this.cpuPanelGraphics, -80, 148, 1000 - cpuPlayer.cooldownMs, 1000, 0xf43f5e)
  }

  private drawStatBar(
    gfx: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    value: number,
    max: number,
    color: number,
  ): void {
    const barW = 160
    const fillW = Math.max(0, Math.min(barW, (value / max) * barW))

    // Track
    gfx.fillStyle(0x181824, 0.8)
    gfx.fillRect(x, y, barW, 4)

    // Fill
    gfx.fillStyle(color, 1)
    gfx.fillRect(x, y, fillW, 4)
  }

  private createDifficultySelector(): void {
    const colors = [0x10b981, 0xf59e0b, 0xef4444]
    const diffX = [GAME_WIDTH / 2 - 80, GAME_WIDTH / 2, GAME_WIDTH / 2 + 80]
    const diffY = 368

    DIFFICULTIES.forEach((diff, index) => {
      const container = this.add.container(diffX[index], diffY)
      const rect = this.add
        .rectangle(0, 0, 70, 20, 0x111322)
        .setStrokeStyle(1.5, 0x223554)
        .setInteractive({ useHandCursor: true })

      const label = this.add
        .text(0, 0, diff.toUpperCase(), {
          fontFamily: 'monospace',
          fontSize: '9px',
          fontStyle: 'bold',
          color: '#c9c9d6',
        })
        .setOrigin(0.5)

      container.add([rect, label])

      rect.on('pointerdown', () => {
        this.difficultyIndex = index
        this.refreshDifficultySelection()
      })
      rect.on('pointerover', () => {
        if (this.difficultyIndex !== index) {
          rect.setStrokeStyle(2, colors[index])
        }
      })
      rect.on('pointerout', () => {
        if (this.difficultyIndex !== index) {
          rect.setStrokeStyle(1.5, 0x223554)
        }
      })

      this.difficultyButtons.push(container)
    })
  }

  private refreshDifficultySelection(): void {
    const colors = [0x10b981, 0xf59e0b, 0xef4444]

    this.difficultyButtons.forEach((btn, index) => {
      const rect = btn.list[0] as Phaser.GameObjects.Rectangle
      const label = btn.list[1] as Phaser.GameObjects.Text
      const isSelected = this.difficultyIndex === index

      if (isSelected) {
        rect.setStrokeStyle(2.5, colors[index])
        rect.setFillStyle(colors[index], 0.22)
        label.setColor('#ffffff').setFontStyle('bold')
      } else {
        rect.setStrokeStyle(1.5, 0x223554)
        rect.setFillStyle(0x111322, 1)
        label.setColor('#888899').setFontStyle('normal')
      }
    })

    this.refreshHudText()
  }

  private createStartButton(): void {
    this.startFightBtn = this.add.container(GAME_WIDTH / 2, 442)
    const btnBg = this.add
      .rectangle(0, 0, 180, 32, 0x22c55e, 0.22)
      .setStrokeStyle(2, 0x22c55e)
      .setInteractive({ useHandCursor: true })

    const btnLabel = this.add
      .text(0, 0, 'START DUEL [Enter]', {
        fontFamily: 'monospace',
        fontSize: '12px',
        fontStyle: 'bold',
        color: '#ffffff',
      })
      .setOrigin(0.5)

    this.startFightBtn.add([btnBg, btnLabel])

    btnBg.on('pointerdown', () => this.startBattle())
    btnBg.on('pointerover', () => {
      btnBg.setStrokeStyle(3, 0x4ade80)
      btnBg.setFillStyle(0x22c55e, 0.45)
    })
    btnBg.on('pointerout', () => {
      btnBg.setStrokeStyle(2, 0x22c55e)
      btnBg.setFillStyle(0x22c55e, 0.22)
    })

    // Pulse Tween
    this.tweens.add({
      targets: this.startFightBtn,
      scale: 1.03,
      yoyo: true,
      repeat: -1,
      duration: 1000,
      ease: 'Sine.easeInOut',
    })
  }

  private refreshHudText(): void {
    const diff = DIFFICULTIES[this.difficultyIndex]
    const enemyHero = this.getEnemyHero()
    this.difficultyText.setText(
      `AI DIFFICULTY: ${AI_DIFFICULTY_LABELS[diff].toUpperCase()}   [CPU OPPONENT: ${enemyHero.label.toUpperCase()}]`,
    )
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
    const bg = this.add
      .rectangle(0, 0, CARD_W, CARD_H, 0x0b0f19, 0.85)
      .setStrokeStyle(1.5, 0x223554)
    const preview = this.add.sprite(0, -10, `${folder}_Idle`, 0).setScale(0.8)
    preview.anims.play(`${folder}_Idle`, true)

    const name = this.add
      .text(0, 32, label, {
        fontFamily: 'monospace',
        fontSize: '10px',
        fontStyle: 'bold',
        color,
      })
      .setOrigin(0.5)

    const skillText = this.add
      .text(0, 44, skill.toUpperCase(), {
        fontFamily: 'monospace',
        fontSize: '7px',
        color: '#666677',
      })
      .setOrigin(0.5)

    // Visual labels P1 / CPU
    const p1Tag = this.add
      .text(-CARD_W / 2 + 15, -CARD_H / 2 + 10, 'P1', {
        fontFamily: 'monospace',
        fontSize: '7px',
        fontStyle: 'bold',
        backgroundColor: '#0055ff',
        padding: { x: 3, y: 1 },
        color: '#ffffff',
      })
      .setOrigin(0.5)
      .setVisible(false)
      .setName('p1Tag')

    const cpuTag = this.add
      .text(CARD_W / 2 - 18, -CARD_H / 2 + 10, 'CPU', {
        fontFamily: 'monospace',
        fontSize: '7px',
        fontStyle: 'bold',
        backgroundColor: '#ff0055',
        padding: { x: 3, y: 1 },
        color: '#ffffff',
      })
      .setOrigin(0.5)
      .setVisible(false)
      .setName('cpuTag')

    container.add([bg, preview, name, skillText, p1Tag, cpuTag])
    container.setSize(CARD_W, CARD_H)
    container.setInteractive({ useHandCursor: true })

    container.on('pointerover', () => {
      if (!this.isTransitioning) {
        this.selectedIndex = this.cards.indexOf(container)
        this.refreshSelection()
      }
    })

    container.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (this.isTransitioning) return
      const index = this.cards.indexOf(container)

      if (pointer.rightButtonDown()) {
        this.enemySelectionIndex = index
      } else {
        this.selectedIndex = index
      }
      this.refreshSelection()
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

  private adjustEnemySelection(delta: number): void {
    this.enemySelectionIndex = Phaser.Math.Wrap(
      this.enemySelectionIndex + delta,
      0,
      HERO_LIST.length,
    )
    this.refreshSelection()
  }

  private refreshSelection(): void {
    this.cards.forEach((card, i) => {
      const selected = i === this.selectedIndex
      const isCpu = i === this.enemySelectionIndex

      const bg = card.list[0] as Phaser.GameObjects.Rectangle
      const preview = card.list[1] as Phaser.GameObjects.Sprite
      const p1Tag = card.getByName('p1Tag') as Phaser.GameObjects.Text | null
      const cpuTag = card.getByName('cpuTag') as Phaser.GameObjects.Text | null

      if (bg) {
        let strokeColor = 0x223554
        let thickness = 1.5
        if (selected && isCpu) {
          strokeColor = 0xa855f7
          thickness = 2.5
        } else if (selected) {
          strokeColor = 0x0055ff
          thickness = 2.5
        } else if (isCpu) {
          strokeColor = 0xff0055
          thickness = 2.5
        }
        bg.setStrokeStyle(thickness, strokeColor)
        bg.setFillStyle(selected || isCpu ? 0x0e1424 : 0x0b0f19, 0.85)
      }

      if (preview) {
        // Fix preview walk animation bug
        const isWalking = selected || isCpu
        const animName = isWalking ? 'Walk' : 'Idle'
        const folder = preview.texture.key.split('_')[0]
        preview.anims.play(`${folder}_${animName}`, true)
      }

      if (p1Tag) p1Tag.setVisible(selected)
      if (cpuTag) cpuTag.setVisible(isCpu)

      card.setScale(selected ? 1.03 : 1)
    })

    this.updateSidePanels()
    this.refreshHudText()
  }

  private getSelectedHero() {
    return HERO_LIST[this.selectedIndex]
  }

  private getEnemyHero() {
    return HERO_LIST[this.enemySelectionIndex]
  }

  private showVsOverlay(
    playerHero: (typeof HERO_LIST)[number],
    enemyHero: (typeof HERO_LIST)[number],
  ): void {
    this.vsOverlay?.destroy()
    this.vsOverlay = this.add.container(GAME_WIDTH / 2, GAME_HEIGHT / 2)

    const bg = this.add
      .rectangle(0, 0, GAME_WIDTH - 90, GAME_HEIGHT - 140, 0x06070d, 0.95)
      .setStrokeStyle(2, 0x223554)
    const title = this.add
      .text(0, -92, 'VS', {
        fontFamily: 'monospace',
        fontSize: '34px',
        fontStyle: '900',
        color: '#ffffff',
      })
      .setOrigin(0.5)

    const playerPortrait = this.add.sprite(-130, -6, `${playerHero.folder}_Idle`, 0).setScale(1.6)
    playerPortrait.anims.play(`${playerHero.folder}_Idle`, true)
    const enemyPortrait = this.add
      .sprite(130, -6, `${enemyHero.folder}_Idle`, 0)
      .setScale(1.6)
      .setFlipX(true)
    enemyPortrait.anims.play(`${enemyHero.folder}_Idle`, true)

    const playerName = this.add
      .text(-130, 82, playerHero.label.toUpperCase(), {
        fontFamily: 'monospace',
        fontSize: '13px',
        fontStyle: 'bold',
        color: playerHero.color,
      })
      .setOrigin(0.5)
    const enemyName = this.add
      .text(130, 82, enemyHero.label.toUpperCase(), {
        fontFamily: 'monospace',
        fontSize: '13px',
        fontStyle: 'bold',
        color: enemyHero.color,
      })
      .setOrigin(0.5)
    const hint = this.add
      .text(0, 112, 'ENTER ARENA...', {
        fontFamily: 'monospace',
        fontSize: '10px',
        color: '#00ff66',
      })
      .setOrigin(0.5)

    this.vsOverlay.add([bg, title, playerPortrait, enemyPortrait, playerName, enemyName, hint])
    this.vsOverlay.setScale(0.95)
    this.tweens.add({ targets: this.vsOverlay, scale: 1, duration: 260, ease: 'Back.easeOut' })

    // Add screen shake effect on overlay enter
    this.cameras.main.shake(120, 0.008)

    this.time.delayedCall(900, () => {
      if (!this.isTransitioning) return
      this.scene.start('BattleScene')
    })
  }

  private startBattle(): void {
    if (this.isTransitioning) return

    const playerHero = this.getSelectedHero()
    const enemyHero = this.getEnemyHero()

    GameRegistry.battle = {
      playerFolder: playerHero.folder,
      enemyFolder: enemyHero.folder,
      difficulty: DIFFICULTIES[this.difficultyIndex],
    }

    this.isTransitioning = true
    this.showVsOverlay(playerHero, enemyHero)
  }

  private numToWord(num: number): string {
    const words = ['ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX']
    return words[num - 1] || 'ONE'
  }
}
