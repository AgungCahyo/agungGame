import Phaser from 'phaser'
import type { HeroFolder } from '../data/animations'
import { animKey } from '../data/animations'
import type { ActionResult } from '../data/heroes'
import { createPlayerByFolder, type Player } from '../data/heroes'
import type { PlayerInput } from '../systems/InputSystem'
import { HIT_ACTIVE_FRAME, isHitboxState } from '../systems/HitboxSystem'
import { PHYSICS, decayVelocity, knockbackDirection } from '../systems/PhysicsSystem'
import { applySelfSkill, isSelfSkill, skillCooldownSec } from '../systems/SkillSystem'
import { StateMachine, stateToAnim, type CharacterState } from '../systems/StateMachine'

export type Facing = 'left' | 'right'

export class Character extends Phaser.GameObjects.Sprite {
  readonly folder: HeroFolder
  readonly groundY: number
  readonly player: Player
  readonly stateMachine = new StateMachine()

  facing: Facing
  isGrounded = true
  hitboxActive = false
  attackHitLanded = false
  skillHitLanded = false
  skillCooldown = 0

  boundsMinX = 48
  boundsMaxX = 912

  private velocityX = 0
  private velocityY = 0
  private isDashing = false
  private dashTimer = 0
  private dashCooldown = 0
  private knockbackTimer = 0

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    folder: HeroFolder,
    facing: Facing = 'right',
  ) {
    super(scene, x, y, animKey(folder, 'Idle'))
    this.folder = folder
    this.groundY = y
    this.facing = facing
    this.player = createPlayerByFolder(folder)

    scene.add.existing(this)
    this.setOrigin(0.5, 1)
    this.setScale(1.4)
    this.setFlipX(facing === 'left')
    this.enterState('idle')

    this.on('animationupdate', this.onAnimationUpdate, this)
    this.on('animationcomplete', this.onAnimationComplete, this)
  }

  get characterState(): CharacterState {
    return this.stateMachine.state
  }

  set characterState(nextState: CharacterState) {
    this.stateMachine.set(nextState)
  }

  get skillReady(): boolean {
    return this.skillCooldown <= 0
  }

  update(delta: number, input: PlayerInput, opponent: Character): void {
    if (this.characterState === 'dead') return

    const dt = delta / 1000
    this.dashCooldown = Math.max(0, this.dashCooldown - dt)
    this.skillCooldown = Math.max(0, this.skillCooldown - dt)

    if (input.dash) this.tryDash()

    this.processCombatInput(input, opponent)
    this.integratePhysics(delta, input)
  }

  setFacing(facing: Facing): void {
    if (this.facing === facing) return
    this.facing = facing
    this.setFlipX(facing === 'left')
  }

  faceToward(other: Character): void {
    if (this.characterState.startsWith('attack') || this.characterState === 'skill' || this.characterState === 'hurt') {
      return
    }
    this.setFacing(other.x >= this.x ? 'right' : 'left')
  }

  receiveDamage(amount: number, _isCrit: boolean, fromX?: number): void {
    if (this.characterState === 'dead' || this.characterState === 'shield') return

    this.player.takeDamage(amount)
    this.hitboxActive = false
    this.isDashing = false

    if (fromX !== undefined) {
      this.applyKnockback(fromX)
    } else {
      this.velocityX = 0
    }

    if (this.player.isDead()) {
      this.enterState('dead', true)
    } else {
      this.enterState('hurt', true)
    }
  }

  reactToSkillHit(fromX: number, result: ActionResult): void {
    if (result.kind !== 'damage') return

    this.hitboxActive = false
    this.isDashing = false
    this.applyKnockback(fromX)

    if (this.player.isDead()) {
      this.enterState('dead', true)
    } else {
      this.enterState('hurt', true)
    }
  }

  reactToSelfSkill(result: ActionResult): void {
    this.scene.events.emit('skill-self', this, result)
  }

  applyKnockback(fromX: number): void {
    const dir = knockbackDirection(fromX, this.x)
    this.velocityX = dir * PHYSICS.KNOCKBACK_X
    this.velocityY = PHYSICS.KNOCKBACK_Y
    this.isGrounded = false
    this.knockbackTimer = PHYSICS.KNOCKBACK_DURATION
  }

  enterState(state: CharacterState, force = false): void {
    if (!force && this.characterState === state) return

    const isAttack = state.startsWith('attack')
    if (isAttack || state === 'skill') {
      if (state === 'skill') {
        this.skillHitLanded = false
      } else {
        this.attackHitLanded = false
      }
      this.hitboxActive = false
      if (!this.isDashing) this.velocityX = 0
    }

    this.stateMachine.set(state)

    if (state === 'skill') {
      this.play(animKey(this.folder, this.player.skillAnimKey))
      return
    }

    this.playStateAnim(state, force || isAttack || state === 'hurt' || state === 'dead')
  }

  private tryDash(): void {
    if (
      !this.isGrounded ||
      this.isDashing ||
      this.dashCooldown > 0 ||
      this.knockbackTimer > 0 ||
      !this.stateMachine.canMove()
    ) {
      return
    }

    this.isDashing = true
    this.dashTimer = PHYSICS.DASH_DURATION
    this.dashCooldown = PHYSICS.DASH_COOLDOWN
    this.velocityX = (this.facing === 'right' ? 1 : -1) * PHYSICS.DASH_SPEED
    this.enterState('run', true)
  }

  private processCombatInput(input: PlayerInput, opponent: Character): void {
    if (this.isDashing || this.knockbackTimer > 0) return

    if (input.shield && this.stateMachine.canShield()) {
      this.enterState('shield')
      this.velocityX = 0
      return
    }

    if (this.characterState === 'shield' && !input.shield) {
      this.enterState('idle')
    }

    if (input.skill && this.skillCooldown <= 0 && this.stateMachine.canSkill()) {
      this.startSkill(opponent)
      return
    }

    if (!this.stateMachine.canAttack()) return

    if (input.attack1) this.startAttack('attack1', opponent)
    else if (input.attack2) this.startAttack('attack2', opponent)
    else if (input.attack3) this.startAttack('attack3', opponent)
  }

  private startSkill(opponent: Character): void {
    this.skillCooldown = skillCooldownSec(this.player)
    this.faceToward(opponent)

    this.scene.events.emit('skill-cast', this, this.player.skillLabel, this.player.color)

    if (isSelfSkill(this.player.heroId)) {
      const result = applySelfSkill(this)
      this.skillHitLanded = true
      this.enterState('skill', true)
      return
    }

    this.enterState('skill', true)
  }

  private startAttack(state: 'attack1' | 'attack2' | 'attack3', opponent: Character): void {
    this.faceToward(opponent)
    this.enterState(state, true)
  }

  private integratePhysics(delta: number, input: PlayerInput): void {
    const dt = delta / 1000

    if (this.characterState === 'shield') {
      this.velocityX = 0
      this.applyPosition(dt)
      return
    }

    if (this.isDashing) {
      this.dashTimer -= dt
      if (this.dashTimer <= 0) {
        this.isDashing = false
        this.velocityX = 0
        if (this.stateMachine.canMove()) this.enterState('idle')
      }
      this.applyPosition(dt)
      return
    }

    if (this.knockbackTimer > 0) {
      this.knockbackTimer -= dt
      this.velocityY += PHYSICS.GRAVITY * dt
      this.y += this.velocityY * dt
      this.velocityX = decayVelocity(this.velocityX, PHYSICS.KNOCKBACK_DECAY, dt)

      if (this.y >= this.groundY) {
        this.y = this.groundY
        this.velocityY = 0
        this.isGrounded = true
      } else {
        this.isGrounded = false
      }

      this.x += this.velocityX * dt
      this.x = Phaser.Math.Clamp(this.x, this.boundsMinX, this.boundsMaxX)
      return
    }

    if (this.stateMachine.isLocked() && this.characterState !== 'jump') {
      this.velocityX = 0
      this.applyPosition(dt)
      return
    }

    this.updateMovement(dt, input)
    this.applyPosition(dt)
  }

  private updateMovement(dt: number, input: PlayerInput): void {
    if (input.jump && this.isGrounded && this.stateMachine.canJump()) {
      this.startJump()
    }

    if (this.isGrounded) {
      if (this.stateMachine.canMove()) {
        this.applyGroundMovement(input)
      }
    } else {
      this.applyAirMovement(input)
      this.velocityY += PHYSICS.GRAVITY * dt
      this.y += this.velocityY * dt

      if (this.y >= this.groundY) {
        this.y = this.groundY
        this.velocityY = 0
        this.isGrounded = true
      }
    }

    if (this.isGrounded && this.characterState === 'jump') {
      this.syncGroundState(input)
    }
  }

  private applyPosition(dt: number): void {
    this.x += this.velocityX * dt
    this.x = Phaser.Math.Clamp(this.x, this.boundsMinX, this.boundsMaxX)
  }

  private startJump(): void {
    this.isGrounded = false
    this.velocityY = PHYSICS.JUMP_VELOCITY
    this.enterState('jump')
  }

  private applyGroundMovement(input: PlayerInput): void {
    const movingLeft = input.left && !input.right
    const movingRight = input.right && !input.left

    if (movingLeft) {
      this.velocityX = -(input.run ? PHYSICS.RUN_SPEED : PHYSICS.WALK_SPEED)
      this.setFacing('left')
      this.enterState(input.run ? 'run' : 'walk')
      return
    }

    if (movingRight) {
      this.velocityX = input.run ? PHYSICS.RUN_SPEED : PHYSICS.WALK_SPEED
      this.setFacing('right')
      this.enterState(input.run ? 'run' : 'walk')
      return
    }

    this.velocityX = 0
    this.enterState('idle')
  }

  private applyAirMovement(input: PlayerInput): void {
    const movingLeft = input.left && !input.right
    const movingRight = input.right && !input.left

    if (movingLeft) {
      this.velocityX = Phaser.Math.Linear(this.velocityX, -PHYSICS.AIR_SPEED, 1 - PHYSICS.AIR_FRICTION)
      this.setFacing('left')
    } else if (movingRight) {
      this.velocityX = Phaser.Math.Linear(this.velocityX, PHYSICS.AIR_SPEED, 1 - PHYSICS.AIR_FRICTION)
      this.setFacing('right')
    } else {
      this.velocityX *= PHYSICS.AIR_FRICTION
    }
  }

  private syncGroundState(input: PlayerInput): void {
    const movingLeft = input.left && !input.right
    const movingRight = input.right && !input.left

    if (movingLeft || movingRight) {
      this.enterState(input.run ? 'run' : 'walk')
    } else {
      this.enterState('idle')
    }
  }

  private playStateAnim(state: CharacterState, force = false): void {
    const key = animKey(this.folder, stateToAnim(state))
    if (!force && this.anims.currentAnim?.key === key && this.anims.isPlaying) return
    this.play(key)
  }

  private onAnimationUpdate(
    _animation: Phaser.Animations.Animation,
    frame: Phaser.Animations.AnimationFrame,
  ): void {
    if (!isHitboxState(this.characterState)) {
      this.hitboxActive = false
      return
    }

    this.hitboxActive = frame.index === HIT_ACTIVE_FRAME
  }

  private onAnimationComplete(animation: Phaser.Animations.Animation): void {
    const key = animation.key
    if (!key.startsWith(this.folder)) return

    if (this.characterState === 'skill') {
      this.hitboxActive = false
      if (this.characterState !== 'dead') this.enterState('idle', true)
      return
    }

    if (key.endsWith('Attack_1') || key.endsWith('Attack_2') || key.endsWith('Attack_3')) {
      this.hitboxActive = false
      if (this.characterState !== 'dead') this.enterState('idle', true)
      return
    }

    if (key.endsWith('Hurt')) {
      if (this.player.isDead()) this.enterState('dead', true)
      else this.enterState('idle', true)
    }
  }
}
