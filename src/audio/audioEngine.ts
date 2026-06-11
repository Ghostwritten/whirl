/** Web Audio API engine — synthesizes all sounds, no external files required.
 *
 * Two output GainNodes (bgmGain, sfxGain) feed into the destination,
 * giving independent volume control. The AudioContext is created on first
 * user gesture to comply with browser autoplay policy. */

export interface AudioEngine {
  unlock: () => Promise<void>
  setBgmVolume: (v: number) => void
  setSfxVolume: (v: number) => void
  playTick: (speed: number) => void
  playWhoosh: () => void
  playHeartbeat: () => void
  playFanfare: () => void
  startBgm: () => void
  stopBgm: () => void
  isBgmPlaying: () => boolean
}

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v))
}

class AudioEngineImpl implements AudioEngine {
  private ctx: AudioContext | null = null
  private bgmGain: GainNode | null = null
  private sfxGain: GainNode | null = null
  private bgmOscillators: OscillatorNode[] = []
  private bgmPlaying = false
  private bgmVolume = 0.4
  private sfxVolume = 0.7

  private getCtx(): AudioContext {
    if (!this.ctx) {
      this.ctx = new AudioContext()
      const bgm = this.ctx.createGain()
      const sfx = this.ctx.createGain()
      bgm.gain.value = this.bgmVolume
      sfx.gain.value = this.sfxVolume
      bgm.connect(this.ctx.destination)
      sfx.connect(this.ctx.destination)
      this.bgmGain = bgm
      this.sfxGain = sfx
    }
    return this.ctx
  }

  async unlock(): Promise<void> {
    const ctx = this.getCtx()
    if (ctx.state === 'suspended') {
      await ctx.resume()
    }
  }

  setBgmVolume(v: number): void {
    this.bgmVolume = clamp01(v)
    if (this.bgmGain) this.bgmGain.gain.setTargetAtTime(this.bgmVolume, this.getCtx().currentTime, 0.05)
  }

  setSfxVolume(v: number): void {
    this.sfxVolume = clamp01(v)
    if (this.sfxGain) this.sfxGain.gain.setTargetAtTime(this.sfxVolume, this.getCtx().currentTime, 0.05)
  }

  playTick(speed: number): void {
    const ctx = this.getCtx()
    const sfx = this.sfxGain
    if (!sfx) return
    const t = ctx.currentTime
    const freq = 880 + speed * 400
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.value = clamp01(freq / 2000) * 1200 + 500
    gain.gain.setValueAtTime(0.25, t)
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.04)
    osc.connect(gain)
    gain.connect(sfx)
    osc.start(t)
    osc.stop(t + 0.05)
  }

  playWhoosh(): void {
    const ctx = this.getCtx()
    const sfx = this.sfxGain
    if (!sfx) return
    const t = ctx.currentTime
    const noise = ctx.createOscillator()
    const gain = ctx.createGain()
    const filter = ctx.createBiquadFilter()
    noise.type = 'sawtooth'
    noise.frequency.setValueAtTime(200, t)
    noise.frequency.linearRampToValueAtTime(60, t + 0.6)
    filter.type = 'bandpass'
    filter.frequency.value = 300
    filter.Q.value = 0.5
    gain.gain.setValueAtTime(0.3, t)
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.6)
    noise.connect(filter)
    filter.connect(gain)
    gain.connect(sfx)
    noise.start(t)
    noise.stop(t + 0.7)
  }

  playHeartbeat(): void {
    const ctx = this.getCtx()
    const sfx = this.sfxGain
    if (!sfx) return
    const t = ctx.currentTime
    const beats = [0, 0.12]
    for (const offset of beats) {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(80, t + offset)
      osc.frequency.exponentialRampToValueAtTime(40, t + offset + 0.15)
      gain.gain.setValueAtTime(0.5, t + offset)
      gain.gain.exponentialRampToValueAtTime(0.001, t + offset + 0.2)
      osc.connect(gain)
      gain.connect(sfx)
      osc.start(t + offset)
      osc.stop(t + offset + 0.25)
    }
  }

  playFanfare(): void {
    const ctx = this.getCtx()
    const sfx = this.sfxGain
    if (!sfx) return
    const t = ctx.currentTime
    const notes = [523.25, 659.25, 783.99, 1046.5]
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'triangle'
      osc.frequency.value = freq
      const start = t + i * 0.1
      gain.gain.setValueAtTime(0, start)
      gain.gain.linearRampToValueAtTime(0.4, start + 0.05)
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.5)
      osc.connect(gain)
      gain.connect(sfx)
      osc.start(start)
      osc.stop(start + 0.6)
    })
  }

  startBgm(): void {
    if (this.bgmPlaying) return
    this.bgmPlaying = true
    this._loopBgm()
  }

  private _loopBgm(): void {
    if (!this.bgmPlaying) return
    const ctx = this.getCtx()
    const bgm = this.bgmGain
    if (!bgm) return

    const t = ctx.currentTime
    const loopLen = 4
    const scale = [261.63, 293.66, 329.63, 349.23, 392.0, 440.0, 493.88]
    const pattern = [0, 2, 4, 2, 0, 4, 2, 0, 2, 4, 2, 5, 4, 2, 0, 2]

    pattern.forEach((degree, i) => {
      const freq = (scale[degree] ?? 261.63) / 4
      const start = t + (i / pattern.length) * loopLen
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.value = freq
      gain.gain.setValueAtTime(0, start)
      gain.gain.linearRampToValueAtTime(0.06, start + 0.05)
      gain.gain.exponentialRampToValueAtTime(0.001, start + loopLen / pattern.length - 0.02)
      osc.connect(gain)
      gain.connect(bgm)
      osc.start(start)
      osc.stop(start + loopLen / pattern.length)
      this.bgmOscillators.push(osc)
    })

    setTimeout(() => this._loopBgm(), loopLen * 1000 - 100)
  }

  stopBgm(): void {
    this.bgmPlaying = false
    const ctx = this.ctx
    if (!ctx) return
    for (const osc of this.bgmOscillators) {
      try {
        osc.stop(ctx.currentTime + 0.3)
      } catch {
        // already stopped
      }
    }
    this.bgmOscillators = []
  }

  isBgmPlaying(): boolean {
    return this.bgmPlaying
  }
}

export const audioEngine: AudioEngine = new AudioEngineImpl()
