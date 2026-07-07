import type { Character } from '../entities/Character'
import type { PlayerInput } from './InputSystem'
import { isThreatState } from './HitboxSystem'

const ATTACK_RANGE = 92
const APPROACH_RANGE = 260
const DANGER_RANGE = 140
const RETREAT_HP = 0.35

type AiMood = 'idle' | 'approach' | 'attack' | 'defend' | 'retreat'

export class AISystem {
  private thinkTimer = 0
  private mood: AiMood = 'approach'
  private moodTimer = 0
  private attackBias = 0

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

    if (this.thinkTimer <= 0) {
      this.thinkTimer = 0.12 + Math.random() * 0.08
      this.decideMood(self, target)
    }

    return this.buildInput(self, target)
  }

  private decideMood(self: Character, target: Character): void {
    const distance = Math.abs(target.x - self.x)
    const hpRatio = self.player.health / self.player.maxHealth
    const targetAttacking = isThreatState(target.characterState)
    const targetThreat = targetAttacking && distance < DANGER_RANGE

    if (targetThreat) {
      const roll = Math.random()
      if (roll < 0.42) this.setMood('defend', 0.45)
      else if (roll < 0.72) this.setMood('retreat', 0.35)
      else this.setMood('attack', 0.25)
      return
    }

    if (hpRatio < RETREAT_HP && distance < DANGER_RANGE) {
      this.setMood('retreat', 0.5)
      return
    }

    if (distance <= ATTACK_RANGE) {
      this.attackBias = Math.random()
      this.setMood('attack', 0.3)
      return
    }

    if (distance <= APPROACH_RANGE) {
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

      case 'attack':
        self.faceToward(target)
        if (distance <= ATTACK_RANGE + 16 && self.stateMachine.canAttack()) {
          if (self.skillReady && this.attackBias > 0.72) {
            input.skill = true
          } else if (this.attackBias < 0.45) {
            input.attack1 = true
          } else if (this.attackBias < 0.78) {
            input.attack2 = true
          } else {
            input.attack3 = true
          }
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

      default:
        if (this.moodTimer <= 0) this.setMood('approach', 0.35)
        break
    }

    return input
  }
}
