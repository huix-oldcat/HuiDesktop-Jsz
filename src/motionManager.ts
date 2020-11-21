import ShapeManager from './shapeManager'
import UserSettings, { MouseKeyFunction } from './userSettings'

import 'pixi.js'
import 'pixi-spine'
import { Tween } from '@tweenjs/tween.js'

export enum motion {
  stand,
  up,
  down,
  walk
}

/**
 * 管理角色的动作状态
 */
export default class MotionManager {
  private readonly _animation: PIXI.spine.Spine
  private readonly _userSettings: UserSettings
  private _shapeManager: ShapeManager
  private _currentMotion: motion
  private _tween: Tween<BasicWindow> | undefined
  private _dancing = false

  constructor (animation: PIXI.spine.Spine, userSettings: UserSettings, shapeManager: ShapeManager) {
    this._animation = animation
    this._userSettings = userSettings
    this._shapeManager = shapeManager
    this._currentMotion = motion.stand

    // set mix
    this._animation.stateData.defaultMix = 0.32

    // set drag
    this.dragInit()

    // set walk
    this.enableRandomWalk()

    // set the animation
    this._animation.skeleton.setSkin(this._animation.spineData.skins[0])
    this._animation.state.addListener({ complete: (trackEntry: PIXI.spine.core.TrackEntry) => this.onAnimationComplete(trackEntry) })
    this._animation.interactive = true
    this._animation.on('mousedown', () => this.leftClick())
    this._animation.on('rightdown', () => this.rightClick())
  }

  private dragInit (): void {
    // these functions will be called when the window is begin dragging
    // in this application we don't care which mouse button is used
    const window_ = window as ExtendedWindow
    window_.huiDesktop_DragMove_OnMouseLeftUp = () => this.dragUp()
    window_.huiDesktop_DragMove_OnMouseRightUp = () => this.dragUp()
  }

  private enableRandomWalk (): void {
    if (this._userSettings.walkRandom > 0) {
      setInterval(() => {
        if (this._currentMotion !== motion.stand) return
        const rand = Math.random() * this._userSettings.walkRandom
        if (rand < 1) this.startWalking()
      }, 1000)
    }
  }

  private leftClick (): void {
    if (this._currentMotion === motion.up) return
    switch (this._userSettings.left) {
      case MouseKeyFunction.touch:
        this.touch()
        break
      case MouseKeyFunction.walk:
        this._currentMotion !== motion.walk ? this.startWalking() : this.resetToIdel()
        break
    }
  }

  private rightClick (): void {
    if (this._currentMotion === motion.up) return
    switch (this._userSettings.right) {
      case MouseKeyFunction.touch:
        this.touch()
        break
      case MouseKeyFunction.walk:
        this._currentMotion !== motion.walk ? this.startWalking() : this.resetToIdel()
        break
    }
  }

  public onAnimationComplete (trackEntry: PIXI.spine.core.TrackEntry): void {
    switch (trackEntry.animation.name) {
      case 'up':
      case 'down':
        if (this.currentMotion === motion.up || this.currentMotion === motion.down) {
          this.resetToIdel()
        }
        break
    }
  }

  public get currentMotion (): motion {
    return this._currentMotion
  }

  public resetToIdel (): void {
    this._currentMotion = motion.stand
    this._animation.state.setAnimation(0, 'stand', true)
  }

  public switchDance (): void {
    this._dancing = !this._dancing
    this.resetToIdel()
  }

  public touch (): void {
    if (this._currentMotion === motion.stand) {
      this._currentMotion = motion.up
      this._animation.state.setAnimation(0, 'up', false)
    }
  }

  private dragUp (): void {
    if (!this._userSettings.free) {
      huiDesktop.Window.Top = this._shapeManager.groundLocation
    }
    this.resetToIdel()
    setTimeout(() => this._userSettings.save(true), 500) // not async api
  }

  private startWalking (): void {
    let maxDis = this._shapeManager.maxWalkDistance
    if (maxDis < 200 * this._shapeManager.scale) { // dis = 200px (a whole animtion)
      this._shapeManager.flip = !this._shapeManager.flip
      maxDis = this._shapeManager.maxWalkDistance
    }

    const roundCount = Math.floor(Math.random() * Math.floor(maxDis / 200 / this._shapeManager.scale) + 1)
    const walkDistance = 200 * this._shapeManager.scale * roundCount
    const walkTime = 1000 * this._animation.spineData.findAnimation('walk').duration * roundCount

    this._tween = new Tween(huiDesktop.Window)
    this._tween.to({ Left: huiDesktop.Window.Left + walkDistance * (this._shapeManager.flip ? -1 : 1) }, walkTime)
    this._tween.onStart(_ => { this._currentMotion = motion.walk; this._animation.state.setAnimation(0, 'walk', true) })
    this._tween.onComplete(_ => { this.resetToIdel(); this._userSettings.save(true) })
    this._tween.start()
  }
}
