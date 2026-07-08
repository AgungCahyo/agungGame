import type { HeroFolder } from './animations'

export type AiDifficulty = 'easy' | 'normal' | 'hard'

export type BattleSetup = {
  playerFolder: HeroFolder
  enemyFolder: HeroFolder
  difficulty: AiDifficulty
}

export const GameRegistry: { battle: BattleSetup | null } = {
  battle: null,
}

export const DEFAULT_BATTLE: BattleSetup = {
  playerFolder: 'Fighter',
  enemyFolder: 'Samurai',
  difficulty: 'normal',
}

export const AI_DIFFICULTY_LABELS: Record<AiDifficulty, string> = {
  easy: 'Mudah',
  normal: 'Normal',
  hard: 'Sulit',
}
