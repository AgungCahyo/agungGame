import { Character } from './Character'
import { AISystem } from '../systems/AISystem'

export class Enemy extends Character {
  readonly ai = new AISystem()

  getAIInput(delta: number, target: Character) {
    return this.ai.update(delta, this, target)
  }
}
