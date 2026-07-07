'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'

// ─────────────────────────────────────────────
// Sprite metadata — shared by every character folder in /public/assets/fighter
// All sheets are 128×128 per frame (confirmed from your assets).
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

  /** Basic attack. Damage math lives here, not in the UI layer. */
  attack(target: Player): ActionResult {
    const { amount, isCrit } = rollDamage(this.hitPoint)
    target.takeDamage(amount)
    return { amount, isCrit, kind: 'damage', label: 'Attack', animKey: 'Attack_1' }
  }

  /** Every hero overrides this with its own ability. Base fallback = a plain attack. */
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
// Heroes — 6 characters, each its own Player subclass with its own skill()
// Folder names match what you uploaded under /public/assets/fighter/<folder>/
// ─────────────────────────────────────────────

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
    // Punishes a low-HP target hard, otherwise just a strong hit.
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
  skillAnimKey = 'Attack_3' as AnimName
  constructor(name: string) {
    super('countess_vampire', name, 'Countess_Vampire', 20, 85, 620, 2000, '#D9224A')
  }
  skill(target: Player): ActionResult {
    // Guaranteed crit.
    const variance = 0.8 + Math.random() * 0.4
    const amount = Math.round(this.hitPoint * variance * 1.6)
    target.takeDamage(amount)
    return { amount, isCrit: true, kind: 'damage', label: this.skillLabel, animKey: this.skillAnimKey }
  }
}

// ─────────────────────────────────────────────
// Hero roster metadata (for the selection screen + instantiation)
// ─────────────────────────────────────────────

type HeroId = 'fighter' | 'samurai' | 'shinobi' | 'vampire_girl' | 'converted_vampire' | 'countess_vampire'

