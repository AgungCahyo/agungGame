'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'

// ─────────────────────────────────────────────
// Sprite metadata — shared by every character folder in /public/assets/fighter
// All sheets are 128×128 per frame.
// ─────────────────────────────────────────────

type AnimName = 'Idle' | 'Walk' | 'Run' | 'Jump' | 'Attack_1' | 'Attack_2' | 'Attack_3' | 'Shield' | 'Hurt' | 'Dead'

const FRAME_SIZE = 128

const ANIM_META: Record<AnimName, { frames: number; fps: number; loop: boolean }> = {
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

const SPRITE_BASE = '/assets'

// ─────────────────────────────────────────────
// Core game logic — Player owns its own combat behavior
// ─────────────────────────────────────────────

type ActionResult = {
  amount: number
  isCrit: boolean
  kind: 'damage' | 'heal'
  label: string
  animKey: AnimName
}

function rollDamage(base: number) {
  const variance = 0.8 + Math.random() * 0.4 // 80%-120%
  const isCrit = Math.random() < 0.15
  const amount = Math.round(base * variance * (isCrit ? 1.6 : 1))
  return { amount, isCrit }
}

class Player {
  health: number
  skillLabel: string = 'Skill'
  skillAnimKey: AnimName = 'Attack_2'

  constructor(
    public heroId: string,
    public name: string,
    public folder: string,
    public hitPoint: number,
    public maxHealth: number,
    public cooldownMs: number,
    public skillCooldownMs: number,
    public color: string
  ) {
    this.health = maxHealth
  }

  /** Basic attack. Damage math lives here. */
  attack(target: Player): ActionResult {
    const { amount, isCrit } = rollDamage(this.hitPoint)
    target.takeDamage(amount)
    return { amount, isCrit, kind: 'damage', label: 'Attack', animKey: 'Attack_1' }
  }

  /** Every hero overrides this with its own ability. */
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

// ─────────────────────────────────────────────
// Heroes — 6 characters, each its own Player subclass
// ─────────────────────────────────────────────

class Fighter extends Player {
  skillLabel = 'Combo Strike'
  skillAnimKey = 'Attack_2' as AnimName
  constructor(name: string) {
    super('fighter', name, 'Fighter', 18, 110, 550, 1400, '#3b82f6')
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
    super('samurai', name, 'Samurai', 24, 90, 700, 2200, '#ec4899')
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
    super('shinobi', name, 'Shinobi', 14, 95, 380, 1700, '#f59e0b')
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
    super('vampire_girl', name, 'Vampire_Girl', 16, 100, 600, 1900, '#a855f7')
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
    super('converted_vampire', name, 'Converted_Vampire', 12, 150, 680, 3000, '#14b8a6')
  }
  skill(_target: Player): ActionResult {
    const amount = Math.round(this.maxHealth * 0.22)
    this.heal(amount)
    return { amount, isCrit: false, kind: 'heal', label: this.skillLabel, animKey: this.skillAnimKey }
  }
}

class CountessVampire extends Player {
  skillLabel = 'Crimson Edge'
  skillAnimKey = 'Attack_3' as AnimName
  constructor(name: string) {
    super('countess_vampire', name, 'Countess_Vampire', 20, 85, 620, 2000, '#f43f5e')
  }
  skill(target: Player): ActionResult {
    const variance = 0.8 + Math.random() * 0.4
    const amount = Math.round(this.hitPoint * variance * 1.6)
    target.takeDamage(amount)
    return { amount, isCrit: true, kind: 'damage', label: this.skillLabel, animKey: this.skillAnimKey }
  }
}

// ─────────────────────────────────────────────
// Hero roster metadata
// ─────────────────────────────────────────────

type HeroId = 'fighter' | 'samurai' | 'shinobi' | 'vampire_girl' | 'converted_vampire' | 'countess_vampire'

const HERO_LIST: {
  id: HeroId
  label: string
  folder: string
  color: string
  tagline: string
  skillLabel: string
  stats: { hp: number; dmg: number; atkCooldown: number; skillCooldown: number }
  create: (name: string) => Player
}[] = [
  { id: 'fighter', label: 'Fighter', folder: 'Fighter', color: '#3b82f6', tagline: 'Balance — High hit consistency', skillLabel: 'Combo Strike', stats: { hp: 110, dmg: 18, atkCooldown: 550, skillCooldown: 1400 }, create: (name) => new Fighter(name) },
  { id: 'samurai', label: 'Samurai', folder: 'Samurai', color: '#ec4899', tagline: 'Heavy hitter — Executes low HP targets', skillLabel: 'Iaijutsu', stats: { hp: 90, dmg: 24, atkCooldown: 700, skillCooldown: 2200 }, create: (name) => new Samurai(name) },
  { id: 'shinobi', label: 'Shinobi', folder: 'Shinobi', color: '#f59e0b', tagline: 'Agility — Fast multi-strike attacker', skillLabel: 'Flurry', stats: { hp: 95, dmg: 14, atkCooldown: 380, skillCooldown: 1700 }, create: (name) => new Shinobi(name) },
  { id: 'vampire_girl', label: 'Vampire Girl', folder: 'Vampire_Girl', color: '#a855f7', tagline: 'Lifesteal — Steals HP on attack', skillLabel: 'Blood Drain', stats: { hp: 100, dmg: 16, atkCooldown: 600, skillCooldown: 1900 }, create: (name) => new VampireGirl(name) },
  { id: 'converted_vampire', label: 'Converted Vampire', folder: 'Converted_Vampire', color: '#14b8a6', tagline: 'Tank — Regenerates HP to fortify defense', skillLabel: 'Fortify', stats: { hp: 150, dmg: 12, atkCooldown: 680, skillCooldown: 3000 }, create: (name) => new ConvertedVampire(name) },
  { id: 'countess_vampire', label: 'Countess Vampire', folder: 'Countess_Vampire', color: '#f43f5e', tagline: 'Glass Cannon — Guaranteed critical hits', skillLabel: 'Crimson Edge', stats: { hp: 85, dmg: 20, atkCooldown: 620, skillCooldown: 2000 }, create: (name) => new CountessVampire(name) },
]

// ─────────────────────────────────────────────
// Sprite character renderer
// ─────────────────────────────────────────────

type PulseKind = 'none' | 'hit' | 'heal'

function SpriteCharacter({
  folder,
  anim,
  facing,
  dead,
  pulseKind,
  pulseId,
  onAnimEnd,
  scale = 1.4,
}: {
  folder: string
  anim: AnimName
  facing: 'left' | 'right'
  dead: boolean
  pulseKind: PulseKind
  pulseId: number
  onAnimEnd?: () => void
  scale?: number
}) {
  const [frame, setFrame] = useState(0)
  const meta = ANIM_META[anim]
  const onAnimEndRef = useRef(onAnimEnd)
  onAnimEndRef.current = onAnimEnd

  useEffect(() => {
    setFrame(0)
    const interval = setInterval(() => {
      setFrame((prev) => {
        const next = prev + 1
        if (next >= meta.frames) {
          if (meta.loop) return 0
          onAnimEndRef.current?.()
          return meta.frames - 1
        }
        return next
      })
    }, 1000 / meta.fps)
    return () => clearInterval(interval)
  }, [anim, folder, meta.frames, meta.loop, meta.fps])

  const [activePulse, setActivePulse] = useState<PulseKind>('none')
  const prevPulse = useRef(pulseId)
  useEffect(() => {
    if (pulseId !== prevPulse.current) {
      prevPulse.current = pulseId
      setActivePulse(pulseKind)
      const t = setTimeout(() => setActivePulse('none'), 260)
      return () => clearTimeout(t)
    }
  }, [pulseId, pulseKind])

  const flinchX = activePulse === 'hit' ? -15 : 0
  const bobY = activePulse === 'heal' ? -10 : 0

  const filter =
    activePulse === 'hit'
      ? 'brightness(1.8) drop-shadow(0 0 12px #ef4444)'
      : activePulse === 'heal'
      ? 'drop-shadow(0 0 15px #10b981) brightness(1.3)'
      : 'none'

  return (
    <div
      style={{
        width: FRAME_SIZE * scale,
        height: FRAME_SIZE * scale,
        transform: dead
          ? `translateY(15px) rotate(${facing === 'right' ? 8 : -8}deg)`
          : `translateX(${flinchX * (facing === 'left' ? -1 : 1)}px) translateY(${bobY}px)`,
        transition: dead ? 'transform 0.5s ease-in' : 'transform 0.15s ease-out, filter 0.15s ease-out',
        filter,
        opacity: dead ? 0.45 : 1,
        overflow: 'hidden',
      }}
      className="flex items-center justify-center"
    >
      <div
        style={{
          width: FRAME_SIZE,
          height: FRAME_SIZE,
          transform: `scale(${scale}) scaleX(${facing === 'left' ? -1 : 1})`,
          transformOrigin: 'center',
          backgroundImage: `url(${SPRITE_BASE}/${folder}/${anim}.png)`,
          backgroundPosition: `-${frame * FRAME_SIZE}px 0px`,
          backgroundRepeat: 'no-repeat',
          imageRendering: 'pixelated',
        }}
      />
    </div>
  )
}

// ─────────────────────────────────────────────
// Health / cooldown bars
// ─────────────────────────────────────────────

function HealthBar({ current, max }: { current: number; max: number }) {
  const pct = Math.max(0, Math.round((current / max) * 100))
  const color = pct > 50 ? 'from-emerald-500 to-teal-400' : pct > 25 ? 'from-amber-500 to-yellow-400' : 'from-rose-600 to-red-500'
  
  // Custom ghost delay bar handler
  const [delayPct, setDelayPct] = useState(100)
  useEffect(() => {
    const t = setTimeout(() => {
      if (delayPct > pct) {
        setDelayPct(Math.max(pct, delayPct - 1.5))
      } else if (delayPct < pct) {
        setDelayPct(pct)
      }
    }, 40)
    return () => clearTimeout(t)
  }, [pct, delayPct])

  return (
    <div className="w-full h-4 rounded-md bg-slate-950/80 overflow-hidden border border-white/10 p-[2px] relative shadow-[inset_0_2px_4px_rgba(0,0,0,0.6)]">
      {/* Ghost damage bar */}
      <div 
        className="absolute top-[2px] bottom-[2px] left-[2px] bg-red-400/30 rounded-sm transition-all duration-300 ease-out" 
        style={{ width: `calc(${delayPct}% - 4px)` }} 
      />
      {/* Main progress bar */}
      <div 
        className={`h-full bg-gradient-to-r ${color} rounded-sm transition-all duration-300 ease-out`} 
        style={{ width: `${pct}%` }} 
      />
    </div>
  )
}

function CooldownBar({ pct, color }: { pct: number; color: string }) {
  return (
    <div className="w-full h-2 rounded bg-slate-950/80 overflow-hidden border border-white/5 relative">
      <div 
        className="h-full transition-all duration-75 ease-linear" 
        style={{ 
          width: `${pct * 100}%`, 
          background: `linear-gradient(to right, ${color}cc, ${color})`,
          boxShadow: `0 0 8px ${color}`
        }} 
      />
    </div>
  )
}

// ─────────────────────────────────────────────
// Visual Stat Bar (Selection Screen)
// ─────────────────────────────────────────────

function StatVisualBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100))
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-[10px] font-mono tracking-wider text-slate-400">
        <span>{label}</span>
        <span className="font-semibold text-white">{value}</span>
      </div>
      <div className="w-full h-1.5 rounded-full bg-slate-950 border border-white/5 overflow-hidden">
        <div 
          className="h-full rounded-full transition-all duration-500 ease-out" 
          style={{ width: `${pct}%`, backgroundColor: color, boxShadow: `0 0 6px ${color}` }}
        />
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────

