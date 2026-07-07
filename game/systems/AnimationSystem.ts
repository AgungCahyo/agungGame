import Phaser from 'phaser'
import {
  ALL_ANIMS,
  ANIM_META,
  animKey,
  FRAME_SIZE,
  HERO_FOLDERS,
  sheetPath,
  type AnimName,
  type HeroFolder,
} from '../data/animations'

export function preloadAnim(
  loader: Phaser.Loader.LoaderPlugin,
  folder: HeroFolder,
  anim: AnimName,
): void {
  const key = animKey(folder, anim)
  loader.spritesheet(key, sheetPath(folder, anim), {
    frameWidth: FRAME_SIZE,
    frameHeight: FRAME_SIZE,
  })
}

export function registerAnim(scene: Phaser.Scene, folder: HeroFolder, anim: AnimName): void {
  const key = animKey(folder, anim)
  const meta = ANIM_META[anim]

  if (scene.anims.exists(key)) return

  scene.anims.create({
    key,
    frames: scene.anims.generateFrameNumbers(key, { start: 0, end: meta.frames - 1 }),
    frameRate: meta.fps,
    repeat: meta.loop ? -1 : 0,
  })
}

function setNearestFilter(scene: Phaser.Scene, folder: HeroFolder, anim: AnimName): void {
  scene.textures.get(animKey(folder, anim)).setFilter(Phaser.Textures.FilterMode.NEAREST)
}

export function preloadCharacterSheets(loader: Phaser.Loader.LoaderPlugin): void {
  for (const folder of HERO_FOLDERS) {
    for (const anim of ALL_ANIMS) {
      preloadAnim(loader, folder, anim)
    }
  }
}

export function registerCharacterAnims(scene: Phaser.Scene): void {
  for (const folder of HERO_FOLDERS) {
    for (const anim of ALL_ANIMS) {
      registerAnim(scene, folder, anim)
      setNearestFilter(scene, folder, anim)
    }
  }
}

/** @deprecated Use preloadCharacterSheets */
export function preloadMovementSheets(loader: Phaser.Loader.LoaderPlugin): void {
  preloadCharacterSheets(loader)
}

/** @deprecated Use registerCharacterAnims */
export function registerMovementAnims(scene: Phaser.Scene): void {
  registerCharacterAnims(scene)
}
