import { ATTACK_DAMAGE_MULT, rollDamage, type Player } from '../data/heroes'
import type { Character } from '../entities/Character'
import type { HitEvent } from './EffectsSystem'
import { boxesOverlap, getHitbox, getHurtbox } from './HitboxSystem'
import { applySkillOnHit } from './SkillSystem'

/**
 * Diminishing returns on combo length: the Nth hit in an ongoing combo
 * (N = hits already landed before this one, 0-indexed) deals less than the
 * first, floored at 50%. Without this, a fast enough attack string can lock
 * an opponent in hurt-stun indefinitely for effectively unlimited damage.
 */
function comboDamageScale(hitsLanded: number): number {
  return Math.max(0.5, 1 - hitsLanded * 0.08)
}

export type DamagePopup = {
  id: number
  x: number
  y: number
  text: string
  color: string
  ttl: number
  isSkill?: boolean
}

export class CombatSystem {
  private popupId = 0
  popups: DamagePopup[] = []
  comboCount = 0
  comboTimer = 0
  onHit?: (event: HitEvent) => void

  private lastComboAttacker: Character | null = null
  private damageDealt = new Map<Character, number>()
  private maxCombo = new Map<Character, number>()

  resolve(fighters: Character[]): void {
    for (const attacker of fighters) {
      if (attacker.characterState === 'dead') continue

      if (attacker.characterState === 'skill' && !attacker.skillHitLanded) {
        this.resolveSkillHit(attacker, fighters)
        continue
      }

      if (attacker.attackHitLanded) continue

      const hitbox = getHitbox(attacker)
      if (!hitbox) continue

      for (const target of fighters) {
        if (target === attacker || target.characterState === 'dead') continue

        const hurtbox = getHurtbox(target)
        if (!boxesOverlap(hitbox, hurtbox)) continue

        this.applyAttackHit(attacker, target)
        break
      }
    }
  }

  update(delta: number): void {
    const dt = delta / 1000
    this.comboTimer -= dt
    if (this.comboTimer <= 0) {
      this.comboCount = 0
      this.lastComboAttacker = null
    }

    this.popups = this.popups
      .map((p) => ({ ...p, y: p.y - 40 * dt, ttl: p.ttl - dt }))
      .filter((p) => p.ttl > 0)
  }

  addSkillPopup(
    attacker: Character,
    target: Character,
    label: string,
    amount: number,
    isCrit: boolean,
    kind: 'damage' | 'heal',
  ): void {
    const isHeal = kind === 'heal'
    const onTarget = isHeal && target === attacker

    this.popups.push({
      id: this.popupId++,
      x: onTarget ? attacker.x : target.x,
      y: (onTarget ? attacker : target).y - 130,
      text: isHeal ? `+${amount}` : isCrit ? `-${amount}!` : `-${amount}`,
      color: isHeal ? '#4ade80' : isCrit ? '#fbbf24' : '#fb7185',
      ttl: 1.1,
      isSkill: true,
    })

    if (!isHeal) {
      this.popups.push({
        id: this.popupId++,
        x: attacker.x,
        y: attacker.y - 160,
        text: label,
        color: '#a78bfa',
        ttl: 0.85,
        isSkill: true,
      })
    }

    this.emitHit({
      x: onTarget ? attacker.x : target.x,
      y: (onTarget ? attacker : target).y,
      amount,
      isCrit,
      isSkill: true,
      kind,
      heroId: attacker.player.heroId,
    })

    if (kind === 'damage') {
      this.registerCombo(attacker)
      this.addDamage(attacker, amount)
    }
  }

