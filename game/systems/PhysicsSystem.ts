export const PHYSICS = {
  GRAVITY: 980,
  WALK_SPEED: 130,
  RUN_SPEED: 240,
  AIR_SPEED: 115,
  AIR_FRICTION: 0.88,
  JUMP_VELOCITY: -340,
  KNOCKBACK_X: 240,
  KNOCKBACK_Y: -180,
  KNOCKBACK_DECAY: 480,
  KNOCKBACK_DURATION: 0.38,
  DASH_SPEED: 440,
  DASH_DURATION: 0.18,
  DASH_COOLDOWN: 0.5,
} as const

export function knockbackDirection(fromX: number, toX: number): 1 | -1 {
  return toX >= fromX ? 1 : -1
}

export function decayVelocity(velocity: number, decay: number, dt: number): number {
  const factor = Math.max(0, 1 - decay * dt)
  return velocity * factor
}
