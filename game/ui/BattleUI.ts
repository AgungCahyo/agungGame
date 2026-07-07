import Phaser from 'phaser'
import type { Character } from '../entities/Character'
import type { CombatSystem, DamagePopup } from '../systems/CombatSystem'
import { GAME_WIDTH, GAME_HEIGHT } from '../main'

type FighterPanel = {
  name: Phaser.GameObjects.Text
  hpBg: Phaser.GameObjects.Rectangle
  hpFill: Phaser.GameObjects.Rectangle
  hpDelay: Phaser.GameObjects.Rectangle
  skillBg: Phaser.GameObjects.Rectangle
  skillFill: Phaser.GameObjects.Rectangle
  skillLabel: Phaser.GameObjects.Text
}

export class BattleUI {
  private readonly panelLeft: FighterPanel
  private readonly panelRight: FighterPanel
  private comboText: Phaser.GameObjects.Text
  private skillFlashText: Phaser.GameObjects.Text
  private overlayGroup: Phaser.GameObjects.Container
  private overlayTitle: Phaser.GameObjects.Text
  private overlayHint: Phaser.GameObjects.Text
  private popupTexts: Phaser.GameObjects.Text[] = []
  private displayHpLeft = 1
  private displayHpRight = 1

  constructor(
    private readonly scene: Phaser.Scene,
    player: Character,
    enemy: Character,
  ) {
    const depth = 100

    this.panelLeft = this.createPanel(24, player, 'left', true)
    this.panelRight = this.createPanel(GAME_WIDTH - 24, enemy, 'right', false)

    for (const p of [this.panelLeft, this.panelRight]) {
      p.name.setDepth(depth)
      p.hpBg.setDepth(depth)
      p.hpFill.setDepth(depth + 1)
      p.hpDelay.setDepth(depth)
      p.skillBg.setDepth(depth)
      p.skillFill.setDepth(depth + 1)
      p.skillLabel.setDepth(depth + 2)
    }

    this.comboText = scene.add
      .text(GAME_WIDTH / 2, 72, '', {
        fontFamily: 'monospace',
        fontSize: '22px',
        color: '#fbbf24',
        stroke: '#000000',
        strokeThickness: 3,
      })
      .setOrigin(0.5)
      .setDepth(depth + 3)

    this.skillFlashText = scene.add
      .text(GAME_WIDTH / 2, 100, '', {
        fontFamily: 'monospace',
        fontSize: '13px',
        color: '#c4b5fd',
      })
      .setOrigin(0.5)
      .setAlpha(0)
      .setDepth(depth + 3)

    this.overlayGroup = scene.add.container(GAME_WIDTH / 2, GAME_HEIGHT / 2).setDepth(300).setVisible(false)
    const overlayBg = scene.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.65)
    this.overlayTitle = scene.add.text(0, -20, '', {
      fontFamily: 'monospace',
      fontSize: '28px',
      color: '#ffffff',
    }).setOrigin(0.5)
    this.overlayHint = scene.add.text(0, 24, '[R] Main lagi   [Esc] Pilih hero', {
      fontFamily: 'monospace',
      fontSize: '12px',
      color: '#888899',
    }).setOrigin(0.5)
    this.overlayGroup.add([overlayBg, this.overlayTitle, this.overlayHint])
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

    this.comboText.setText(combo >= 2 ? `${combo}x COMBO` : '')
    this.comboText.setAlpha(combo >= 2 ? 1 : 0)

    this.renderPopups(combat.popups)

    if (player.characterState === 'dead' || enemy.characterState === 'dead') {
      const playerWon = enemy.characterState === 'dead'
      this.showOverlay(playerWon ? 'KAMU MENANG!' : 'KAMU KALAH', playerWon ? '#4ade80' : '#fb7185')
    }
  }

  showSkillFlash(label: string): void {
    this.skillFlashText.setText(label)
    this.skillFlashText.setAlpha(1)
    this.scene.tweens.add({
      targets: this.skillFlashText,
      alpha: 0,
      y: 88,
      duration: 700,
      onComplete: () => {
        this.skillFlashText.y = 100
      },
    })
  }

  hideOverlay(): void {
    this.overlayGroup.setVisible(false)
  }

  private showOverlay(title: string, color: string): void {
    this.overlayTitle.setText(title)
    this.overlayTitle.setColor(color)
    this.overlayGroup.setVisible(true)
  }

  private createPanel(x: number, fighter: Character, side: 'left' | 'right', isPlayer: boolean): FighterPanel {
    const y = 18
    const barW = 200
    const anchor = side === 'left' ? 0 : 1
    const barX = side === 'left' ? x : x - barW

    const name = this.scene.add
      .text(x, y, fighter.player.name, {
        fontFamily: 'monospace',
        fontSize: '11px',
        color: fighter.player.color,
      })
      .setOrigin(anchor, 0)

    const hpBg = this.scene.add.rectangle(barX, y + 18, barW, 10, 0x1a1a24).setOrigin(0, 0.5)
    const hpDelay = this.scene.add
      .rectangle(barX, y + 18, barW, 10, Phaser.Display.Color.HexStringToColor(fighter.player.color).color, 0.45)
      .setOrigin(0, 0.5)
    const hpFill = this.scene.add
      .rectangle(barX, y + 18, barW, 10, Phaser.Display.Color.HexStringToColor(fighter.player.color).color)
      .setOrigin(0, 0.5)

    const skillBg = this.scene.add.rectangle(barX, y + 32, barW, 4, 0x2a2a3a).setOrigin(0, 0.5)
    const skillFill = this.scene.add
      .rectangle(barX, y + 32, barW, 4, 0x9b5de5)
      .setOrigin(0, 0.5)

    const skillLabel = this.scene.add
      .text(barX, y + 40, isPlayer ? `[F] ${fighter.player.skillLabel}` : fighter.player.skillLabel, {
        fontFamily: 'monospace',
        fontSize: '9px',
        color: '#666677',
      })
      .setOrigin(0, 0)

    return { name, hpBg, hpFill, hpDelay, skillBg, skillFill, skillLabel }
  }

  private updatePanel(
    panel: FighterPanel,
    fighter: Character,
    displayHp: number,
    setDisplayHp: (v: number) => void,
  ): void {
    const target = Math.max(0, fighter.player.health / fighter.player.maxHealth)
    const next = Phaser.Math.Linear(displayHp, target, 0.12)
    setDisplayHp(next)

    panel.hpFill.width = panel.hpBg.width * next
    panel.hpDelay.width = panel.hpBg.width * Phaser.Math.Linear(displayHp, target, 0.04)

    const skillMax = fighter.player.skillCooldownMs / 1000
    const skillPct = skillMax > 0 ? 1 - fighter.skillCooldown / skillMax : 1
    panel.skillFill.width = panel.skillBg.width * Phaser.Math.Clamp(skillPct, 0, 1)
    panel.skillFill.setAlpha(fighter.skillReady ? 1 : 0.5)
  }

  private renderPopups(popups: DamagePopup[]): void {
    for (const t of this.popupTexts) t.destroy()
    this.popupTexts = []

    for (const p of popups) {
      const text = this.scene.add
        .text(p.x, p.y, p.text, {
          fontFamily: 'monospace',
          fontSize: p.isSkill ? '14px' : '18px',
          color: p.color,
          stroke: '#000000',
          strokeThickness: 2,
        })
        .setOrigin(0.5)
        .setAlpha(Math.min(1, p.ttl / 0.9))
        .setDepth(90)
      this.popupTexts.push(text)
    }
  }
}

