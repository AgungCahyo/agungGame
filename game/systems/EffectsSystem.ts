import Phaser from 'phaser'
import type { Character } from '../entities/Character'

export type HitEvent = {
  x: number
  y: number
  amount: number
  isCrit: boolean
  isSkill: boolean
  kind: 'damage' | 'heal'
  heroId?: string
}

export class EffectsSystem {
  private hitStopMs = 0
  private flashTween?: Phaser.Tweens.Tween
  private audioCtx: AudioContext | null = null
  private musicGain: GainNode | null = null
  private musicOsc: OscillatorNode | null = null
  private lowHpVignette?: Phaser.GameObjects.Rectangle

  constructor(private readonly scene: Phaser.Scene) {
    this.ensureParticleTexture()
    this.startAmbientMusic()
    const { width, height } = this.scene.scale
    this.lowHpVignette = this.scene.add.rectangle(width / 2, height / 2, width, height, 0xff2d2d, 0)
      .setDepth(140)
      .setScrollFactor(0)
  }

  get isHitStopped(): boolean {
    return this.hitStopMs > 0
  }

  update(delta: number): void {
    if (this.hitStopMs > 0) this.hitStopMs -= delta
  }

  requestHitStop(ms: number): void {
    this.hitStopMs = Math.max(this.hitStopMs, ms)
  }

  syncLowHpWarning(fighters: Character[]): void {
    const shouldWarn = fighters.some((fighter) => fighter.player.health / fighter.player.maxHealth < 0.25 && fighter.characterState !== 'dead')

    if (this.lowHpVignette) {
      this.lowHpVignette.setAlpha(shouldWarn ? 0.08 : 0)
    }

    fighters.forEach((fighter) => {
      const lowHp = fighter.player.health / fighter.player.maxHealth < 0.25 && fighter.characterState !== 'dead'
      fighter.setTint(lowHp ? 0xff6666 : 0xffffff)
      fighter.setAlpha(lowHp ? 0.72 + 0.14 * Math.sin(this.scene.time.now / 120) : 1)
    })
  }

  onHit(event: HitEvent): void {
    if (event.kind === 'heal') {
      this.playHealSound()
      return
    }

    const intensity = event.isCrit ? 1.8 : event.isSkill ? 1.4 : 1
    this.scene.cameras.main.shake(90, 0.003 * intensity)
    this.requestHitStop(event.isCrit ? 70 : event.isSkill ? 55 : 40)
    this.screenFlash(event.isCrit ? 0xffffff : 0xff4466, event.isCrit ? 0.22 : 0.12, 90)
    this.spawnHitParticles(event.x, event.y - 90, event.isCrit, event.heroId)
    this.playHitSound(event.isCrit)
  }

  onSkillCast(x: number, y: number, color: string): void {
    this.spawnSkillRing(x, y, color)
    this.playSkillSound()
  }

  destroy(): void {
    this.musicOsc?.stop()
    this.audioCtx?.close()
  }

  private ensureParticleTexture(): void {
    if (this.scene.textures.exists('fx-spark')) return
    const g = this.scene.make.graphics({ x: 0, y: 0 })
    g.fillStyle(0xffffff, 1)
    g.fillCircle(4, 4, 4)
    g.generateTexture('fx-spark', 8, 8)
    g.destroy()
  }

  private spawnHitParticles(x: number, y: number, isCrit: boolean, heroId?: string): void {
    const isVampire = !!heroId && /vampire/i.test(heroId)
    const count = isCrit ? 14 : 8
    for (let i = 0; i < count; i++) {
      const p = this.scene.add.image(x, y, 'fx-spark')
      p.setTint(isCrit ? (isVampire ? 0xf472b6 : 0xfbbf24) : (isVampire ? 0x9b5de5 : 0xffffff))
      p.setScale(Phaser.Math.FloatBetween(0.4, isVampire ? 1.2 : 1.1))
      p.setDepth(50)

      const angle = Phaser.Math.FloatBetween(-Math.PI, 0)
      const speed = Phaser.Math.Between(80, isCrit ? 220 : 160)
      const spread = isVampire ? 0.5 : 0.35

      this.scene.tweens.add({
        targets: p,
        x: x + Math.cos(angle) * speed * spread,
        y: y + Math.sin(angle) * speed * spread,
        alpha: 0,
        scale: 0,
        duration: Phaser.Math.Between(180, 320),
        ease: 'Cubic.easeOut',
        onComplete: () => p.destroy(),
      })
    }
  }

  private spawnSkillRing(x: number, y: number, color: string): void {
    const ring = this.scene.add.circle(x, y - 60, 8, Phaser.Display.Color.HexStringToColor(color).color, 0.35)
    ring.setStrokeStyle(2, Phaser.Display.Color.HexStringToColor(color).color, 0.9)
    ring.setDepth(45)

    this.scene.tweens.add({
      targets: ring,
      scaleX: 4,
      scaleY: 4,
      alpha: 0,
      duration: 420,
      ease: 'Cubic.easeOut',
      onComplete: () => ring.destroy(),
    })
  }

  private screenFlash(color: number, alpha: number, duration: number): void {
    const { width, height } = this.scene.scale
    const flash = this.scene.add.rectangle(width / 2, height / 2, width, height, color, alpha)
    flash.setDepth(200)
    flash.setScrollFactor(0)

    this.flashTween?.stop()
    this.flashTween = this.scene.tweens.add({
      targets: flash,
      alpha: 0,
      duration,
      ease: 'Cubic.easeOut',
      onComplete: () => flash.destroy(),
    })
  }

  private getAudio(): AudioContext {
    if (!this.audioCtx) {
      this.audioCtx = new AudioContext()
    }
    if (this.audioCtx.state === 'suspended') {
      void this.audioCtx.resume()
    }
    return this.audioCtx
  }

  private playTone(freq: number, duration: number, type: OscillatorType = 'square', volume = 0.04): void {
    try {
      const ctx = this.getAudio()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = type
      osc.frequency.value = freq
      gain.gain.value = volume
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start()
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration)
      osc.stop(ctx.currentTime + duration)
    } catch {
      // Audio unavailable — silent fallback
    }
  }

  private playHitSound(isCrit: boolean): void {
    this.playTone(isCrit ? 180 : 120, isCrit ? 0.12 : 0.08, 'square', isCrit ? 0.05 : 0.035)
  }

  private playSkillSound(): void {
    this.playTone(440, 0.06, 'sine', 0.04)
    this.scene.time.delayedCall(60, () => this.playTone(660, 0.08, 'sine', 0.035))
  }

  private playHealSound(): void {
    this.playTone(523, 0.1, 'sine', 0.035)
  }

  private startAmbientMusic(): void {
    try {
      const ctx = this.getAudio()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.value = 55
      gain.gain.value = 0.012
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start()
      this.musicOsc = osc
      this.musicGain = gain
    } catch {
      // Audio unavailable
    }
  }
}
