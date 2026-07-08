import Phaser from 'phaser'
import type { ActionResult } from '../data/heroes'
import { DEFAULT_BATTLE, GameRegistry } from '../data/gameState'
import { Character } from '../entities/Character'
import { Enemy } from '../entities/Enemy'
import { CombatSystem, getHealthPct } from '../systems/CombatSystem'
import { EffectsSystem } from '../systems/EffectsSystem'
import { getHitbox, getHurtbox } from '../systems/HitboxSystem'
import { InputSystem } from '../systems/InputSystem'
import { BattleUI } from '../ui/BattleUI'
import { GAME_WIDTH } from '../main'

const DEBUG_HITBOXES = false
const ROUNDS_TO_WIN = 2
const MAX_ROUNDS = 3
const ROUND_TIME_SEC = 60
const SUDDEN_DEATH_HP = 15

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
  private roundOver = false
  private phase: 'intro' | 'fighting' | 'roundEnd' = 'intro'
  private matchStartTime = 0
  private roundStartTime = 0
  private currentRound = 1
  private playerWins = 0
  private enemyWins = 0
  private roundTimer = ROUND_TIME_SEC
  private suddenDeath = false
  private playerSpawnX = 0
  private enemySpawnX = 0

  constructor() {
    super({ key: 'BattleScene' })
  }

  create() {
    this.battleOver = false
    this.roundOver = false
    this.phase = 'intro'
    this.currentRound = 1
    this.playerWins = 0
    this.enemyWins = 0
    this.roundTimer = ROUND_TIME_SEC
    this.suddenDeath = false
    this.combat = new CombatSystem()
    this.debugGfx?.destroy()
    this.debugGfx = undefined

    const setup = GameRegistry.battle ?? DEFAULT_BATTLE
    const { width, height } = this.scale
    const groundY = height - 48
    const arenaMin = 48
    const arenaMax = GAME_WIDTH - 48

    this.add.rectangle(width / 2, groundY + 40, width, 80, 0x2a2a3a)

    this.playerSpawnX = width * 0.35
    this.enemySpawnX = width * 0.65

    this.player = new Character(this, this.playerSpawnX, groundY, setup.playerFolder, 'right')
    this.enemy = new Enemy(
      this,
      this.enemySpawnX,
      groundY,
      setup.enemyFolder,
      'left',
      setup.difficulty,
    )

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

    this.ui.updateScore(this.playerWins, this.enemyWins)
    this.playRoundIntro()
  }

  private playRoundIntro(): void {
    this.phase = 'intro'
    this.roundOver = false
    this.ui.hideOverlay()

    const roundLabel = this.suddenDeath ? 'SUDDEN DEATH' : `ROUND ${this.currentRound}`
    this.ui.showAnnouncement(roundLabel)
    this.time.delayedCall(650, () => {
      this.ui.showAnnouncement('FIGHT!')
      this.time.delayedCall(500, () => {
        this.ui.hideAnnouncement()
        this.phase = 'fighting'
        this.roundStartTime = this.time.now
        if (this.matchStartTime === 0) this.matchStartTime = this.time.now
        if (!this.suddenDeath) {
          this.roundTimer = ROUND_TIME_SEC
          this.ui.updateTimer(this.roundTimer)
        }
      })
    })
  }

  update(_time: number, delta: number) {
    this.effects.update(delta)
    this.combat.update(delta)
    this.effects.syncLowHpWarning([this.player, this.enemy])

    if (this.battleOver) {
      this.handlePostBattleInput()
      this.ui.update(delta, this.player, this.enemy, this.combat, this.combat.getComboFor(this.player))
      return
    }

    if (this.effects.isHitStopped) {
      this.ui.update(delta, this.player, this.enemy, this.combat, this.combat.getComboFor(this.player))
      return
    }

    if (this.phase === 'intro' || this.phase === 'roundEnd') {
      this.ui.update(delta, this.player, this.enemy, this.combat, this.combat.getComboFor(this.player))
      return
    }

    const dt = delta / 1000
    if (!this.suddenDeath) {
      this.roundTimer = Math.max(0, this.roundTimer - dt)
      this.ui.updateTimer(this.roundTimer)
    }

    this.player.update(delta, this.inputSystem.getPlayer1(), this.enemy)
    this.enemy.update(delta, this.enemy.getAIInput(delta, this.player), this.player)

    this.combat.resolve([this.player, this.enemy])
    this.ui.update(delta, this.player, this.enemy, this.combat, this.combat.getComboFor(this.player))
    this.renderDebugHitboxes()

    if (this.player.characterState === 'dead' || this.enemy.characterState === 'dead') {
      const playerWonRound = this.enemy.characterState === 'dead'
      this.endRound(playerWonRound ? 'player' : 'enemy')
      return
    }

    if (!this.suddenDeath && this.roundTimer <= 0) {
      this.endRoundByTimeout()
    }
  }

  private endRoundByTimeout(): void {
    const playerPct = getHealthPct(this.player.player)
    const enemyPct = getHealthPct(this.enemy.player)

    if (Math.abs(playerPct - enemyPct) < 0.001) {
      if (this.currentRound >= MAX_ROUNDS) {
        this.startSuddenDeath()
        return
      }
      this.endRound('draw')
      return
    }

    this.endRound(playerPct > enemyPct ? 'player' : 'enemy')
  }

  private startSuddenDeath(): void {
    this.suddenDeath = true
    this.combat.resetRoundStats()
    this.player.resetForRound(this.playerSpawnX)
    this.enemy.resetForRound(this.enemySpawnX)
    this.player.player.health = SUDDEN_DEATH_HP
    this.enemy.player.health = SUDDEN_DEATH_HP
    this.ui.updateScore(this.playerWins, this.enemyWins)
    this.ui.showSuddenDeath(true)
    this.playRoundIntro()
  }

  private endRound(winner: 'player' | 'enemy' | 'draw'): void {
    if (this.roundOver) return
    this.roundOver = true
    this.phase = 'roundEnd'

    if (winner === 'player') this.playerWins += 1
    else if (winner === 'enemy') this.enemyWins += 1

    this.ui.updateScore(this.playerWins, this.enemyWins)

    const matchOver =
      this.playerWins >= ROUNDS_TO_WIN ||
      this.enemyWins >= ROUNDS_TO_WIN ||
      (this.currentRound >= MAX_ROUNDS && winner !== 'draw')

    if (matchOver) {
      this.battleOver = true
      this.showMatchResult()
      return
    }

    const roundTitle =
      winner === 'draw'
        ? 'SERI!'
        : winner === 'player'
          ? 'RONDE MENANG!'
          : 'RONDE KALAH'

    const roundColor = winner === 'player' ? '#4ade80' : winner === 'enemy' ? '#fb7185' : '#fbbf24'

    this.ui.showRoundResult(roundTitle, roundColor, [
      `Skor: ${this.playerWins} - ${this.enemyWins}`,
      `Ronde ${this.currentRound} selesai`,
    ])

    this.time.delayedCall(2200, () => {
      if (this.battleOver) return
      this.currentRound += 1
      this.combat.resetRoundStats()
      this.player.resetForRound(this.playerSpawnX)
      this.enemy.resetForRound(this.enemySpawnX)
      this.ui.resetHpDisplays()
      this.ui.showSuddenDeath(false)
      this.playRoundIntro()
    })
  }

  private showMatchResult(): void {
    const playerWon = this.playerWins > this.enemyWins
    const durationSec = Math.max(0, (this.time.now - this.matchStartTime) / 1000)
    const longestCombo = Math.max(
      this.combat.getLongestCombo(this.player),
      this.combat.getLongestCombo(this.enemy),
    )

    this.ui.showResult(
      playerWon ? 'KAMU MENANG!' : 'KAMU KALAH',
      playerWon ? '#4ade80' : '#fb7185',
      [
        `Skor akhir: ${this.playerWins} - ${this.enemyWins}`,
        `Damage dealt: ${this.combat.getDamageDealt(this.player)}`,
        `Damage taken: ${this.combat.getDamageDealt(this.enemy)}`,
        `Combo terpanjang: ${longestCombo}x`,
        `Durasi match: ${durationSec.toFixed(1)}s`,
      ],
    )
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
