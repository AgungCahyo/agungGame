export type AnimName =
  | 'Idle'
  | 'Walk'
  | 'Run'
  | 'Jump'
  | 'Attack_1'
  | 'Attack_2'
  | 'Attack_3'
  | 'Attack_4'
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

/** Playback speed / loop behavior per animation type (shared across characters — only frame COUNT differs per sheet). */
export const ANIM_META: Record<AnimName, { fps: number; loop: boolean }> = {
  Idle: { fps: 8, loop: true },
  Walk: { fps: 10, loop: true },
  Run: { fps: 12, loop: true },
  Jump: { fps: 12, loop: false },
  Attack_1: { fps: 12, loop: false },
  Attack_2: { fps: 12, loop: false },
  Attack_3: { fps: 12, loop: false },
  Attack_4: { fps: 12, loop: false },
  Shield: { fps: 6, loop: true },
  Hurt: { fps: 12, loop: false },
  Dead: { fps: 8, loop: false },
}

type FrameEntry = { frames: number; file?: string }

/**
 * Per-character sheet data, measured directly from the PNGs in /public/assets.
 * IMPORTANT: every sheet is 128x128 per frame, but the FRAME COUNT is NOT the
 * same across characters — a shared/global frame count previously caused
 * out-of-bounds frame reads (invisible/garbled sprites) for several heroes.
 *
 * `file` lets a logical animation point at a differently-named PNG:
 *  - Converted_Vampire's "Shield" pose is actually named Protect.png
 *  - Vampire_Girl and Countess_Vampire have no dedicated shield sprite at all,
 *    so their Shield animation is aliased to their own Idle sheet as a safe
 *    fallback instead of loading a missing texture.
 */
export const CHAR_FRAMES: Record<HeroFolder, Partial<Record<AnimName, FrameEntry>>> = {
  Fighter: {
    Idle: { frames: 6 },
    Walk: { frames: 8 },
    Run: { frames: 8 },
    Jump: { frames: 10 },
    Attack_1: { frames: 4 },
    Attack_2: { frames: 3 },
    Attack_3: { frames: 4 },
    Shield: { frames: 2 },
    Hurt: { frames: 3 },
    Dead: { frames: 3 },
  },
  Samurai: {
    Idle: { frames: 6 },
    Walk: { frames: 8 },
    Run: { frames: 8 },
    Jump: { frames: 12 },
    Attack_1: { frames: 6 },
    Attack_2: { frames: 4 },
    Attack_3: { frames: 3 },
    Shield: { frames: 2 },
    Hurt: { frames: 2 },
    Dead: { frames: 3 },
  },
  Shinobi: {
    Idle: { frames: 6 },
    Walk: { frames: 8 },
    Run: { frames: 8 },
    Jump: { frames: 12 },
    Attack_1: { frames: 5 },
    Attack_2: { frames: 3 },
    Attack_3: { frames: 4 },
    Shield: { frames: 4 },
    Hurt: { frames: 2 },
    Dead: { frames: 4 },
  },
  Vampire_Girl: {
    Idle: { frames: 5 },
    Walk: { frames: 6 },
    Run: { frames: 6 },
    Jump: { frames: 6 },
    Attack_1: { frames: 5 },
    Attack_2: { frames: 4 },
    Attack_3: { frames: 2 },
    Attack_4: { frames: 5 },
    Shield: { frames: 5, file: 'Idle' }, // no shield sprite provided — safe fallback
    Hurt: { frames: 2 },
    Dead: { frames: 10 },
  },
  Converted_Vampire: {
    Idle: { frames: 5 },
    Walk: { frames: 8 },
    Run: { frames: 8 },
    Jump: { frames: 7 },
    Attack_1: { frames: 5 },
    Attack_2: { frames: 3 },
    Attack_3: { frames: 4 },
    Shield: { frames: 2, file: 'Protect' },
    Hurt: { frames: 1 },
    Dead: { frames: 8 },
  },
  Countess_Vampire: {
    Idle: { frames: 5 },
    Walk: { frames: 6 },
    Run: { frames: 6 },
    Jump: { frames: 6 },
    Attack_1: { frames: 6 },
    Attack_2: { frames: 3 },
    // Attack_3 on disk is a single static frame (not a usable swing) — kept
    // registered so nothing 404s, but no hero should be wired to use it as
    // a real action. Attack_4 is the real 6-frame special for this hero.
    Attack_3: { frames: 1 },
    Attack_4: { frames: 6 },
    Shield: { frames: 5, file: 'Idle' }, // no shield sprite provided — safe fallback
    Hurt: { frames: 2 },
    Dead: { frames: 8 },
  },
}

/** Every logical animation actually available (and safe to load) for a given hero folder. */
export function getCharAnims(folder: HeroFolder): AnimName[] {
  return Object.keys(CHAR_FRAMES[folder]) as AnimName[]
}

export function frameCount(folder: HeroFolder, anim: AnimName): number {
  return CHAR_FRAMES[folder]?.[anim]?.frames ?? 1
}

export function animKey(folder: string, anim: AnimName): string {
  return `${folder}_${anim}`
}

export function sheetPath(folder: HeroFolder, anim: AnimName): string {
  const file = CHAR_FRAMES[folder]?.[anim]?.file ?? anim
  return `${SPRITE_BASE}/${folder}/${file}.png`
}