import Phaser from 'phaser'
import { animKey } from '../data/animations'
import type { Character } from '../entities/Character'
import type { CombatSystem, DamagePopup } from '../systems/CombatSystem'
import { GAME_WIDTH, GAME_HEIGHT } from '../main'
import { UI_DEPTH } from '../config/uiConstants'

type FighterPanel = {
  container: Phaser.GameObjects.Container
  name: Phaser.GameObjects.Text
  portrait: Phaser.GameObjects.Sprite
  hpBg: Phaser.GameObjects.Rectangle
  hpFill: Phaser.GameObjects.Rectangle
  hpDelay: Phaser.GameObjects.Rectangle
  guardBg: Phaser.GameObjects.Rectangle
  guardFill: Phaser.GameObjects.Rectangle
  skillBg: Phaser.GameObjects.Rectangle
  skillFill: Phaser.GameObjects.Rectangle
  skillLabel: Phaser.GameObjects.Text
  panelGfx: Phaser.GameObjects.Graphics // For glowing border outlines & dynamic HUD visuals
  portraitGlowGfx: Phaser.GameObjects.Graphics // For pulsing glow on portrait when skill is ready
  side: 'left' | 'right'
}

export class BattleUI {
  private readonly panelLeft: FighterPanel
  private readonly panelRight: FighterPanel
  private comboText: Phaser.GameObjects.Text
  private skillFlashText: Phaser.GameObjects.Text
  private overlayGroup: Phaser.GameObjects.Container
  private overlayTitle: Phaser.GameObjects.Text
  private overlayStats: Phaser.GameObjects.Text
  private overlayHint: Phaser.GameObjects.Text
  private announcementText: Phaser.GameObjects.Text
  private timerText: Phaser.GameObjects.Text
  private scoreText: Phaser.GameObjects.Text
  private suddenDeathText: Phaser.GameObjects.Text
  private roundResultGroup: Phaser.GameObjects.Container
  private popupTexts: Phaser.GameObjects.Text[] = [];
  private readonly depth = UI_DEPTH; // Base depth for UI elements
  
  private displayHpLeft = 1
  private displayHpRight = 1
  
  // Custom HUD tween tracker
  private p1PortraitPulse?: Phaser.Tweens.Tween
  private p2PortraitPulse?: Phaser.Tweens.Tween

  constructor(
    private readonly scene: Phaser.Scene,
    player: Character,
    enemy: Character,
  ) {
    const depth = 100

    this.panelLeft = this.createPanel(20, player, 'left', true)
    this.panelRight = this.createPanel(GAME_WIDTH - 20, enemy, 'right', false)

    // Combo multiplier text styling
    this.comboText = scene.add
      .text(GAME_WIDTH / 2, 85, '', {
        fontFamily: 'monospace',
        fontSize: '24px',
        fontStyle: '900',
        color: '#fbbf24',
        stroke: '#000000',
        strokeThickness: 4,
        shadow: { color: '#000000', fill: true, offsetX: 2, offsetY: 2, blur: 2 }
      })
      .setOrigin(0.5)
      .setDepth(depth + 3)

    // Skill spell splash notification
    this.skillFlashText = scene.add
      .text(GAME_WIDTH / 2, 110, '', {
        fontFamily: 'monospace',
        fontSize: '14px',
        fontStyle: 'bold',
        color: '#c4b5fd',
        stroke: '#000000',
        strokeThickness: 2,
      })
      .setOrigin(0.5)
      .setAlpha(0)
      .setDepth(depth + 3)

    // Cyberpunk End Match Leaderboard overlay
    this.overlayGroup = scene.add.container(GAME_WIDTH / 2, GAME_HEIGHT / 2).setDepth(300).setVisible(false)
    
    const overlayBg = scene.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x05060b, 0.8)
    
    // Panel card frame
    const overlayPanel = scene.add.rectangle(0, 0, 380, 310, 0x0c0f1d, 0.95)
      .setStrokeStyle(2, 0x3b82f6)
    
    const panelHeaderLine = scene.add.line(0, 0, -160, -95, 160, -95, 0x1e293b, 1)
    
