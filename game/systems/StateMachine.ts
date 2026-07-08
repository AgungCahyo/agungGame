import type { AnimName } from '../data/animations'

export type CharacterState =
  | 'idle'
  | 'walk'
  | 'run'
  | 'jump'
  | 'jumpAttack'
  | 'attack1'
  | 'attack2'
  | 'attack3'
  | 'skill'
  | 'shield'
  | 'hurt'
  | 'guardBreak'
  | 'dead'

const GROUND_STATES: ReadonlySet<CharacterState> = new Set(['idle', 'walk', 'run'])
const LOCKED_STATES: ReadonlySet<CharacterState> = new Set([
  'attack1',
  'attack2',
  'attack3',
  'jumpAttack',
  'skill',
  'hurt',
  'guardBreak',
  'dead',
])

export class StateMachine {
  private _state: CharacterState = 'idle'

  get state(): CharacterState {
    return this._state
  }

  isGroundedState(): boolean {
    return GROUND_STATES.has(this._state) || this._state === 'shield'
  }

  isLocked(): boolean {
    return LOCKED_STATES.has(this._state) || this._state === 'jump'
  }

  canMove(): boolean {
    return GROUND_STATES.has(this._state)
  }

  canJump(): boolean {
    return GROUND_STATES.has(this._state)
  }

  canAttack(): boolean {
    return GROUND_STATES.has(this._state)
  }

  canJumpAttack(): boolean {
    return this._state === 'jump'
  }

  canSkill(): boolean {
    return GROUND_STATES.has(this._state)
  }

  canShield(): boolean {
    return (
      this._state !== 'dead' &&
      this._state !== 'hurt' &&
      this._state !== 'guardBreak' &&
      !this._state.startsWith('attack') &&
      this._state !== 'jumpAttack' &&
      this._state !== 'skill' &&
      this._state !== 'jump'
    )
  }

  set(state: CharacterState): void {
    this._state = state
  }
}

export function stateToAnim(state: CharacterState): AnimName {
  switch (state) {
    case 'idle':
      return 'Idle'
    case 'walk':
      return 'Walk'
    case 'run':
      return 'Run'
    case 'jump':
      return 'Jump'
    case 'jumpAttack':
      return 'Attack_1'
    case 'attack1':
      return 'Attack_1'
    case 'attack2':
      return 'Attack_2'
    case 'attack3':
      return 'Attack_3'
    case 'shield':
      return 'Shield'
    case 'hurt':
      return 'Hurt'
    case 'guardBreak':
      return 'Hurt'
    case 'dead':
      return 'Dead'
    case 'skill':
      // Never actually used: Character.enterState plays the hero's own
      // player.skillAnimKey directly for the 'skill' state. This case only
      // exists so the switch is exhaustive for CharacterState.
      return 'Attack_2'
  }
}