const HERO_LIST: {
  id: HeroId
  label: string
  color: string
  tagline: string
  skillLabel: string
  stats: { hp: number; dmg: number; atkCooldown: number; skillCooldown: number }
  create: (name: string) => Player
}[] = [
  { id: 'fighter', label: 'Fighter', color: '#4A90D9', tagline: 'Seimbang — Combo Strike pasti kena', skillLabel: 'Combo Strike', stats: { hp: 110, dmg: 18, atkCooldown: 550, skillCooldown: 1400 }, create: (name) => new Fighter(name) },
  { id: 'samurai', label: 'Samurai', color: '#B03A5B', tagline: 'Berat & mematikan — Iaijutsu makin sakit di HP lawan yang menipis', skillLabel: 'Iaijutsu', stats: { hp: 90, dmg: 24, atkCooldown: 700, skillCooldown: 2200 }, create: (name) => new Samurai(name) },
  { id: 'shinobi', label: 'Shinobi', color: '#E8871E', tagline: 'Gesit — Flurry menghantam dua kali cepat', skillLabel: 'Flurry', stats: { hp: 95, dmg: 14, atkCooldown: 380, skillCooldown: 1700 }, create: (name) => new Shinobi(name) },
  { id: 'vampire_girl', label: 'Vampire Girl', color: '#9B5DE5', tagline: 'Blood Drain — menyerap sebagian damage jadi HP', skillLabel: 'Blood Drain', stats: { hp: 100, dmg: 16, atkCooldown: 600, skillCooldown: 1900 }, create: (name) => new VampireGirl(name) },
  { id: 'converted_vampire', label: 'Converted Vampire', color: '#7C8B9A', tagline: 'Tahan banting — Fortify memulihkan HP', skillLabel: 'Fortify', stats: { hp: 150, dmg: 12, atkCooldown: 680, skillCooldown: 3000 }, create: (name) => new ConvertedVampire(name) },
  { id: 'countess_vampire', label: 'Countess Vampire', color: '#D9224A', tagline: 'Rapuh tapi mematikan — Crimson Edge selalu critical', skillLabel: 'Crimson Edge', stats: { hp: 85, dmg: 20, atkCooldown: 620, skillCooldown: 2000 }, create: (name) => new CountessVampire(name) },
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
}: {
  folder: string
  anim: AnimName
  facing: 'left' | 'right'
  dead: boolean
  pulseKind: PulseKind
  pulseId: number
  onAnimEnd?: () => void
}) {
  const [frame, setFrame] = useState(0)
  const meta = ANIM_META[anim]
  const onAnimEndRef = useRef(onAnimEnd)
  onAnimEndRef.current = onAnimEnd

  // Drive the frame stepping for the current animation.
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anim, folder])

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

  const flinchX = activePulse === 'hit' ? -12 : 0
  const bobY = activePulse === 'heal' ? -8 : 0

  const filter =
    activePulse === 'hit'
      ? 'brightness(1.7)'
      : activePulse === 'heal'
      ? 'drop-shadow(0 0 10px #22c55e) brightness(1.3)'
      : 'none'

  return (
    <div
      style={{
        width: FRAME_SIZE * 1.4,
        height: FRAME_SIZE * 1.4,
        transform: dead
          ? `translateY(6px) rotate(${facing === 'right' ? 6 : -6}deg)`
          : `translateX(${flinchX * (facing === 'left' ? -1 : 1)}px) translateY(${bobY}px)`,
        transition: dead ? 'transform 0.4s ease-in' : 'transform 0.15s ease-out, filter 0.15s ease-out',
        filter,
        opacity: dead ? 0.55 : 1,
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          width: FRAME_SIZE,
          height: FRAME_SIZE,
          transform: `scale(1.4) scaleX(${facing === 'left' ? -1 : 1})`,
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
  const color = pct > 50 ? 'bg-emerald-400' : pct > 25 ? 'bg-amber-400' : 'bg-rose-500'
  return (
    <div className="w-full h-3 rounded-full bg-white/10 overflow-hidden border border-white/10">
      <div className={`h-full ${color} transition-all duration-300 ease-out`} style={{ width: `${pct}%` }} />
    </div>
  )
}

function CooldownBar({ pct, color }: { pct: number; color: string }) {
  return (
    <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
      <div className="h-full transition-all duration-75 ease-linear" style={{ width: `${pct * 100}%`, background: color }} />
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

  const [log, setLog] = useState<string[]>([])
  const [popups, setPopups] = useState<Popup[]>([])
  const [sparks, setSparks] = useState<Spark[]>([])
  const [arenaShake, setArenaShake] = useState(false)
  const [nowTick, setNowTick] = useState(Date.now())

  const popupId = useRef(0)
  const sparkId = useRef(0)

  const wait = (ms: number) => new Promise((res) => setTimeout(res, ms))
  const pushLog = (msg: string) => setLog((prev) => [...prev.slice(-5), msg])

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

    // Player owns the combat math — the UI just asks for the result up front,
    // then plays the animation and applies visual feedback partway through the swing.
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
      pushLog(`${attacker.name} pakai ${result.label}, memulihkan ${result.amount} HP`)
    } else {
      spawnPopup(defenderSide, `-${result.amount}`, result.isCrit, 'damage')
      spawnSpark(defenderSide)
      triggerImpact()
      bumpPulse(side === 'p1' ? 'p2' : 'p1', 'hit')
      pushLog(`${attacker.name} pakai ${result.label} ke ${defender.name} sebesar ${result.amount}${result.isCrit ? ' (CRITICAL!)' : ''}`)
    }
    rerender()

    const defenderDied = defender.health <= 0
    if (defenderDied) {
      pushLog(`${defender.name} tumbang! ${attacker.name} menang`)
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
    setLog([log1])
    setPopups([])
    setSparks([])
  }

  const startBattle = () => {
    if (!p1HeroId || !p2HeroId) return
    const h1 = HERO_LIST.find((h) => h.id === p1HeroId)!
    const h2 = HERO_LIST.find((h) => h.id === p2HeroId)!
    playersRef.current = { p1: h1.create(h1.label), p2: h2.create(h2.label) }
    setupMatch('Bertarung! Player 1: [D] Attack / [F] Skill — Player 2: [K] Attack / [L] Skill.')
    setScreen('battle')
  }

  const rematch = () => {
    if (!playersRef.current) return
    const h1 = HERO_LIST.find((h) => h.id === playersRef.current!.p1.heroId) ?? HERO_LIST[0]
    const h2 = HERO_LIST.find((h) => h.id === playersRef.current!.p2.heroId) ?? HERO_LIST[0]
    playersRef.current = { p1: h1.create(h1.label), p2: h2.create(h2.label) }
    setupMatch('Ronde baru! Player 1: [D] Attack / [F] Skill — Player 2: [K] Attack / [L] Skill.')
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

  return (
    <main className="min-h-screen bg-[#0B0D10] text-white flex items-center justify-center px-4 py-10">
      <style jsx global>{`
        @keyframes float-up { 0% { transform: translateY(0); opacity: 1; } 100% { transform: translateY(-40px); opacity: 0; } }
        .animate-float-up { animation: float-up 0.9s ease-out forwards; }
        @keyframes arena-shake {
          0%, 100% { transform: translate(0, 0); }
          20% { transform: translate(-3px, 1px); }
          40% { transform: translate(3px, -1px); }
          60% { transform: translate(-2px, 1px); }
          80% { transform: translate(2px, 0); }
        }
        .animate-arena-shake { animation: arena-shake 0.18s linear; }
        @keyframes spark-burst { 0% { transform: scale(0.2); opacity: 1; } 100% { transform: scale(1.6); opacity: 0; } }
        .animate-spark { animation: spark-burst 0.25s ease-out forwards; }
      `}</style>

      {screen === 'select' && (
        <div className="w-full max-w-4xl space-y-8">
          <div className="text-center">
            <p className="text-xs tracking-[0.3em] text-white/40 font-mono uppercase">Sprite Duel</p>
            <h1 className="text-2xl font-semibold mt-1">Pilih Hero</h1>
            <p className="text-white/40 text-sm mt-1">Local 2-player — satu keyboard, dua pemain.</p>
            <Link
              href="/battle"
              className="inline-block mt-3 text-xs font-mono text-[#4A90D9] hover:text-[#6aa8e8] transition-colors"
            >
              → Coba Phaser Battle
            </Link>
          </div>

          {(['p1', 'p2'] as const).map((side) => {
            const selected = side === 'p1' ? p1HeroId : p2HeroId
            const setSelected = side === 'p1' ? setP1HeroId : setP2HeroId
            return (
              <div key={side}>
                <p className="text-sm font-medium mb-3 text-white/70">
                  {side === 'p1' ? 'Player 1 — [D] Attack, [F] Skill' : 'Player 2 — [K] Attack, [L] Skill'}
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                  {HERO_LIST.map((h) => (
                    <button
                      key={h.id}
                      onClick={() => setSelected(h.id)}
                      className={`text-left rounded-xl border p-3 transition-colors ${
                        selected === h.id ? 'border-white bg-white/[0.06]' : 'border-white/10 bg-white/[0.02] hover:bg-white/[0.04]'
                      }`}
                    >
                      <div className="w-full aspect-square rounded-lg bg-black/30 mb-2 overflow-hidden flex items-end justify-center">
                        <div
                          style={{
                            width: FRAME_SIZE,
                            height: FRAME_SIZE,
                            transform: 'scale(0.9)',
                            backgroundImage: `url(${SPRITE_BASE}/${h.id === 'fighter' ? 'Fighter' : h.id === 'samurai' ? 'Samurai' : h.id === 'shinobi' ? 'Shinobi' : h.id === 'vampire_girl' ? 'Vampire_Girl' : h.id === 'converted_vampire' ? 'Converted_Vampire' : 'Countess_Vampire'}/Idle.png)`,
                            backgroundPosition: '0px 0px',
                            backgroundRepeat: 'no-repeat',
                            imageRendering: 'pixelated',
                          }}
                        />
                      </div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="w-3 h-3 rounded-full" style={{ background: h.color }} />
                        <span className="font-medium text-sm">{h.label}</span>
                      </div>
                      <p className="text-[11px] text-white/40 leading-snug mb-2">{h.tagline}</p>
                      <div className="text-[10px] font-mono text-white/30 space-y-0.5">
                        <p>❤ {h.stats.hp} &nbsp; ⚔ {h.stats.dmg} &nbsp; ⏱ {h.stats.atkCooldown}ms</p>
                        <p>✦ {h.skillLabel} ({h.stats.skillCooldown}ms)</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )
          })}

          <button
            onClick={startBattle}
            disabled={!p1HeroId || !p2HeroId}
            className="w-full bg-rose-600 hover:bg-rose-500 disabled:bg-white/10 disabled:text-white/30 transition-colors text-white font-medium px-4 py-3 rounded-xl"
          >
            Mulai Bertarung
          </button>
        </div>
      )}

      {screen === 'battle' && p1 && p2 && (
        <div className="w-full max-w-2xl space-y-6">
          <div className="text-center">
            <p className="text-xs tracking-[0.3em] text-white/40 font-mono uppercase">Sprite Duel</p>
            <h1 className="text-2xl font-semibold mt-1">{p1.name} vs {p2.name}</h1>
          </div>

          <div className={`relative rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.04] to-transparent overflow-hidden ${arenaShake ? 'animate-arena-shake' : ''}`}>
            <div
              className="absolute inset-0 opacity-30 pointer-events-none"
              style={{ background: 'radial-gradient(circle at 20% 60%, rgba(74,144,217,0.25), transparent 40%), radial-gradient(circle at 80% 60%, rgba(232,135,30,0.25), transparent 40%)' }}
            />

            <div className="relative grid grid-cols-2 gap-4 px-6 pt-6">
              <div>
                <div className="flex justify-between items-baseline mb-1">
                  <span className="font-medium">{p1.name}</span>
                  <span className="text-xs text-white/40 font-mono">{p1.health}/{p1.maxHealth}</span>
                </div>
                <HealthBar current={p1.health} max={p1.maxHealth} />
              </div>
              <div>
                <div className="flex justify-between items-baseline mb-1">
                  <span className="text-xs text-white/40 font-mono">{p2.health}/{p2.maxHealth}</span>
                  <span className="font-medium">{p2.name}</span>
                </div>
                <HealthBar current={p2.health} max={p2.maxHealth} />
              </div>
            </div>

            <div className="relative flex items-end justify-between px-10 pt-8 pb-6 h-56">
              <div className="relative">
                <SpriteCharacter folder={p1.folder} anim={p1Anim} facing="right" dead={p1.health <= 0} pulseKind={p1Pulse.kind} pulseId={p1Pulse.id} />
                {popups.filter((p) => p.side === 'left').map((p) => (
                  <span key={p.id} className={`animate-float-up absolute -top-4 left-1/2 -translate-x-1/2 font-mono font-bold text-lg ${p.kind === 'heal' ? 'text-emerald-400' : p.crit ? 'text-amber-400' : 'text-rose-400'}`}>
                    {p.text}{p.crit && p.kind === 'damage' && <span className="text-xs ml-1">CRIT</span>}
                  </span>
                ))}
                {sparks.filter((s) => s.side === 'left').map((s) => (
                  <span key={s.id} className="animate-spark absolute top-8 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.9), transparent 70%)' }} />
                ))}
              </div>

              <span className="text-white/20 font-mono text-sm mb-8">VS</span>

              <div className="relative">
                <SpriteCharacter folder={p2.folder} anim={p2Anim} facing="left" dead={p2.health <= 0} pulseKind={p2Pulse.kind} pulseId={p2Pulse.id} />
                {popups.filter((p) => p.side === 'right').map((p) => (
                  <span key={p.id} className={`animate-float-up absolute -top-4 left-1/2 -translate-x-1/2 font-mono font-bold text-lg ${p.kind === 'heal' ? 'text-emerald-400' : p.crit ? 'text-amber-400' : 'text-rose-400'}`}>
                    {p.text}{p.crit && p.kind === 'damage' && <span className="text-xs ml-1">CRIT</span>}
                  </span>
                ))}
                {sparks.filter((s) => s.side === 'right').map((s) => (
                  <span key={s.id} className="animate-spark absolute top-8 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.9), transparent 70%)' }} />
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-black/40 font-mono text-xs p-3 h-24 overflow-y-auto space-y-1">
            {log.map((line, i) => (
              <p key={i} className="text-white/50"><span className="text-white/20">›</span> {line}</p>
            ))}
          </div>

          {!gameOverName ? (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <button onClick={() => performAction('p1', 'attack')} className="w-full text-white font-medium px-3 py-2.5 rounded-xl transition-colors text-sm" style={{ background: p1.color }}>
                  Attack <span className="text-white/60 font-mono text-xs">[D]</span>
                </button>
                <CooldownBar pct={cooldownPct(p1AtkReadyRef.current, p1.cooldownMs)} color={p1.color} />
                <button onClick={() => performAction('p1', 'skill')} className="w-full border text-white font-medium px-3 py-2 rounded-xl transition-colors text-xs" style={{ borderColor: p1.color }}>
                  {p1.skillLabel} <span className="text-white/50 font-mono">[F]</span>
                </button>
                <CooldownBar pct={cooldownPct(p1SkillReadyRef.current, p1.skillCooldownMs)} color={p1.color} />
              </div>
              <div className="space-y-2">
                <button onClick={() => performAction('p2', 'attack')} className="w-full text-white font-medium px-3 py-2.5 rounded-xl transition-colors text-sm" style={{ background: p2.color }}>
                  Attack <span className="text-white/60 font-mono text-xs">[K]</span>
                </button>
                <CooldownBar pct={cooldownPct(p2AtkReadyRef.current, p2.cooldownMs)} color={p2.color} />
                <button onClick={() => performAction('p2', 'skill')} className="w-full border text-white font-medium px-3 py-2 rounded-xl transition-colors text-xs" style={{ borderColor: p2.color }}>
                  {p2.skillLabel} <span className="text-white/50 font-mono">[L]</span>
                </button>
                <CooldownBar pct={cooldownPct(p2SkillReadyRef.current, p2.skillCooldownMs)} color={p2.color} />
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5 text-center space-y-3">
              <p className="text-sm text-white/40 font-mono uppercase tracking-widest">Pertandingan selesai</p>
              <p className="text-xl font-semibold">🏆 {gameOverName} menang!</p>
              <div className="flex gap-3 justify-center">
                <button onClick={rematch} className="bg-white text-black font-medium px-4 py-2 rounded-xl hover:bg-white/90 transition-colors">
                  Main Lagi
                </button>
                <button onClick={backToSelect} className="border border-white/20 text-white font-medium px-4 py-2 rounded-xl hover:bg-white/5 transition-colors">
                  Ganti Hero
                </button>
              </div>
            </div>
          )}

          {!gameOverName && (
            <button onClick={backToSelect} className="w-full text-xs text-white/30 hover:text-white/60 transition-colors">
              ← Ganti hero
            </button>
          )}
        </div>
      )}
    </main>
  )
}