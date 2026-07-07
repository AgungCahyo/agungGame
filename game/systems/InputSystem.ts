import Phaser from 'phaser'

export type PlayerInput = {
  left: boolean
  right: boolean
  run: boolean
  jump: boolean
  dash: boolean
  attack1: boolean
  attack2: boolean
  attack3: boolean
  skill: boolean
  shield: boolean
}

type InputBindings = {
  left: Phaser.Input.Keyboard.Key
  right: Phaser.Input.Keyboard.Key
  run: Phaser.Input.Keyboard.Key
  jump: Phaser.Input.Keyboard.Key
  dash: Phaser.Input.Keyboard.Key
  attack1: Phaser.Input.Keyboard.Key
  attack2: Phaser.Input.Keyboard.Key
  attack3: Phaser.Input.Keyboard.Key
  skill: Phaser.Input.Keyboard.Key
  shield: Phaser.Input.Keyboard.Key
}

function readInput(bindings: InputBindings): PlayerInput {
  return {
    left: bindings.left.isDown,
    right: bindings.right.isDown,
    run: bindings.run.isDown,
    jump: Phaser.Input.Keyboard.JustDown(bindings.jump),
    dash: Phaser.Input.Keyboard.JustDown(bindings.dash),
    attack1: Phaser.Input.Keyboard.JustDown(bindings.attack1),
    attack2: Phaser.Input.Keyboard.JustDown(bindings.attack2),
    attack3: Phaser.Input.Keyboard.JustDown(bindings.attack3),
    skill: Phaser.Input.Keyboard.JustDown(bindings.skill),
    shield: bindings.shield.isDown,
  }
}

export class InputSystem {
  private readonly p1: InputBindings
  private readonly p2: InputBindings

  constructor(scene: Phaser.Scene) {
    const kb = scene.input.keyboard!

    this.p1 = {
      left: kb.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      right: kb.addKey(Phaser.Input.Keyboard.KeyCodes.D),
      run: kb.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT),
      jump: kb.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      dash: kb.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE),
      attack1: kb.addKey(Phaser.Input.Keyboard.KeyCodes.J),
      attack2: kb.addKey(Phaser.Input.Keyboard.KeyCodes.K),
      attack3: kb.addKey(Phaser.Input.Keyboard.KeyCodes.L),
      skill: kb.addKey(Phaser.Input.Keyboard.KeyCodes.F),
      shield: kb.addKey(Phaser.Input.Keyboard.KeyCodes.S),
    }

    this.p2 = {
      left: kb.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT),
      right: kb.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT),
      run: kb.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER),
      jump: kb.addKey(Phaser.Input.Keyboard.KeyCodes.UP),
      dash: kb.addKey(Phaser.Input.Keyboard.KeyCodes.NUMPAD_ADD),
      attack1: kb.addKey(Phaser.Input.Keyboard.KeyCodes.NUMPAD_ONE),
      attack2: kb.addKey(Phaser.Input.Keyboard.KeyCodes.NUMPAD_TWO),
      attack3: kb.addKey(Phaser.Input.Keyboard.KeyCodes.NUMPAD_THREE),
      skill: kb.addKey(Phaser.Input.Keyboard.KeyCodes.NUMPAD_FOUR),
      shield: kb.addKey(Phaser.Input.Keyboard.KeyCodes.NUMPAD_ZERO),
    }
  }

  getPlayer1(): PlayerInput {
    return readInput(this.p1)
  }

  getPlayer2(): PlayerInput {
    return readInput(this.p2)
  }
}