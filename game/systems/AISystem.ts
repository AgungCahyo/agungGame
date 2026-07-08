import type { Character } from '../entities/Character'
import type { AiDifficulty } from '../data/gameState'
import type { PlayerInput } from './InputSystem'
import { isThreatState } from './HitboxSystem'

const ATTACK_RANGE = 92
const APPROACH_RANGE = 260
const DANGER_RANGE = 140
const RETREAT_HP = 0.35

type AiMood = 'idle' | 'approach' | 'attack' | 'defend' | 'retreat' | 'punish'

type DifficultyConfig = {
  attackRecoveryMin: number
  attackRecoveryMax: number
  thinkIntervalMin: number
  thinkIntervalMax: number
  defendChance: number
  punishChance: number
  idlePauseChance: number
}

const DIFFICULTY_CONFIG: Record<AiDifficulty, DifficultyConfig> = {
  easy: {
    attackRecoveryMin: 0.75,
    attackRecoveryMax: 1.35,
    thinkIntervalMin: 0.22,
    thinkIntervalMax: 0.38,
    defendChance: 0.22,
    punishChance: 0.18,
    idlePauseChance: 0.35,
  },
  normal: {
    attackRecoveryMin: 0.45,
    attackRecoveryMax: 0.95,
    thinkIntervalMin: 0.12,
    thinkIntervalMax: 0.20,
    defendChance: 0.42,
    punishChance: 0.55,
    idlePauseChance: 0.22,
  },
  hard: {
    attackRecoveryMin: 0.28,
    attackRecoveryMax: 0.62,
    thinkIntervalMin: 0.07,
    thinkIntervalMax: 0.13,
    defendChance: 0.58,
    punishChance: 0.82,
    idlePauseChance: 0.10,
  },
}

export class AISystem {
  private readonly config: DifficultyConfig
  private thinkTimer = 0
  private mood: AiMood = 'approach'
  private moodTimer = 0
  private attackBias = 0
  private attackCooldown = 0

  constructor(difficulty: AiDifficulty = 'normal') {
    this.config = DIFFICULTY_CONFIG[difficulty]
  }

  update(delta: number, self: Character, target: Character): PlayerInput {
    const none: PlayerInput = {
      left: false,
      right: false,
      run: false,
      jump: false,
      dash: false,
      attack1: false,
      attack2: false,
      attack3: false,
      skill: false,
      shield: false,
    }

    if (self.characterState === 'dead' || target.characterState === 'dead') {
      return none
    }

    const dt = delta / 1000
    this.thinkTimer -= dt
    this.moodTimer -= dt
    this.attackCooldown = Math.max(0, this.attackCooldown - dt)

    if (this.thinkTimer <= 0) {
      this.thinkTimer =
        this.config.thinkIntervalMin +
        Math.random() * (this.config.thinkIntervalMax - this.config.thinkIntervalMin)
      this.decideMood(self, target)
    }

    return this.buildInput(self, target)
  }

  private decideMood(self: Character, target: Character): void {
    const distance = Math.abs(target.x - self.x)
    const hpRatio = self.player.health / self.player.maxHealth
    const targetAttacking = isThreatState(target.characterState)
    const targetThreat = targetAttacking && distance < DANGER_RANGE

    if (target.lastWhiffed && distance <= ATTACK_RANGE + 40) {
      if (Math.random() < this.config.punishChance) {
        this.setMood('punish', 0.35)
        target.lastWhiffed = false
        return
      }
    }

    if (targetThreat) {
      const roll = Math.random()
      if (roll < this.config.defendChance) this.setMood('defend', 0.45)
      else if (roll < this.config.defendChance + 0.28) this.setMood('retreat', 0.35)
      else this.setMood('attack', 0.25)
      return
    }

    if (hpRatio < RETREAT_HP && distance < DANGER_RANGE) {
      this.setMood('retreat', 0.5)
      return
    }

    if (distance <= ATTACK_RANGE) {
      if (Math.random() < this.config.idlePauseChance) {
        this.setMood('idle', 0.25 + Math.random() * 0.2)
        return
      }
      this.attackBias = Math.random()
      this.setMood('attack', 0.3)
      return
    }

    if (distance <= APPROACH_RANGE) {
      if (Math.random() < this.config.idlePauseChance * 0.6) {
        this.setMood('idle', 0.2 + Math.random() * 0.15)
        return
      }
      this.setMood('approach', 0.4)
      return
    }

    this.setMood('approach', 0.55)
  }

  private setMood(mood: AiMood, duration: number): void {
    this.mood = mood
    this.moodTimer = duration
    if (this.moodTimer <= 0) this.moodTimer = duration
  }

  private buildInput(self: Character, target: Character): PlayerInput {
    const input: PlayerInput = {
      left: false,
      right: false,
      run: false,
      jump: false,
      dash: false,
      attack1: false,
      attack2: false,
      attack3: false,
      skill: false,
      shield: false,
    }

    if (self.stateMachine.isLocked() && self.characterState !== 'shield') {
      return input
    }

    const dx = target.x - self.x
    const distance = Math.abs(dx)
    const towardRight = dx > 0

    switch (this.mood) {
      case 'defend':
        input.shield = true
        self.faceToward(target)
        break

      case 'retreat':
        input.run = true
        if (distance < 70 && Math.random() < 0.35) input.jump = true
        else if (Math.random() < 0.35) input.dash = true
        if (towardRight) {
          input.left = true
          self.setFacing('left')
        } else {
          input.right = true
          self.setFacing('right')
        }
        break

      case 'punish':
        self.faceToward(target)
        if (distance <= ATTACK_RANGE + 24) {
          this.tryAttack(input, self)
        } else if (towardRight) {
          input.right = true
          input.run = true
        } else {
          input.left = true
          input.run = true
        }
        break

      case 'attack':
        self.faceToward(target)
        if (distance <= ATTACK_RANGE + 16 && this.attackCooldown <= 0) {
          if (self.stateMachine.canAttack() || self.stateMachine.canJumpAttack()) {
            this.tryAttack(input, self)
            this.attackCooldown =
              this.config.attackRecoveryMin +
              Math.random() * (this.config.attackRecoveryMax - this.config.attackRecoveryMin)
          }
        } else if (distance <= ATTACK_RANGE + 16) {
          if (Math.random() < 0.3) input.shield = true
        } else if (towardRight) {
          input.right = true
          input.run = distance > ATTACK_RANGE
        } else {
          input.left = true
          input.run = distance > ATTACK_RANGE
        }
        break

      case 'approach':
        self.faceToward(target)
        if (towardRight) {
          input.right = true
          input.run = distance > 160
        } else {
          input.left = true
          input.run = distance > 160
        }
        if (distance > ATTACK_RANGE + 40 && Math.random() < 0.02) {
          input.jump = true
        }
        break

      case 'idle':
        self.faceToward(target)
        if (this.moodTimer <= 0) this.setMood('approach', 0.35)
        break

      default:
        if (this.moodTimer <= 0) this.setMood('approach', 0.35)
        break
    }

    return input
  }

  private tryAttack(input: PlayerInput, self: Character): void {
    if (self.skillReady && this.attackBias > 0.72) {
      input.skill = true
    } else if (self.stateMachine.canJumpAttack()) {
      input.attack1 = true
    } else if (this.attackBias < 0.45) {
      input.attack1 = true
    } else if (this.attackBias < 0.78) {
      input.attack2 = true
    } else {
      input.attack3 = true
    }
  }
}