    this.overlayTitle = scene.add.text(0, -120, '', {
      fontFamily: 'monospace',
      fontSize: '26px',
      fontStyle: '900',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5)
    
    this.overlayStats = scene.add.text(0, 5, '', {
      fontFamily: 'monospace',
      fontSize: '11px',
      color: '#cbd5e1',
      align: 'left',
      lineSpacing: 10,
    }).setOrigin(0.5)

    this.overlayHint = scene.add.text(0, 118, 'PRESS [R] REMATCH   PRESS [Esc] SELECT HERO', {
      fontFamily: 'monospace',
      fontSize: '9px',
      fontStyle: 'bold',
      color: '#64748b',
    }).setOrigin(0.5)
    
    this.overlayGroup.add([overlayBg, overlayPanel, panelHeaderLine, this.overlayTitle, this.overlayStats, this.overlayHint])

    // Massive Announcement texts (FIGHT, ROUND 1)
    this.announcementText = scene.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 40, '', {
        fontFamily: 'monospace',
        fontSize: '46px',
        fontStyle: '900',
        color: '#ffcc00',
        stroke: '#000000',
        strokeThickness: 6,
        shadow: { color: '#000000', fill: true, offsetX: 3, offsetY: 3, blur: 4 }
      })
      .setOrigin(0.5)
      .setAlpha(0)
      .setDepth(depth + 5)

    // Center Timer HUD
    this.timerText = scene.add
      .text(GAME_WIDTH / 2, 28, '60', {
        fontFamily: 'monospace',
        fontSize: '22px',
        fontStyle: 'bold',
        color: '#ffffff',
        stroke: '#000000',
        strokeThickness: 3,
      })
      .setOrigin(0.5)
      .setDepth(depth + 4)

    // Center Score HUD
    this.scoreText = scene.add
      .text(GAME_WIDTH / 2, 48, '0 - 0', {
        fontFamily: 'monospace',
        fontSize: '12px',
        fontStyle: 'bold',
        color: '#94a3b8',
      })
      .setOrigin(0.5)
      .setDepth(depth + 4)

    // Sudden death overlay text
    this.suddenDeathText = scene.add
      .text(GAME_WIDTH / 2, 65, '', {
        fontFamily: 'monospace',
        fontSize: '10px',
        fontStyle: 'bold',
        color: '#ef4444',
      })
      .setOrigin(0.5)
      .setAlpha(0)
      .setDepth(depth + 4)

    // Round Result temporary toast HUD
    this.roundResultGroup = scene.add.container(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 40).setDepth(250).setVisible(false)
    const roundBg = scene.add.rectangle(0, 0, 240, 75, 0x05060b, 0.9)
      .setStrokeStyle(1.5, 0x334155)
    const roundTitle = scene.add.text(0, -12, '', {
      fontFamily: 'monospace',
      fontSize: '18px',
      fontStyle: 'bold',
      color: '#ffffff',
    }).setOrigin(0.5).setName('roundTitle')
    const roundStats = scene.add.text(0, 16, '', {
      fontFamily: 'monospace',
      fontSize: '10px',
      color: '#94a3b8',
      align: 'center',
    }).setOrigin(0.5).setName('roundStats')
    
