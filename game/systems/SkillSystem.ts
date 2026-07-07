import type { ActionResult, Player } from '../data/heroes'
import type { Character } from '../entities/Character'

export function isSelfSkill(heroId: string): boolean {
  return heroId === 'converted_vampire'
}

export function applySkillOnHit(attacker: Character, target: Character): ActionResult | null {
  if (target.characterState === 'shield' || target.characterState === 'dead') return null

  const result = attacker.player.skill(target.player)
  target.reactToSkillHit(attacker.x, result)
  return result
}

export function applySelfSkill(caster: Character): ActionResult {
  const result = caster.player.skill(caster.player)
  caster.reactToSelfSkill(result)
  return result
}

export function skillCooldownSec(player: Player): number {
  return player.skillCooldownMs / 1000
}
