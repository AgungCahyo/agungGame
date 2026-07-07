export type AnimName =
  | 'Idle'
  | 'Walk'
  | 'Run'
  | 'Jump'
  | 'Attack_1'
  | 'Attack_2'
  | 'Attack_3'
  | 'Shield'
  | 'Hurt'
  | 'Dead'

export const FRAME_SIZE = 128
export const SPRITE_BASE = '/assets'

export const HERO_FOLDERS = [
  'Fighter',
  'Samurai',
  'Shinobi',
  'Vampire_Girl',
  'Converted_Vampire',
  'Countess_Vampire',
] as const

export type HeroFolder = (typeof HERO_FOLDERS)[number]

export const MOVEMENT_ANIMS = ['Idle', 'Walk', 'Run', 'Jump'] as const satisfies readonly AnimName[]

export const COMBAT_ANIMS = ['Attack_1', 'Attack_2', 'Attack_3', 'Shield', 'Hurt', 'Dead'] as const satisfies readonly AnimName[]

export const ALL_ANIMS = [...MOVEMENT_ANIMS, ...COMBAT_ANIMS] as const satisfies readonly AnimName[]

export const ANIM_META: Record<AnimName, { frames: number; fps: number; loop: boolean }> = {
  Idle: { frames: 5, fps: 8, loop: true },
  Walk: { frames: 8, fps: 10, loop: true },
  Run: { frames: 8, fps: 12, loop: true },
  Jump: { frames: 10, fps: 12, loop: false },
  Attack_1: { frames: 4, fps: 12, loop: false },
  Attack_2: { frames: 3, fps: 12, loop: false },
  Attack_3: { frames: 4, fps: 12, loop: false },
  Shield: { frames: 2, fps: 6, loop: true },
  Hurt: { frames: 3, fps: 12, loop: false },
  Dead: { frames: 3, fps: 8, loop: false },
}

/** Some heroes use different PNG filenames for the same logical animation. */
export const SHEET_FILE: Partial<Record<HeroFolder, Partial<Record<AnimName, string>>>> = {
  Converted_Vampire: { Shield: 'Protect' },
}

export function animKey(folder: string, anim: AnimName): string {
  return `${folder}_${anim}`
}

export function sheetPath(folder: HeroFolder, anim: AnimName): string {
  const file = SHEET_FILE[folder]?.[anim] ?? anim
  return `${SPRITE_BASE}/${folder}/${file}.png`
}
