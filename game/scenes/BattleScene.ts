import Phaser from 'phaser'
import type { ActionResult } from '../data/heroes'
import { DEFAULT_BATTLE, GameRegistry } from '../data/gameState'
import { Character } from '../entities/Character'
import { Enemy } from '../entities/Enemy'
import { CombatSystem } from '../systems/CombatSystem'
import { EffectsSystem } from '../systems/EffectsSystem'
import { getHitbox, getHurtbox } from '../systems/HitboxSystem'
import { InputSystem } from '../systems/InputSystem'
import { BattleUI } from '../ui/BattleUI'
import { GAME_WIDTH } from '../main'

const DEBUG_HITBOXES = false

export class BattleScene extends Phaser.Scene {
  private player!: Character
  private enemy!: Enemy
  private inputSystem!: InputSystem
  private combat!: CombatSystem
  private effects!: EffectsSystem
  private ui!: BattleUI
  private debugGfx?: Phaser.GameObjects.Graphics
  private keyR!: Phaser.Input.Keyboard.Key
  private keyEsc!: Phaser.Input.Keyboard.Key
  private battleOver = false

  constructor() {
    super({ key: 'BattleScene' })
  }

  create() {
    // scene.restart() reuses this same BattleScene instance and re-runs
    // create() — it does NOT re-run field initializers. Without resetting
    // these here, `battleOver` stays true forever after the first match and
    // every future match gets stuck (update() short-circuits into the
    // "battle over" branch and gameplay never runs again).
    this.battleOver = false
    this.combat = new CombatSystem()
    this.debugGfx?.destroy()
    this.debugGfx = undefined

    const setup = GameRegistry.battle ?? DEFAULT_BATTLE
    const { width, height } = this.scale
    const groundY = height - 48
    const arenaMin = 48
    const arenaMax = GAME_WIDTH - 48

    this.add.rectangle(width / 2, groundY + 40, width, 80, 0x2a2a3a)

    this.player = new Character(this, width * 0.35, groundY, setup.playerFolder, 'right')
    this.enemy = new Enemy(this, width * 0.65, groundY, setup.enemyFolder, 'left')

    for (const fighter of [this.player, this.enemy]) {
      fighter.boundsMinX = arenaMin
      fighter.boundsMaxX = arenaMax
    }

    this.inputSystem = new InputSystem(this)
    this.effects = new EffectsSystem(this)
    this.ui = new BattleUI(this, this.player, this.enemy)

    this.combat.onHit = (event) => this.effects.onHit(event)

    this.events.on('skill-self', (caster: Character, result: ActionResult) => {
      this.combat.addSkillPopup(caster, caster, result.label, result.amount, result.isCrit, result.kind)
    })

    this.events.on('skill-cast', (caster: Character, label: string, color: string) => {
      this.ui.showSkillFlash(label)
      this.effects.onSkillCast(caster.x, caster.y, color)
    })

    this.keyR = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.R)
    this.keyEsc = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.ESC)

    if (DEBUG_HITBOXES) {
      this.debugGfx = this.add.graphics()
    }

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.effects.destroy())
  }

  update(_time: number, delta: number) {
    this.effects.update(delta)
    this.combat.update(delta)

    if (this.battleOver) {
      this.handlePostBattleInput()
      this.ui.update(delta, this.player, this.enemy, this.combat, this.combat.getComboFor(this.player))
      return
    }

    if (this.effects.isHitStopped) {
      this.ui.update(delta, this.player, this.enemy, this.combat, this.combat.getComboFor(this.player))
      return
    }

    this.player.update(delta, this.inputSystem.getPlayer1(), this.enemy)
    this.enemy.update(delta, this.enemy.getAIInput(delta, this.player), this.player)

    this.combat.resolve([this.player, this.enemy])
    this.ui.update(delta, this.player, this.enemy, this.combat, this.combat.getComboFor(this.player))
    this.renderDebugHitboxes()

    if (this.player.characterState === 'dead' || this.enemy.characterState === 'dead') {
      this.battleOver = true
    }
  }

  private handlePostBattleInput(): void {
    if (Phaser.Input.Keyboard.JustDown(this.keyR)) {
      this.scene.restart()
    }
    if (Phaser.Input.Keyboard.JustDown(this.keyEsc)) {
      this.scene.start('MenuScene')
    }
  }

  private renderDebugHitboxes(): void {
    if (!this.debugGfx) return

    this.debugGfx.clear()

    for (const fighter of [this.player, this.enemy]) {
      const hurt = getHurtbox(fighter)
      this.debugGfx.lineStyle(1, 0x22c55e, 0.8)
      this.debugGfx.strokeRect(hurt.x, hurt.y, hurt.width, hurt.height)

      const hit = getHitbox(fighter)
      if (hit) {
        this.debugGfx.lineStyle(1, 0xef4444, 0.9)
        this.debugGfx.strokeRect(hit.x, hit.y, hit.width, hit.height)
      }
    }
  }
}