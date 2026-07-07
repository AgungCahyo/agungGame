import type { AnimName, HeroFolder } from './animations'

export type { AnimName }

export type ActionResult = {
  amount: number
  isCrit: boolean
  kind: 'damage' | 'heal'
  label: string
  animKey: AnimName
}

export function rollDamage(base: number) {
  const variance = 0.8 + Math.random() * 0.4
  const isCrit = Math.random() < 0.15
  const amount = Math.round(base * variance * (isCrit ? 1.6 : 1))
  return { amount, isCrit }
}

export class Player {
  health: number
  skillLabel = 'Skill'
  skillAnimKey: AnimName = 'Attack_2'

  constructor(
    public heroId: string,
    public name: string,
    public folder: string,
    public hitPoint: number,
    public maxHealth: number,
    public cooldownMs: number,
    public skillCooldownMs: number,
    public color: string,
  ) {
    this.health = maxHealth
  }

  attack(target: Player): ActionResult {
    const { amount, isCrit } = rollDamage(this.hitPoint)
    target.takeDamage(amount)
    return { amount, isCrit, kind: 'damage', label: 'Attack', animKey: 'Attack_1' }
  }

  skill(target: Player): ActionResult {
    return this.attack(target)
  }

  takeDamage(amount: number) {
    this.health = Math.max(0, this.health - amount)
  }

  heal(amount: number) {
    this.health = Math.min(this.maxHealth, this.health + amount)
  }

  isDead() {
    return this.health <= 0
  }
}

class Fighter extends Player {
  skillLabel = 'Combo Strike'
  skillAnimKey = 'Attack_2' as AnimName
  constructor(name: string) {
    super('fighter', name, 'Fighter', 18, 110, 550, 1400, '#4A90D9')
  }
  skill(target: Player): ActionResult {
    const amount = Math.round(this.hitPoint * 1.8)
    target.takeDamage(amount)
    return { amount, isCrit: false, kind: 'damage', label: this.skillLabel, animKey: this.skillAnimKey }
  }
}

class Samurai extends Player {
  skillLabel = 'Iaijutsu'
  skillAnimKey = 'Attack_3' as AnimName
  constructor(name: string) {
    super('samurai', name, 'Samurai', 24, 90, 700, 2200, '#B03A5B')
  }
  skill(target: Player): ActionResult {
    const executing = target.health / target.maxHealth < 0.3
    const { amount, isCrit } = rollDamage(this.hitPoint * (executing ? 2.2 : 1.3))
    target.takeDamage(amount)
    return { amount, isCrit, kind: 'damage', label: this.skillLabel, animKey: this.skillAnimKey }
  }
}

class Shinobi extends Player {
  skillLabel = 'Flurry'
  skillAnimKey = 'Attack_1' as AnimName
  constructor(name: string) {
    super('shinobi', name, 'Shinobi', 14, 95, 380, 1700, '#E8871E')
  }
  skill(target: Player): ActionResult {
    const hit1 = rollDamage(this.hitPoint * 0.65)
    const hit2 = rollDamage(this.hitPoint * 0.65)
    target.takeDamage(hit1.amount)
    target.takeDamage(hit2.amount)
    return {
      amount: hit1.amount + hit2.amount,
      isCrit: hit1.isCrit || hit2.isCrit,
      kind: 'damage',
      label: this.skillLabel,
      animKey: this.skillAnimKey,
    }
  }
}

class VampireGirl extends Player {
  skillLabel = 'Blood Drain'
  skillAnimKey = 'Attack_2' as AnimName
  constructor(name: string) {
    super('vampire_girl', name, 'Vampire_Girl', 16, 100, 600, 1900, '#9B5DE5')
  }
  skill(target: Player): ActionResult {
    const { amount, isCrit } = rollDamage(this.hitPoint * 1.4)
    target.takeDamage(amount)
    this.heal(Math.round(amount * 0.5))
    return { amount, isCrit, kind: 'damage', label: this.skillLabel, animKey: this.skillAnimKey }
  }
}

class ConvertedVampire extends Player {
  skillLabel = 'Fortify'
  skillAnimKey = 'Shield' as AnimName
  constructor(name: string) {
    super('converted_vampire', name, 'Converted_Vampire', 12, 150, 680, 3000, '#7C8B9A')
  }
  skill(_target: Player): ActionResult {
    const amount = Math.round(this.maxHealth * 0.22)
    this.heal(amount)
    return { amount, isCrit: false, kind: 'heal', label: this.skillLabel, animKey: this.skillAnimKey }
  }
}

class CountessVampire extends Player {
  skillLabel = 'Crimson Edge'
  // NOTE: her Attack_3.png on disk is a single static frame — the hitbox's
  // active frame index never occurs on a 1-frame animation, so that sheet
  // can never register a hit. Attack_4 is her real 6-frame special.
  skillAnimKey = 'Attack_4' as AnimName
  constructor(name: string) {
    super('countess_vampire', name, 'Countess_Vampire', 20, 85, 620, 2000, '#D9224A')
  }
  skill(target: Player): ActionResult {
    const variance = 0.8 + Math.random() * 0.4
    const amount = Math.round(this.hitPoint * variance * 1.6)
    target.takeDamage(amount)
    return { amount, isCrit: true, kind: 'damage', label: this.skillLabel, animKey: this.skillAnimKey }
  }
}

export type HeroId =
  | 'fighter'
  | 'samurai'
  | 'shinobi'
  | 'vampire_girl'
  | 'converted_vampire'
  | 'countess_vampire'

export const HERO_LIST: {
  id: HeroId
  label: string
  folder: HeroFolder
  color: string
  skillLabel: string
  tagline: string
  create: (name: string) => Player
}[] = [
  { id: 'fighter', label: 'Fighter', folder: 'Fighter', color: '#4A90D9', skillLabel: 'Combo Strike', tagline: 'Seimbang — Combo Strike', create: (n) => new Fighter(n) },
  { id: 'samurai', label: 'Samurai', folder: 'Samurai', color: '#B03A5B', skillLabel: 'Iaijutsu', tagline: 'Mematikan saat HP lawan rendah', create: (n) => new Samurai(n) },
  { id: 'shinobi', label: 'Shinobi', folder: 'Shinobi', color: '#E8871E', skillLabel: 'Flurry', tagline: 'Dua hit cepat', create: (n) => new Shinobi(n) },
  { id: 'vampire_girl', label: 'Vampire Girl', folder: 'Vampire_Girl', color: '#9B5DE5', skillLabel: 'Blood Drain', tagline: 'Serap HP lawan', create: (n) => new VampireGirl(n) },
  {
    id: 'converted_vampire',
    label: 'Converted Vampire',
    folder: 'Converted_Vampire',
    color: '#7C8B9A',
    skillLabel: 'Fortify',
    tagline: 'Pulihkan HP sendiri',
    create: (n) => new ConvertedVampire(n),
  },
  {
    id: 'countess_vampire',
    label: 'Countess Vampire',
    folder: 'Countess_Vampire',
    color: '#D9224A',
    skillLabel: 'Crimson Edge',
    tagline: 'Critical guaranteed',
    create: (n) => new CountessVampire(n),
  },
]

export function createPlayerByFolder(folder: HeroFolder): Player {
  const hero = HERO_LIST.find((h) => h.folder === folder)
  if (!hero) throw new Error(`Unknown hero folder: ${folder}`)
  return hero.create(hero.label)
}

export const ATTACK_DAMAGE_MULT: Record<'attack1' | 'attack2' | 'attack3', number> = {
  attack1: 1,
  attack2: 1.25,
  attack3: 1.5,
}