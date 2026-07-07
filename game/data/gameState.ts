import type { HeroFolder } from './animations'

export type BattleSetup = {
  playerFolder: HeroFolder
  enemyFolder: HeroFolder
}

export const GameRegistry: { battle: BattleSetup | null } = {
  battle: null,
}

export const DEFAULT_BATTLE: BattleSetup = {
  playerFolder: 'Fighter',
  enemyFolder: 'Samurai',
}
