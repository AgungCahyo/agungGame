import type { CharacterState } from './StateMachine'

/** Frame index (0-based) where hitbox becomes active — "frame 3" in design docs. */
export const HIT_ACTIVE_FRAME = 2

/**
 * Clamp the design's target hit-frame to whatever frames an animation
 * actually has. Some sheets (e.g. Countess_Vampire's 1-frame Attack_3) are
 * shorter than HIT_ACTIVE_FRAME — without this, the hitbox would never
 * activate and that action would silently never deal damage.
 */
export function getHitActiveFrame(totalFrames: number): number {
  return Math.max(0, Math.min(HIT_ACTIVE_FRAME, totalFrames - 1))
}

export type HitBox = {
  x: number
  y: number
  width: number
  height: number
}

export function boxesOverlap(a: HitBox, b: HitBox): boolean {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y
}

type CharacterLike = {
  x: number
  y: number
  scaleX: number
  facing: 'left' | 'right'
  characterState: CharacterState
  hitboxActive: boolean
}

export function isHitboxState(state: CharacterState): boolean {
  return state.startsWith('attack') || state === 'skill'
}

export function isAttackState(state: CharacterState): state is 'attack1' | 'attack2' | 'attack3' {
  return state === 'attack1' || state === 'attack2' || state === 'attack3'
}

export function isThreatState(state: CharacterState): boolean {
  return isHitboxState(state)
}

export function getHurtbox(char: CharacterLike): HitBox {
  const s = char.scaleX
  const w = 56 * s
  const h = 108 * s
  return {
    x: char.x - w / 2,
    y: char.y - h,
    width: w,
    height: h,
  }
}

export function getHitbox(char: CharacterLike): HitBox | null {
  if (!char.hitboxActive || !isHitboxState(char.characterState)) return null

  const s = char.scaleX
  const w = 52 * s
  const h = 34 * s
  const y = char.y - 88 * s

  if (char.facing === 'right') {
    return { x: char.x + 8 * s, y, width: w, height: h }
  }

  return { x: char.x - 8 * s - w, y, width: w, height: h }
}