  private resolveSkillHit(attacker: Character, fighters: Character[]): void {
    const hitbox = getHitbox(attacker)
    if (!hitbox) return

    for (const target of fighters) {
      if (target === attacker || target.characterState === 'dead') continue

      const hurtbox = getHurtbox(target)
      if (!boxesOverlap(hitbox, hurtbox)) continue

      const result = applySkillOnHit(attacker, target)
      if (!result) continue

      attacker.skillHitLanded = true
      this.addSkillPopup(attacker, target, result.label, result.amount, result.isCrit, result.kind)

      if (attacker.player.heroId === 'vampire_girl') {
        const healAmt = Math.round(result.amount * 0.5)
        this.popups.push({
          id: this.popupId++,
          x: attacker.x,
          y: attacker.y - 110,
          text: `+${healAmt}`,
          color: '#4ade80',
          ttl: 1.0,
        })
        this.emitHit({ x: attacker.x, y: attacker.y, amount: healAmt, isCrit: false, isSkill: true, kind: 'heal', heroId: attacker.player.heroId })
      }
      break
    }
  }

  private applyAttackHit(attacker: Character, target: Character): void {
    attacker.attackHitLanded = true
    if (target.isInvulnerable) return

    const mult = ATTACK_DAMAGE_MULT[attacker.characterState as keyof typeof ATTACK_DAMAGE_MULT] ?? 1
    const rolled = rollDamage(attacker.player.hitPoint * mult)
    const isCrit = rolled.isCrit
    const scale = comboDamageScale(this.getComboFor(attacker))
    const amount = Math.max(1, Math.round(rolled.amount * scale))

    if (target.characterState === 'shield') {
      const { chipDamage, brokeGuard } = target.receiveGuardedHit(amount, attacker.x)

      this.popups.push({
        id: this.popupId++,
        x: target.x,
        y: target.y - 130,
        text: brokeGuard ? `-${chipDamage}!` : `-${chipDamage}`,
        color: brokeGuard ? '#fbbf24' : '#93c5fd',
        ttl: 0.9,
      })

      this.emitHit({ x: target.x, y: target.y, amount: chipDamage, isCrit: false, isSkill: false, kind: 'damage', heroId: attacker.player.heroId })
      this.registerCombo(attacker)
      this.addDamage(attacker, chipDamage)
      return
    }

    target.receiveDamage(amount, isCrit, attacker.x)

    this.popups.push({
      id: this.popupId++,
      x: target.x,
      y: target.y - 130,
      text: isCrit ? `-${amount}!` : `-${amount}`,
      color: isCrit ? '#fbbf24' : '#fb7185',
      ttl: 0.9,
    })

    this.emitHit({ x: target.x, y: target.y, amount, isCrit, isSkill: false, kind: 'damage', heroId: attacker.player.heroId })
    this.registerCombo(attacker)
    this.addDamage(attacker, amount)
  }

  getComboFor(fighter: Character): number {
    return this.lastComboAttacker === fighter ? this.comboCount : 0
  }

  getDamageDealt(fighter: Character): number {
    return this.damageDealt.get(fighter) ?? 0
  }

  getLongestCombo(fighter: Character): number {
    return this.maxCombo.get(fighter) ?? 0
  }

  resetRoundStats(): void {
    this.comboCount = 0
    this.comboTimer = 0
    this.lastComboAttacker = null
    this.popups = []
  }

  private addDamage(attacker: Character, amount: number): void {
    this.damageDealt.set(attacker, (this.damageDealt.get(attacker) ?? 0) + amount)
  }

  private registerCombo(attacker: Character): void {
    if (this.lastComboAttacker === attacker) {
      this.comboCount += 1
    } else {
      this.comboCount = 1
      this.lastComboAttacker = attacker
    }
    this.comboTimer = 2.5

    const prevMax = this.maxCombo.get(attacker) ?? 0
    if (this.comboCount > prevMax) {
      this.maxCombo.set(attacker, this.comboCount)
    }
  }

  private emitHit(event: HitEvent): void {
    this.onHit?.(event)
  }
}

export function getHealthPct(player: Player): number {
  return Math.max(0, player.health / player.maxHealth)
}