    this.roundResultGroup.add([roundBg, roundTitle, roundStats])
  }

  update(
    delta: number,
    player: Character,
    enemy: Character,
    combat: CombatSystem,
    combo: number,
  ): void {
    this.updatePanel(this.panelLeft, player, this.displayHpLeft, (v) => (this.displayHpLeft = v))
    this.updatePanel(this.panelRight, enemy, this.displayHpRight, (v) => (this.displayHpRight = v))

    // Symmetrical scale pulse on high combos
    if (combo >= 2) {
      this.comboText.setText(`${combo}x COMBO`).setAlpha(1)
      if (combo > 4) {
        this.comboText.setScale(1.1 + Math.sin(this.scene.time.now / 50) * 0.05)
      } else {
        this.comboText.setScale(1)
      }
    } else {
      this.comboText.setText('').setAlpha(0)
    }

    this.renderPopups(combat.popups)
  }

  showSkillFlash(label: string): void {
    this.skillFlashText.setText(label.toUpperCase())
    this.skillFlashText.setAlpha(1)
    this.scene.tweens.add({
      targets: this.skillFlashText,
      alpha: 0,
      y: 95,
      duration: 700,
      onComplete: () => {
        this.skillFlashText.y = 110
      },
    })
  }

  hideOverlay(): void {
    this.overlayGroup.setVisible(false)
  }

  showResult(title: string, color: string, stats: string[]): void {
    this.overlayTitle.setText(title.toUpperCase())
    this.overlayTitle.setColor(color)
    this.overlayStats.setText(stats.join('\n').toUpperCase())
    this.overlayGroup.setVisible(true)
    
    // Scale zoom overlay on gameover
    this.overlayGroup.setScale(0.8)
    this.scene.tweens.add({
      targets: this.overlayGroup,
      scale: 1,
      duration: 350,
      ease: 'Back.easeOut'
    })
  }

  showAnnouncement(text: string): void {
    this.announcementText.setText(text.toUpperCase())
    this.announcementText.setScale(0.5)
    this.announcementText.setAlpha(1)
    
    if (text.toUpperCase() === 'FIGHT!') {
      this.announcementText.setColor('#ff3300')
    } else {
      this.announcementText.setColor('#ffcc00')
    }

    this.scene.tweens.add({
      targets: this.announcementText,
      scale: 1.15,
      duration: 250,
      ease: 'Back.easeOut',
    })
  }

  hideAnnouncement(): void {
    this.scene.tweens.add({
      targets: this.announcementText,
      alpha: 0,
      scale: 1.4,
      duration: 220,
    })
  }

  updateTimer(secondsLeft: number): void {
    const secs = Math.ceil(secondsLeft)
    this.timerText.setText(String(secs))
    this.timerText.setColor(secs <= 10 ? '#f43f5e' : '#ffffff')
    if (secs <= 10) {
      // Gentle pulse alert when timer runs low
      this.timerText.setScale(1 + Math.sin(this.scene.time.now / 150) * 0.1)
    } else {
      this.timerText.setScale(1)
    }
  }

  updateScore(playerWins: number, enemyWins: number): void {
    this.scoreText.setText(`${playerWins} - ${enemyWins}`)
  }

  showSuddenDeath(active: boolean): void {
    this.suddenDeathText.setText(active ? 'SUDDEN DEATH — FIRST HIT WINS' : '')
    this.suddenDeathText.setAlpha(active ? 1 : 0)
    this.timerText.setAlpha(active ? 0 : 1)
  }

  resetHpDisplays(): void {
    this.displayHpLeft = 1
    this.displayHpRight = 1
  }

  showRoundResult(title: string, color: string, stats: string[]): void {
    const titleObj = this.roundResultGroup.getByName('roundTitle') as Phaser.GameObjects.Text
    const statsObj = this.roundResultGroup.getByName('roundStats') as Phaser.GameObjects.Text
    titleObj.setText(title.toUpperCase())
    titleObj.setColor(color)
    statsObj.setText(stats.join('\n').toUpperCase())
    
    this.roundResultGroup.setVisible(true)
    this.roundResultGroup.setAlpha(0)
    this.roundResultGroup.setScale(0.85)

    this.scene.tweens.add({
      targets: this.roundResultGroup,
      alpha: 1,
      scale: 1,
      duration: 250,
      ease: 'Back.easeOut'
    })

    this.scene.time.delayedCall(1800, () => {
      this.scene.tweens.add({
        targets: this.roundResultGroup,
        alpha: 0,
        scale: 0.9,
        duration: 300,
        onComplete: () => this.roundResultGroup.setVisible(false),
      })
    })
  }

  private createPanel(x: number, fighter: Character, side: 'left' | 'right', isPlayer: boolean): FighterPanel {
    const y = 14
    const barW = 180
    const anchor = side === 'left' ? 0 : 1
    
    // Shift bars away from portrait
    const barX = side === 'left' ? x + 48 : x - 48

    // HUD Panel container
    const container = this.scene.add.container(0, 0)

    // Glass backdrop frame
    const panelGfx = this.scene.add.graphics()
    const portraitGlowGfx = this.scene.add.graphics()
    container.add([panelGfx, portraitGlowGfx])

    const name = this.scene.add
      .text(side === 'left' ? barX : barX, y, fighter.player.name.toUpperCase(), {
        fontFamily: 'monospace',
        fontSize: '11px',
        fontStyle: 'bold',
        color: fighter.player.color,
      })
      .setOrigin(anchor, 0)
    container.add(name)

    // Frame wrapper for portrait
    const portraitX = side === 'left' ? x + 18 : x - 18
    const portrait = this.scene.add.sprite(
      portraitX,
      y + 24,
      animKey(fighter.folder, 'Idle'),
      0,
    ).setScale(0.26).setOrigin(0.5)
    portrait.anims.play(animKey(fighter.folder, 'Idle'), true)
    if (side === 'right') {
      portrait.setFlipX(true)
    }
    container.add(portrait)

    // HP Bar Components (Symmetrical placement & layout mapping)
    const hpBg = this.scene.add.rectangle(barX, y + 17, barW, 9, 0x12131a).setOrigin(anchor, 0.5)
    const hpDelay = this.scene.add
      .rectangle(barX, y + 17, barW, 9, 0xffffff, 0.4) // Ghost damage white bar
      .setOrigin(anchor, 0.5)
    const hpFill = this.scene.add
      .rectangle(barX, y + 17, barW, 9, Phaser.Display.Color.HexStringToColor(fighter.player.color).color)
      .setOrigin(anchor, 0.5)
    
    container.add([hpBg, hpDelay, hpFill])

    // Guard/Stamina Bar Components
    const guardBg = this.scene.add.rectangle(barX, y + 25, barW, 3, 0x12131a).setOrigin(anchor, 0.5)
    const guardFill = this.scene.add.rectangle(barX, y + 25, barW, 3, 0x3b82f6).setOrigin(anchor, 0.5)
    container.add([guardBg, guardFill])

    // Ultimate Skill Bar Components
    const skillBg = this.scene.add.rectangle(barX, y + 31, barW, 3, 0x181a26).setOrigin(anchor, 0.5)
    const skillFill = this.scene.add
      .rectangle(barX, y + 31, barW, 3, 0xa855f7)
      .setOrigin(anchor, 0.5)
    container.add([skillBg, skillFill])

    // Controller input mapping hints/labels
    const skillLabelText = isPlayer ? `[F] ${fighter.player.skillLabel}` : fighter.player.skillLabel
    const skillLabel = this.scene.add
      .text(barX, y + 37, skillLabelText.toUpperCase(), {
        fontFamily: 'monospace',
        fontSize: '8px',
        color: '#64748b',
      })
      .setOrigin(anchor, 0)
    container.add(skillLabel)

    // Render glass container contours
    this.drawPanelFrame(panelGfx, x, y, side, fighter.player.color)

    // Bring elements to correct layers
      for (const item of [panelGfx, portraitGlowGfx, name, portrait, hpBg, hpDelay, hpFill, guardBg, guardFill, skillBg, skillFill, skillLabel]) {
        item.setDepth(this.depth);
      }

    return { 
      container, 
      name, 
      portrait, 
      hpBg, 
      hpFill, 
      hpDelay, 
      guardBg, 
      guardFill, 
      skillBg, 
      skillFill, 
      skillLabel,
      panelGfx,
      portraitGlowGfx,
      side
    }
  }

  private drawPanelFrame(gfx: Phaser.GameObjects.Graphics, x: number, y: number, side: 'left' | 'right', colorStr: string): void {
    gfx.clear()
    const color = Phaser.Display.Color.HexStringToColor(colorStr).color
    const bgW = 240
    const bgH = 54
    const startX = side === 'left' ? x : x - bgW

    // Semi-transparent dark background card
    gfx.fillStyle(0x0c0f1d, 0.8)
    gfx.fillRect(startX, y - 4, bgW, bgH)

    // High tech angled border frame
    gfx.lineStyle(1.5, color, 0.4)
    gfx.strokeRect(startX, y - 4, bgW, bgH)

    // Neon highlight corner points
    gfx.lineStyle(2.5, color, 0.8)
    if (side === 'left') {
      // Left panel custom hooks
      gfx.lineBetween(startX, y - 4, startX + 16, y - 4)
      gfx.lineBetween(startX, y - 4, startX, y + 12)
    } else {
      // Right panel custom hooks
      gfx.lineBetween(startX + bgW, y - 4, startX + bgW - 16, y - 4)
      gfx.lineBetween(startX + bgW, y - 4, startX + bgW, y + 12)
    }
  }

  private updatePanel(
    panel: FighterPanel,
    fighter: Character,
    displayHp: number,
    setDisplayHp: (v: number) => void,
  ): void {
    // Smooth Health bar slide drainage
    const target = Math.max(0, fighter.player.health / fighter.player.maxHealth)
    const next = Phaser.Math.Linear(displayHp, target, 0.12)
    setDisplayHp(next)

    panel.hpFill.width = panel.hpBg.width * next
    panel.hpDelay.width = panel.hpBg.width * Phaser.Math.Linear(displayHp, target, 0.04)

    // Stamina/Shield block meter
    const guardPct = Phaser.Math.Clamp(fighter.guardStamina / fighter.maxGuardStamina, 0, 1)
    panel.guardFill.width = panel.guardBg.width * guardPct
    panel.guardFill.fillColor = fighter.characterState === 'guardBreak' ? 0xef4444 : 0x3b82f6

    // Ultimate charges
    const skillMax = fighter.player.skillCooldownMs / 1000
    const skillPct = skillMax > 0 ? 1 - fighter.skillCooldown / skillMax : 1
    const skillReady = fighter.skillReady
    
    panel.skillFill.width = panel.skillBg.width * Phaser.Math.Clamp(skillPct, 0, 1)
    panel.skillFill.setAlpha(skillReady ? 1 : 0.5)

    // Ultimate skill ready visuals
    if (skillReady) {
      panel.name.setColor('#ffffff')
      panel.name.setStroke('#000000', 2)
      panel.skillLabel.setColor('#fbbf24').setFontStyle('bold')
      panel.portrait.setTint(0xffffff)
      
      // Draw ultimate ready pulsing halo around portrait
      panel.portraitGlowGfx.clear()
      const color = 0xa855f7 // Purple glow key
      const portraitX = panel.portrait.x
      const portraitY = panel.portrait.y
      
      const pulseRadius = 18 + Math.sin(this.scene.time.now / 100) * 2.5
      const pulseAlpha = 0.55 + Math.sin(this.scene.time.now / 100) * 0.25
      
      panel.portraitGlowGfx.lineStyle(2.5, color, pulseAlpha)
      panel.portraitGlowGfx.strokeCircle(portraitX, portraitY, pulseRadius)
      
      // Scale dynamic avatar pulse
      if (panel.side === 'left' && !this.p1PortraitPulse) {
        this.p1PortraitPulse = this.scene.tweens.add({
          targets: panel.portrait,
          scale: 0.29,
          yoyo: true,
          repeat: -1,
          duration: 800,
          ease: 'Sine.easeInOut'
        })
      } else if (panel.side === 'right' && !this.p2PortraitPulse) {
        this.p2PortraitPulse = this.scene.tweens.add({
          targets: panel.portrait,
          scale: 0.29,
          yoyo: true,
          repeat: -1,
          duration: 800,
          ease: 'Sine.easeInOut'
        })
      }
    } else {
      // Normal/Muted State
      panel.name.setColor(fighter.player.color)
      panel.name.setStroke('', 0)
      panel.skillLabel.setColor('#64748b').setFontStyle('normal')
      panel.portrait.setTint(0xa1a1aa)
      panel.portraitGlowGfx.clear()
      
      // Stop portrait pulses
      if (panel.side === 'left' && this.p1PortraitPulse) {
        this.p1PortraitPulse.stop()
        this.p1PortraitPulse = undefined
        panel.portrait.setScale(0.26)
      } else if (panel.side === 'right' && this.p2PortraitPulse) {
        this.p2PortraitPulse.stop()
        this.p2PortraitPulse = undefined
        panel.portrait.setScale(0.26)
      }
    }

    // Dynamic hurt/stagger frame border flashing
    if (fighter.characterState === 'hurt') {
      panel.portrait.setTint(0xef4444)
    } else if (fighter.characterState === 'guardBreak') {
      panel.portrait.setTint(0xf97316)
    }
  }

  private renderPopups(popups: DamagePopup[]): void {
    for (const t of this.popupTexts) t.destroy()
    this.popupTexts = []

    for (const p of popups) {
      const text = this.scene.add
        .text(p.x, p.y, p.text.toUpperCase(), {
          fontFamily: 'monospace',
          fontSize: p.isSkill ? '13px' : '17px',
          fontStyle: 'bold',
          color: p.color,
          stroke: '#000000',
          strokeThickness: 3,
          shadow: { color: '#000000', fill: true, offsetX: 1, offsetY: 1, blur: 1 }
        })
        .setOrigin(0.5)
        .setAlpha(Math.min(1, p.ttl / 0.9))
        .setDepth(90)
      this.popupTexts.push(text)
    }
  }
}