type Popup = { id: number; text: string; crit: boolean; kind: 'damage' | 'heal'; side: 'left' | 'right' }
type Spark = { id: number; side: 'left' | 'right' }

export default function Home() {
  const [screen, setScreen] = useState<'select' | 'battle'>('select')
  const [p1HeroId, setP1HeroId] = useState<HeroId | null>(null)
  const [p2HeroId, setP2HeroId] = useState<HeroId | null>(null)
  
  // Customizable Player Names
  const [p1Name, setP1Name] = useState('Player 1')
  const [p2Name, setP2Name] = useState('Player 2')

  const playersRef = useRef<{ p1: Player; p2: Player } | null>(null)
  const [, setRenderTick] = useState(0)
  const rerender = () => setRenderTick((v) => v + 1)

  const [p1Anim, setP1AnimState] = useState<AnimName>('Idle')
  const [p2Anim, setP2AnimState] = useState<AnimName>('Idle')
  const p1AnimRef = useRef<AnimName>('Idle')
  const p2AnimRef = useRef<AnimName>('Idle')
  const setP1Anim = (a: AnimName) => { p1AnimRef.current = a; setP1AnimState(a) }
  const setP2Anim = (a: AnimName) => { p2AnimRef.current = a; setP2AnimState(a) }

  const p1BusyRef = useRef(false)
  const p2BusyRef = useRef(false)

  const p1AtkReadyRef = useRef(0)
  const p1SkillReadyRef = useRef(0)
  const p2AtkReadyRef = useRef(0)
  const p2SkillReadyRef = useRef(0)

  const gameOverRef = useRef<string | null>(null)
  const [gameOverName, setGameOverNameState] = useState<string | null>(null)
  const setGameOverName = (n: string | null) => { gameOverRef.current = n; setGameOverNameState(n) }

  const [p1Pulse, setP1Pulse] = useState<{ kind: PulseKind; id: number }>({ kind: 'none', id: 0 })
  const [p2Pulse, setP2Pulse] = useState<{ kind: PulseKind; id: number }>({ kind: 'none', id: 0 })
  const bumpPulse = (side: 'p1' | 'p2', kind: PulseKind) => {
    const setter = side === 'p1' ? setP1Pulse : setP2Pulse
    setter((prev) => ({ kind, id: prev.id + 1 }))
  }

  const [log, setLog] = useState<{ msg: string; type: 'damage' | 'heal' | 'system' | 'critical' | 'skill' }[]>([])
  const [popups, setPopups] = useState<Popup[]>([])
  const [sparks, setSparks] = useState<Spark[]>([])
  const [arenaShake, setArenaShake] = useState(false)
  const [nowTick, setNowTick] = useState(Date.now())

  const popupId = useRef(0)
  const sparkId = useRef(0)
  const logContainerRef = useRef<HTMLDivElement>(null)

  const wait = (ms: number) => new Promise((res) => setTimeout(res, ms))
  
  const pushLog = (msg: string, type: 'damage' | 'heal' | 'system' | 'critical' | 'skill' = 'system') => {
    setLog((prev) => [...prev.slice(-19), { msg, type }])
  }

  // Auto scroll logs
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight
    }
  }, [log])

  const spawnPopup = (side: 'left' | 'right', text: string, crit: boolean, kind: 'damage' | 'heal') => {
    const id = popupId.current++
    setPopups((prev) => [...prev, { id, text, crit, kind, side }])
    setTimeout(() => setPopups((prev) => prev.filter((p) => p.id !== id)), 900)
  }
  const spawnSpark = (side: 'left' | 'right') => {
    const id = sparkId.current++
    setSparks((prev) => [...prev, { id, side }])
    setTimeout(() => setSparks((prev) => prev.filter((s) => s.id !== id)), 260)
  }
  const triggerImpact = () => {
    setArenaShake(true)
    setTimeout(() => setArenaShake(false), 180)
  }

  useEffect(() => {
    if (screen !== 'battle' || gameOverName) return
    const id = setInterval(() => setNowTick(Date.now()), 50)
    return () => clearInterval(id)
  }, [screen, gameOverName])

  useEffect(() => {
    if (screen !== 'battle' || gameOverName) return

    const now = Date.now()
    const applyMotion = (side: 'p1' | 'p2') => {
      const busyRef = side === 'p1' ? p1BusyRef : p2BusyRef
      if (busyRef.current) return

      const currentAnim = side === 'p1' ? p1AnimRef.current : p2AnimRef.current
      const isTransientAnim =
        currentAnim === 'Attack_1' ||
        currentAnim === 'Attack_2' ||
        currentAnim === 'Attack_3' ||
        currentAnim === 'Shield' ||
        currentAnim === 'Hurt' ||
        currentAnim === 'Dead' ||
        currentAnim === 'Jump'

      if (isTransientAnim) return

      const attackReadyRef = side === 'p1' ? p1AtkReadyRef : p2AtkReadyRef
      const skillReadyRef = side === 'p1' ? p1SkillReadyRef : p2SkillReadyRef
      const nextReadyAt = Math.min(attackReadyRef.current, skillReadyRef.current)
      const timeToNext = Math.max(0, nextReadyAt - now)
      const targetAnim = timeToNext < 320 ? 'Run' : timeToNext < 900 ? 'Walk' : 'Idle'

      if (side === 'p1' && p1AnimRef.current !== targetAnim) {
        setP1Anim(targetAnim)
      } else if (side === 'p2' && p2AnimRef.current !== targetAnim) {
        setP2Anim(targetAnim)
      }
    }

    applyMotion('p1')
    applyMotion('p2')
  }, [screen, gameOverName, nowTick])

  const playReaction = async (side: 'p1' | 'p2', died: boolean) => {
    const setAnim = side === 'p1' ? setP1Anim : setP2Anim
    if (died) {
      setAnim('Dead')
      return
    }
    setAnim('Hurt')
    await wait((ANIM_META.Hurt.frames / ANIM_META.Hurt.fps) * 1000)
    if (!gameOverRef.current) setAnim('Idle')
  }

  const performAction = async (side: 'p1' | 'p2', action: 'attack' | 'skill') => {
    if (screen !== 'battle') return
    if (gameOverRef.current) return
    const players = playersRef.current
    if (!players) return

    const busyRef = side === 'p1' ? p1BusyRef : p2BusyRef
    if (busyRef.current) return

    const now = Date.now()
    const readyRef =
      side === 'p1' ? (action === 'attack' ? p1AtkReadyRef : p1SkillReadyRef) : (action === 'attack' ? p2AtkReadyRef : p2SkillReadyRef)
    if (now < readyRef.current) return

    const attacker = side === 'p1' ? players.p1 : players.p2
    const defender = side === 'p1' ? players.p2 : players.p1
    const setAnim = side === 'p1' ? setP1Anim : setP2Anim
    const defenderSide: 'left' | 'right' = side === 'p1' ? 'right' : 'left'
    const attackerSide: 'left' | 'right' = side === 'p1' ? 'left' : 'right'
    const cooldown = action === 'attack' ? attacker.cooldownMs : attacker.skillCooldownMs

    readyRef.current = now + cooldown
    busyRef.current = true

    const result = action === 'attack' ? attacker.attack(defender) : attacker.skill(defender)
    const animMeta = ANIM_META[result.animKey]
    const totalMs = (animMeta.frames / animMeta.fps) * 1000

    setAnim('Run')
    await wait(Math.max(120, totalMs * 0.18))
    setAnim(result.animKey)
    await wait(totalMs * 0.55)

    if (gameOverRef.current) { busyRef.current = false; return }

    if (result.kind === 'heal') {
      spawnPopup(attackerSide, `+${result.amount}`, false, 'heal')
      bumpPulse(side, 'heal')
      pushLog(`${attacker.name} uses ${result.label}, restoring +${result.amount} HP`, 'heal')
    } else {
      spawnPopup(defenderSide, `-${result.amount}`, result.isCrit, 'damage')
      spawnSpark(defenderSide)
      triggerImpact()
      bumpPulse(side === 'p1' ? 'p2' : 'p1', 'hit')
      pushLog(
        `${attacker.name} uses ${result.label} on ${defender.name} dealing -${result.amount} damage ${result.isCrit ? '(CRITICAL!)' : ''}`, 
        result.isCrit ? 'critical' : action === 'skill' ? 'skill' : 'damage'
      )
    }
    rerender()

    const defenderDied = defender.health <= 0
    if (defenderDied) {
      pushLog(`⚔️ ${defender.name} falls! ${attacker.name} is victorious!`, 'system')
      setGameOverName(attacker.name)
    } else if (result.kind === 'damage') {
      playReaction(side === 'p1' ? 'p2' : 'p1', false)
    } else if (defenderDied) {
      playReaction(side === 'p1' ? 'p2' : 'p1', true)
    }

    await wait(totalMs * 0.45)
    busyRef.current = false
    if (!gameOverRef.current) setAnim('Idle')
  }

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (screen !== 'battle') return
      const key = e.key.toLowerCase()
      if (key === 'd') performAction('p1', 'attack')
      if (key === 'f') performAction('p1', 'skill')
      if (key === 'k') performAction('p2', 'attack')
      if (key === 'l') performAction('p2', 'skill')
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [screen])

  const setupMatch = (log1: string) => {
    p1AtkReadyRef.current = 0
    p1SkillReadyRef.current = 0
    p2AtkReadyRef.current = 0
    p2SkillReadyRef.current = 0
    p1BusyRef.current = false
    p2BusyRef.current = false
    setP1Anim('Idle')
    setP2Anim('Idle')
    setGameOverName(null)
    setLog([{ msg: log1, type: 'system' }])
    setPopups([])
    setSparks([])
  }

  const startBattle = () => {
    if (!p1HeroId || !p2HeroId) return
    const h1 = HERO_LIST.find((h) => h.id === p1HeroId)!
    const h2 = HERO_LIST.find((h) => h.id === p2HeroId)!
    playersRef.current = { p1: h1.create(p1Name), p2: h2.create(p2Name) }
    setupMatch('DUEL STARTED! P1: [D] Attack / [F] Skill  —  P2: [K] Attack / [L] Skill.')
    setScreen('battle')
  }

  const rematch = () => {
    if (!playersRef.current) return
    const h1 = HERO_LIST.find((h) => h.id === playersRef.current!.p1.heroId) ?? HERO_LIST[0]
    const h2 = HERO_LIST.find((h) => h.id === playersRef.current!.p2.heroId) ?? HERO_LIST[0]
    playersRef.current = { p1: h1.create(p1Name), p2: h2.create(p2Name) }
    setupMatch('NEW ROUND! P1: [D] Attack / [F] Skill  —  P2: [K] Attack / [L] Skill.')
  }

  const backToSelect = () => {
    playersRef.current = null
    setScreen('select')
  }

  const p1 = playersRef.current?.p1
  const p2 = playersRef.current?.p2

  const cooldownPct = (readyAt: number, cooldownMs: number) => {
    const remaining = readyAt - nowTick
    return Math.min(1, Math.max(0, 1 - remaining / cooldownMs))
  }

  // Active hero selection metadata
  const p1SelectedData = HERO_LIST.find((h) => h.id === p1HeroId)
  const p2SelectedData = HERO_LIST.find((h) => h.id === p2HeroId)

  return (
    <main className="min-h-screen w-full flex items-center justify-center px-4 py-6 sm:py-10 bg-grid-cyber select-none relative scanline">
      {screen === 'select' && (
        <div className="w-full max-w-6xl flex flex-col gap-6 z-20">
          {/* Header Area */}
          <div className="text-center py-4 bg-slate-950/40 border border-white/5 rounded-2xl backdrop-blur-xl">
            <p className="text-[11px] tracking-[0.45em] text-cyan-400 font-mono uppercase">RETRO ARCADE ARENA</p>
            <h1 className="text-3xl sm:text-4xl font-black mt-1 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-400 to-rose-400 tracking-tight">
              SPRITE DUEL PROTOTYPE
            </h1>
            <p className="text-slate-400 text-xs mt-2 max-w-lg mx-auto">
              Simulasi pertarungan 1v1 antar karakter fantasi klasik dengan interface retro modern.
            </p>
          </div>

          {/* Symmetrical Split Dashboard */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
            {/* Player 1 Selection Panel */}
            <div className={`lg:col-span-4 rounded-3xl border transition-all duration-300 flex flex-col p-5 bg-slate-950/60 backdrop-blur-xl ${
              p1HeroId ? 'border-blue-500/30 shadow-[0_0_25px_rgba(59,130,246,0.15)]' : 'border-white/10'
            }`}>
              <div className="flex items-center justify-between pb-3 border-b border-white/5 mb-4">
                <span className="text-xs font-mono font-bold tracking-widest text-blue-400">PLAYER 1 [BLUE]</span>
                <span className="text-[10px] font-mono text-slate-500">READY SLOT</span>
              </div>

              {/* Player 1 Name Customizer */}
              <input 
                type="text" 
                value={p1Name} 
                onChange={(e) => setP1Name(e.target.value)}
                maxLength={14}
                className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded-lg text-sm text-blue-300 placeholder-slate-600 focus:outline-none focus:border-blue-500 tracking-wide font-medium text-center mb-4 transition-colors"
                placeholder="Edit Name..."
              />

              {/* Holographic Portrait Slot */}
              <div className="aspect-video lg:h-44 w-full rounded-2xl bg-gradient-to-b from-slate-900 to-slate-950 border border-white/5 overflow-hidden flex items-center justify-center relative shadow-[inset_0_4px_12px_rgba(0,0,0,0.8)]">
                <div className="absolute inset-0 opacity-15 bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.4),transparent_75%)]" />
                {p1SelectedData ? (
                  <div className="relative hover:scale-105 transition-transform duration-300">
                    <SpriteCharacter folder={p1SelectedData.folder} anim="Idle" facing="right" dead={false} pulseKind="none" pulseId={0} scale={1.8} />
                    <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 h-[3px] w-12 bg-blue-500 rounded-full blur-[2px] opacity-75" />
                  </div>
                ) : (
                  <div className="text-center space-y-1">
                    <div className="w-12 h-12 border-2 border-dashed border-blue-500/20 rounded-full flex items-center justify-center mx-auto text-blue-500/40 text-xl font-black animate-pulse">?</div>
                    <span className="text-[10px] font-mono text-slate-500 block uppercase tracking-widest animate-pulse">WAITING SELECTION</span>
                  </div>
                )}
              </div>

              {/* Bio & Description */}
              {p1SelectedData ? (
                <div className="mt-4 flex-grow flex flex-col justify-between">
                  <div>
                    <h2 className="text-lg font-bold text-white tracking-wide">{p1SelectedData.label}</h2>
                    <p className="text-slate-400 text-xs mt-1 leading-relaxed font-mono">{p1SelectedData.tagline}</p>
                    <div className="mt-3 py-1.5 px-2 bg-blue-950/20 border border-blue-900/30 rounded-lg text-[10px] font-mono text-blue-400 flex justify-between items-center">
                      <span>SPECIAL SKILL:</span>
                      <span className="font-bold text-white">{p1SelectedData.skillLabel}</span>
                    </div>
                  </div>

                  {/* Horizontal visual stat sliders */}
                  <div className="space-y-2 mt-4 pt-4 border-t border-white/5">
                    <StatVisualBar label="HEALTH POINTS" value={p1SelectedData.stats.hp} max={150} color="#3b82f6" />
                    <StatVisualBar label="ATTACK DAMAGE" value={p1SelectedData.stats.dmg} max={30} color="#3b82f6" />
                    <StatVisualBar label="ATTACK RECOVERY" value={1000 - p1SelectedData.stats.atkCooldown} max={1000} color="#3b82f6" />
                  </div>
                </div>
              ) : (
                <div className="flex-grow flex items-center justify-center py-10">
                  <p className="text-xs text-slate-600 font-mono italic">Pilih hero di grid tengah untuk melihat statistik detail.</p>
                </div>
              )}
            </div>

            {/* Central Unified Selection Grid & Controller */}
            <div className="lg:col-span-4 flex flex-col justify-between gap-5 bg-slate-950/40 border border-white/5 rounded-3xl p-5 backdrop-blur-xl">
              <div>
                <h3 className="text-xs font-mono font-bold tracking-widest text-center text-slate-400 mb-4 uppercase">GRID SELECTION</h3>
                <div className="grid grid-cols-3 gap-3">
                  {HERO_LIST.map((h) => {
                    const isP1 = p1HeroId === h.id
                    const isP2 = p2HeroId === h.id
                    return (
                      <div key={h.id} className="relative flex flex-col gap-1">
                        <button
                          onClick={() => {
                            if (!p1HeroId || (p1HeroId && p2HeroId)) {
                              setP1HeroId(h.id)
                            } else {
                              setP2HeroId(h.id)
                            }
                          }}
                          className={`aspect-square rounded-2xl border transition-all duration-300 p-2 flex flex-col items-center justify-center relative overflow-hidden group ${
                            isP1 && isP2
                              ? 'border-purple-500 bg-purple-950/20 shadow-[0_0_15px_rgba(168,85,247,0.25)]'
                              : isP1
                              ? 'border-blue-500 bg-blue-950/20 shadow-[0_0_15px_rgba(59,130,246,0.25)]'
                              : isP2
                              ? 'border-rose-500 bg-rose-950/20 shadow-[0_0_15px_rgba(244,63,94,0.25)]'
                              : 'border-white/10 bg-slate-900/60 hover:bg-slate-900 hover:border-white/20'
                          }`}
                        >
                          {/* Mini pixelated sprite illustration */}
                          <div 
                            className="w-16 h-16 pointer-events-none transition-transform duration-300 group-hover:scale-110"
                            style={{
                              backgroundImage: `url(${SPRITE_BASE}/${h.folder}/Idle.png)`,
                              backgroundPosition: '0px 0px',
                              backgroundRepeat: 'no-repeat',
                              imageRendering: 'pixelated',
                              transform: 'scale(1.2)'
                            }}
                          />
                          
                          {/* Indicator Flags */}
                          <div className="absolute top-1 right-1 flex gap-0.5">
                            {isP1 && <span className="text-[7px] font-black font-mono bg-blue-500 text-white px-1 py-[1px] rounded leading-none shadow-sm">P1</span>}
                            {isP2 && <span className="text-[7px] font-black font-mono bg-rose-500 text-white px-1 py-[1px] rounded leading-none shadow-sm">P2</span>}
                          </div>
                        </button>
                        <span className="text-[10px] font-mono text-center text-slate-400 truncate">{h.label}</span>
                      </div>
                    )
                  })}
                </div>

                {/* Quick Selection Assist buttons */}
                <div className="grid grid-cols-2 gap-2 mt-4">
                  <button 
                    onClick={() => { setP1HeroId(null); setP2HeroId(null) }}
                    className="py-1 px-2 border border-white/10 rounded-md text-[9px] font-mono hover:bg-white/5 text-slate-500 hover:text-white transition-colors"
                  >
                    RESET BOTH
                  </button>
                  <button 
                    onClick={() => {
                      const ids = HERO_LIST.map(h => h.id)
                      const random1 = ids[Math.floor(Math.random() * ids.length)]
                      let random2 = ids[Math.floor(Math.random() * ids.length)]
                      while (random1 === random2 && ids.length > 1) {
                        random2 = ids[Math.floor(Math.random() * ids.length)]
                      }
                      setP1HeroId(random1)
                      setP2HeroId(random2)
                    }}
                    className="py-1 px-2 border border-white/10 rounded-md text-[9px] font-mono hover:bg-white/5 text-slate-500 hover:text-white transition-colors"
                  >
                    RANDOM DUEL
                  </button>
                </div>
              </div>

              {/* Action trigger button */}
              <div className="space-y-3">
                <button
                  onClick={startBattle}
                  disabled={!p1HeroId || !p2HeroId}
                  className="w-full relative group overflow-hidden bg-gradient-to-r from-blue-600 via-purple-600 to-rose-600 hover:brightness-110 disabled:opacity-40 disabled:hover:brightness-100 transition-all text-white text-xs font-bold tracking-widest font-mono uppercase px-4 py-3.5 rounded-xl shadow-lg cursor-pointer"
                >
                  <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300 pointer-events-none" />
                  Mulai Pertarungan
                </button>

                <div className="text-center">
                  <Link
                    href="/battle"
                    className="inline-flex items-center gap-1.5 justify-center py-2 px-4 rounded-xl border border-cyan-500/20 bg-cyan-500/5 text-[10px] font-mono text-cyan-400 hover:bg-cyan-500/10 hover:border-cyan-400/30 transition-all font-semibold"
                  >
                    🚀 COBA PHASER FIGHT MODE
                  </Link>
                </div>
              </div>
            </div>

            {/* Player 2 Selection Panel */}
            <div className={`lg:col-span-4 rounded-3xl border transition-all duration-300 flex flex-col p-5 bg-slate-950/60 backdrop-blur-xl ${
              p2HeroId ? 'border-rose-500/30 shadow-[0_0_25px_rgba(244,63,94,0.15)]' : 'border-white/10'
            }`}>
              <div className="flex items-center justify-between pb-3 border-b border-white/5 mb-4">
                <span className="text-xs font-mono font-bold tracking-widest text-rose-400">PLAYER 2 [ROSE]</span>
                <span className="text-[10px] font-mono text-slate-500">READY SLOT</span>
              </div>

              {/* Player 2 Name Customizer */}
              <input 
                type="text" 
                value={p2Name} 
                onChange={(e) => setP2Name(e.target.value)}
                maxLength={14}
                className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded-lg text-sm text-rose-300 placeholder-slate-600 focus:outline-none focus:border-rose-500 tracking-wide font-medium text-center mb-4 transition-colors"
                placeholder="Edit Name..."
              />

              {/* Holographic Portrait Slot */}
              <div className="aspect-video lg:h-44 w-full rounded-2xl bg-gradient-to-b from-slate-900 to-slate-950 border border-white/5 overflow-hidden flex items-center justify-center relative shadow-[inset_0_4px_12px_rgba(0,0,0,0.8)]">
                <div className="absolute inset-0 opacity-15 bg-[radial-gradient(circle_at_center,rgba(244,63,94,0.4),transparent_75%)]" />
                {p2SelectedData ? (
                  <div className="relative hover:scale-105 transition-transform duration-300">
                    <SpriteCharacter folder={p2SelectedData.folder} anim="Idle" facing="left" dead={false} pulseKind="none" pulseId={0} scale={1.8} />
                    <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 h-[3px] w-12 bg-rose-500 rounded-full blur-[2px] opacity-75" />
                  </div>
                ) : (
                  <div className="text-center space-y-1">
                    <div className="w-12 h-12 border-2 border-dashed border-rose-500/20 rounded-full flex items-center justify-center mx-auto text-rose-500/40 text-xl font-black animate-pulse">?</div>
                    <span className="text-[10px] font-mono text-slate-500 block uppercase tracking-widest animate-pulse">WAITING SELECTION</span>
                  </div>
                )}
              </div>

              {/* Bio & Description */}
              {p2SelectedData ? (
                <div className="mt-4 flex-grow flex flex-col justify-between">
                  <div>
                    <h2 className="text-lg font-bold text-white tracking-wide">{p2SelectedData.label}</h2>
                    <p className="text-slate-400 text-xs mt-1 leading-relaxed font-mono">{p2SelectedData.tagline}</p>
                    <div className="mt-3 py-1.5 px-2 bg-rose-950/20 border border-rose-900/30 rounded-lg text-[10px] font-mono text-rose-400 flex justify-between items-center">
                      <span>SPECIAL SKILL:</span>
                      <span className="font-bold text-white">{p2SelectedData.skillLabel}</span>
                    </div>
                  </div>

                  {/* Horizontal visual stat sliders */}
                  <div className="space-y-2 mt-4 pt-4 border-t border-white/5">
                    <StatVisualBar label="HEALTH POINTS" value={p2SelectedData.stats.hp} max={150} color="#f43f5e" />
                    <StatVisualBar label="ATTACK DAMAGE" value={p2SelectedData.stats.dmg} max={30} color="#f43f5e" />
                    <StatVisualBar label="ATTACK RECOVERY" value={1000 - p2SelectedData.stats.atkCooldown} max={1000} color="#f43f5e" />
                  </div>
                </div>
              ) : (
                <div className="flex-grow flex items-center justify-center py-10">
                  <p className="text-xs text-slate-600 font-mono italic">Pilih hero di grid tengah untuk melihat statistik detail.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {screen === 'battle' && p1 && p2 && (
        <div className="w-full max-w-4xl flex flex-col gap-5 z-20">
          {/* Symmetrical Top Battle HUD */}
          <div className="glass-panel border border-white/10 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4 relative overflow-hidden shadow-2xl">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-900/10 via-slate-900/5 to-rose-900/10 pointer-events-none" />
            
            {/* Player 1 HUD Block */}
            <div className="w-full md:w-5/12 flex items-center gap-3">
              <div 
                className="w-12 h-12 rounded-xl bg-slate-900 border-2 overflow-hidden flex items-center justify-center shadow-md relative"
                style={{ borderColor: p1.color }}
              >
                <div 
                  style={{
                    width: FRAME_SIZE,
                    height: FRAME_SIZE,
                    backgroundImage: `url(${SPRITE_BASE}/${p1.folder}/Idle.png)`,
                    backgroundPosition: '0px 0px',
                    backgroundRepeat: 'no-repeat',
                    imageRendering: 'pixelated',
                    transform: 'scale(1.3)'
                  }}
                  className="scale-x-[-1]"
                />
              </div>
              <div className="flex-grow">
                <div className="flex justify-between items-baseline mb-1">
                  <span className="font-bold text-sm tracking-wide text-blue-200">{p1.name}</span>
                  <span className="text-xs font-mono font-bold text-blue-400">{p1.health} / {p1.maxHealth}</span>
                </div>
                <HealthBar current={p1.health} max={p1.maxHealth} />
              </div>
            </div>

            {/* Central Vs Node & Title */}
            <div className="flex flex-col items-center">
              <span className="text-[10px] font-mono tracking-[0.25em] text-slate-500 font-bold uppercase">MATCH TELEMETRY</span>
              <div className="h-9 w-9 rounded-full bg-slate-950 border border-white/10 flex items-center justify-center text-xs font-black text-rose-500 tracking-wide mt-1 shadow-md">
                VS
              </div>
            </div>

            {/* Player 2 HUD Block */}
            <div className="w-full md:w-5/12 flex items-center gap-3 flex-row-reverse">
              <div 
                className="w-12 h-12 rounded-xl bg-slate-900 border-2 overflow-hidden flex items-center justify-center shadow-md relative"
                style={{ borderColor: p2.color }}
              >
                <div 
                  style={{
                    width: FRAME_SIZE,
                    height: FRAME_SIZE,
                    backgroundImage: `url(${SPRITE_BASE}/${p2.folder}/Idle.png)`,
                    backgroundPosition: '0px 0px',
                    backgroundRepeat: 'no-repeat',
                    imageRendering: 'pixelated',
                    transform: 'scale(1.3)'
                  }}
                />
              </div>
              <div className="flex-grow">
                <div className="flex justify-between items-baseline mb-1 flex-row-reverse">
                  <span className="font-bold text-sm tracking-wide text-rose-200">{p2.name}</span>
                  <span className="text-xs font-mono font-bold text-rose-400">{p2.health} / {p2.maxHealth}</span>
                </div>
                <HealthBar current={p2.health} max={p2.maxHealth} />
              </div>
            </div>
          </div>

          {/* Graphics Arena */}
          <div className={`relative rounded-[28px] border border-white/10 bg-slate-950/70 overflow-hidden shadow-2xl ${
            arenaShake ? 'animate-arena-shake' : ''
          }`}>
            {/* Glowing background highlights */}
            <div
              className="absolute inset-0 opacity-20 pointer-events-none"
              style={{
                background: `
                  radial-gradient(circle at 20% 60%, ${p1.color}44, transparent 45%),
                  radial-gradient(circle at 80% 60%, ${p2.color}44, transparent 45%)
                `
              }}
            />
            {/* Cyber Floor Grid overlay */}
            <div className="absolute bottom-0 left-0 right-0 h-1/3 bg-grid-cyber opacity-20 pointer-events-none" />

            {/* Screen Actions visual layout */}
            <div className="relative flex items-end justify-between px-16 pt-10 pb-8 h-64 z-10">
              {/* Player 1 sprite representation */}
              <div className="relative">
                <SpriteCharacter folder={p1.folder} anim={p1Anim} facing="right" dead={p1.health <= 0} pulseKind={p1Pulse.kind} pulseId={p1Pulse.id} />
                
                {/* Float-up Popup text handler */}
                {popups.filter((p) => p.side === 'left').map((p) => (
                  <span 
                    key={p.id} 
                    className={`animate-float-up absolute -top-8 left-1/2 -translate-x-1/2 font-mono font-black text-xl tracking-tight filter drop-shadow-md select-none ${
                      p.kind === 'heal' ? 'text-emerald-400' : p.crit ? 'text-yellow-400 text-2xl font-black' : 'text-red-400'
                    }`}
                  >
                    {p.text}
                    {p.crit && p.kind === 'damage' && <span className="text-[10px] ml-1 bg-yellow-500 text-black px-1 py-[1px] rounded tracking-wide leading-none align-middle font-sans">CRIT</span>}
                  </span>
                ))}

                {/* Hit effect spark burst */}
                {sparks.filter((s) => s.side === 'left').map((s) => (
                  <span 
                    key={s.id} 
                    className="animate-spark absolute top-10 left-1/2 -translate-x-1/2 w-14 h-14 rounded-full pointer-events-none bg-[radial-gradient(circle,rgba(255,255,255,0.95),rgba(239,68,68,0.7)_40%,transparent_75%)]" 
                  />
                ))}
              </div>

              {/* VS static tag */}
              <span className="text-white/10 font-black tracking-widest text-4xl mb-12 select-none">VS</span>

              {/* Player 2 sprite representation */}
              <div className="relative">
                <SpriteCharacter folder={p2.folder} anim={p2Anim} facing="left" dead={p2.health <= 0} pulseKind={p2Pulse.kind} pulseId={p2Pulse.id} />
                
                {/* Float-up Popup text handler */}
                {popups.filter((p) => p.side === 'right').map((p) => (
                  <span 
                    key={p.id} 
                    className={`animate-float-up absolute -top-8 left-1/2 -translate-x-1/2 font-mono font-black text-xl tracking-tight filter drop-shadow-md select-none ${
                      p.kind === 'heal' ? 'text-emerald-400' : p.crit ? 'text-yellow-400 text-2xl font-black' : 'text-red-400'
                    }`}
                  >
                    {p.text}
                    {p.crit && p.kind === 'damage' && <span className="text-[10px] ml-1 bg-yellow-500 text-black px-1 py-[1px] rounded tracking-wide leading-none align-middle font-sans">CRIT</span>}
                  </span>
                ))}

                {/* Hit effect spark burst */}
                {sparks.filter((s) => s.side === 'right').map((s) => (
                  <span 
                    key={s.id} 
                    className="animate-spark absolute top-10 left-1/2 -translate-x-1/2 w-14 h-14 rounded-full pointer-events-none bg-[radial-gradient(circle,rgba(255,255,255,0.95),rgba(239,68,68,0.7)_40%,transparent_75%)]" 
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Lower Dashboard (Arcade panels & sci-fi terminal log) */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-stretch">
            {/* Player 1 Keyboard control panels */}
            <div className="md:col-span-3 glass-panel border border-white/5 rounded-2xl p-4 flex flex-col justify-between bg-slate-950/40">
              <div className="text-center border-b border-white/5 pb-2 mb-3">
                <span className="text-[9px] font-mono tracking-widest text-slate-500 font-bold uppercase">{p1.name} CABINET</span>
              </div>
              <div className="space-y-3 flex-grow flex flex-col justify-center">
                <div className="space-y-1">
                  <button 
                    onClick={() => performAction('p1', 'attack')}
                    className="w-full active:scale-95 transition-transform duration-75 text-white font-black py-2.5 rounded-xl border border-blue-500/40 bg-blue-500/10 hover:bg-blue-500/20 text-xs tracking-wider flex items-center justify-between px-4"
                  >
                    <span>ATTACK</span>
                    <kbd className="px-1.5 py-0.5 rounded bg-blue-500 text-white text-[9px] font-mono leading-none">D</kbd>
                  </button>
                  <CooldownBar pct={cooldownPct(p1AtkReadyRef.current, p1.cooldownMs)} color={p1.color} />
                </div>

                <div className="space-y-1">
                  <button 
                    onClick={() => performAction('p1', 'skill')} 
                    className="w-full active:scale-95 transition-transform duration-75 text-white font-black py-2.5 rounded-xl border border-purple-500/40 bg-purple-500/10 hover:bg-purple-500/20 text-[10px] tracking-wider flex items-center justify-between px-4"
                  >
                    <span className="truncate mr-1 uppercase">{p1.skillLabel}</span>
                    <kbd className="px-1.5 py-0.5 rounded bg-purple-500 text-white text-[9px] font-mono leading-none">F</kbd>
                  </button>
                  <CooldownBar pct={cooldownPct(p1SkillReadyRef.current, p1.skillCooldownMs)} color={p1.color} />
                </div>
              </div>
            </div>

            {/* Center Sci-fi Command Terminal Log */}
            <div className="md:col-span-6 glass-panel border border-white/5 rounded-2xl p-3 flex flex-col justify-between h-44 bg-black/50">
              <div className="flex items-center justify-between border-b border-white/5 pb-1.5 mb-2 px-1">
                <span className="text-[9px] font-mono tracking-widest text-slate-500 font-bold uppercase">COMBAT LOG FEEDS</span>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              </div>
              <div 
                ref={logContainerRef} 
                className="flex-grow overflow-y-auto space-y-1.5 custom-scrollbar px-1 text-[10px] font-mono leading-normal select-text"
              >
                {log.map((line, i) => {
                  let logColor = 'text-slate-400'
                  if (line.type === 'damage') logColor = 'text-rose-400'
                  else if (line.type === 'heal') logColor = 'text-emerald-400 font-bold'
                  else if (line.type === 'critical') logColor = 'text-yellow-400 font-extrabold tracking-wide'
                  else if (line.type === 'skill') logColor = 'text-purple-400 font-semibold'
                  else if (line.type === 'system') logColor = 'text-blue-300 font-bold'

                  return (
                    <p key={i} className={`${logColor} tracking-wide border-l-2 pl-2 border-white/5`}>
                      <span className="text-white/20 mr-1 select-none">›</span>
                      {line.msg}
                    </p>
                  )
                })}
              </div>
            </div>

            {/* Player 2 Keyboard control panels */}
            <div className="md:col-span-3 glass-panel border border-white/5 rounded-2xl p-4 flex flex-col justify-between bg-slate-950/40">
              <div className="text-center border-b border-white/5 pb-2 mb-3">
                <span className="text-[9px] font-mono tracking-widest text-slate-500 font-bold uppercase">{p2.name} CABINET</span>
              </div>
              <div className="space-y-3 flex-grow flex flex-col justify-center">
                <div className="space-y-1">
                  <button 
                    onClick={() => performAction('p2', 'attack')}
                    className="w-full active:scale-95 transition-transform duration-75 text-white font-black py-2.5 rounded-xl border border-rose-500/40 bg-rose-500/10 hover:bg-rose-500/20 text-xs tracking-wider flex items-center justify-between px-4"
                  >
                    <span>ATTACK</span>
                    <kbd className="px-1.5 py-0.5 rounded bg-rose-500 text-white text-[9px] font-mono leading-none">K</kbd>
                  </button>
                  <CooldownBar pct={cooldownPct(p2AtkReadyRef.current, p2.cooldownMs)} color={p2.color} />
                </div>

                <div className="space-y-1">
                  <button 
                    onClick={() => performAction('p2', 'skill')} 
                    className="w-full active:scale-95 transition-transform duration-75 text-white font-black py-2.5 rounded-xl border border-orange-500/40 bg-orange-500/10 hover:bg-orange-500/20 text-[10px] tracking-wider flex items-center justify-between px-4"
                  >
                    <span className="truncate mr-1 uppercase">{p2.skillLabel}</span>
                    <kbd className="px-1.5 py-0.5 rounded bg-orange-500 text-white text-[9px] font-mono leading-none">L</kbd>
                  </button>
                  <CooldownBar pct={cooldownPct(p2SkillReadyRef.current, p2.skillCooldownMs)} color={p2.color} />
                </div>
              </div>
            </div>
          </div>

          {/* Quick exit footer */}
          {!gameOverName && (
            <button onClick={backToSelect} className="w-full text-[10px] font-mono text-slate-500 hover:text-white transition-colors py-1">
              ← GANTI HERO / KEMBALI KE SELECTION
            </button>
          )}

          {/* Cyberpunk Match Result Screen Modal overlay */}
          {gameOverName && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
              <div className="glass-panel border-2 border-yellow-500/30 rounded-3xl p-6 sm:p-8 max-w-md w-full text-center space-y-5 shadow-[0_0_50px_rgba(234,179,8,0.15)] relative">
                <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-24 h-24 rounded-full bg-slate-900 border border-yellow-500/20 flex items-center justify-center shadow-lg">
                  <span className="text-4xl">🏆</span>
                </div>
                <div className="pt-8">
                  <p className="text-[10px] text-yellow-500 font-mono uppercase tracking-[0.35em] font-black">MATCH TERMINATED</p>
                  <h2 className="text-2xl font-black mt-2 text-white uppercase tracking-wide">
                    {gameOverName} WINS!
                  </h2>
                  <p className="text-xs text-slate-400 mt-2 italic font-mono">
                    Pertarungan sengit telah diselesaikan secara adil di arena prototype.
                  </p>
                </div>

                <div className="bg-slate-950/80 rounded-2xl border border-white/5 p-4 text-left font-mono space-y-2 text-xs">
                  <div className="flex justify-between border-b border-white/5 pb-1 text-slate-400">
                    <span>WINNER FIGHTER:</span>
                    <span className="text-white font-bold">{gameOverName}</span>
                  </div>
                  <div className="flex justify-between border-b border-white/5 pb-1 text-slate-400">
                    <span>MATCH DURATION:</span>
                    <span className="text-white font-bold">{((Date.now() - (playersRef.current ? nowTick : Date.now())) / 1000).toFixed(1)}s</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>TELEMETRY OUTCOME:</span>
                    <span className="text-yellow-400 font-bold uppercase">SECURED</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <button 
                    onClick={rematch} 
                    className="w-full bg-gradient-to-r from-yellow-500 to-amber-500 text-slate-950 font-black px-4 py-2.5 rounded-xl hover:brightness-110 transition-all text-xs tracking-wider uppercase font-mono shadow-md cursor-pointer"
                  >
                    MAIN LAGI
                  </button>
                  <button 
                    onClick={backToSelect} 
                    className="w-full border border-white/20 text-white font-bold px-4 py-2.5 rounded-xl hover:bg-white/5 transition-colors text-xs tracking-wider uppercase font-mono cursor-pointer"
                  >
                    GANTI HERO
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </main>
  )
}