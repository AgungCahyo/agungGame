import { Character } from './Character'
import { AISystem } from '../systems/AISystem'
import type { AiDifficulty } from '../data/gameState'
import type { HeroFolder } from '../data/animations'
import type { Facing } from './Character'

export class Enemy extends Character {
  readonly ai: AISystem

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    folder: HeroFolder,
    facing: Facing = 'left',
    difficulty: AiDifficulty = 'normal',
  ) {
    super(scene, x, y, folder, facing)
    this.ai = new AISystem(difficulty)
  }

  getAIInput(delta: number, target: Character) {
    return this.ai.update(delta, this, target)
  }
}
