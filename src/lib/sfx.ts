import { log } from './log'

export type SfxName = 'tile' | 'correct' | 'wrong' | 'invalid' | 'tick' | 'end' | 'tap'

interface Note {
  freq: number
  at: number
  dur: number
  type?: OscillatorType
  gain?: number
}

const C5 = 523.25
const semitone = (base: number, n: number): number => base * 2 ** (n / 12)

const SOUNDS: Record<Exclude<SfxName, 'tile'>, Note[]> = {
  tap: [{ freq: 880, at: 0, dur: 0.05, type: 'triangle', gain: 0.15 }],
  tick: [{ freq: 1200, at: 0, dur: 0.03, type: 'square', gain: 0.05 }],
  correct: [0, 4, 7, 12].map((n, i) => ({
    freq: semitone(C5, n),
    at: i * 0.07,
    dur: 0.14,
    type: 'triangle' as const,
  })),
  wrong: [
    { freq: semitone(C5, 0), at: 0, dur: 0.12, type: 'sawtooth', gain: 0.12 },
    { freq: semitone(C5, -5), at: 0.11, dur: 0.2, type: 'sawtooth', gain: 0.12 },
  ],
  invalid: [{ freq: 160, at: 0, dur: 0.15, type: 'square', gain: 0.1 }],
  end: [12, 7, 4, 0, 12].map((n, i) => ({
    freq: semitone(C5, n),
    at: i * 0.12,
    dur: 0.18,
    type: 'square' as const,
    gain: 0.1,
  })),
}

let ctx: AudioContext | null = null
let enabled = true

function context(): AudioContext | null {
  if (ctx) return ctx
  const Ctor = globalThis.AudioContext
  if (!Ctor) return null
  try {
    ctx = new Ctor()
  } catch (err) {
    log.warn('audio unavailable', { err: String(err) })
    return null
  }
  return ctx
}

function playNotes(notes: Note[]): void {
  const ac = context()
  if (!ac) return
  if (ac.state === 'suspended') void ac.resume()
  const t0 = ac.currentTime
  for (const n of notes) {
    const osc = ac.createOscillator()
    const gain = ac.createGain()
    osc.type = n.type ?? 'sine'
    osc.frequency.value = n.freq
    gain.gain.setValueAtTime(n.gain ?? 0.18, t0 + n.at)
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + n.at + n.dur)
    osc.connect(gain).connect(ac.destination)
    osc.start(t0 + n.at)
    osc.stop(t0 + n.at + n.dur + 0.02)
  }
}

export const sfx = {
  /** `step` raises the pitch of consecutive tiles in a trace, like a slot machine climbing. */
  play(name: SfxName, step = 0): void {
    if (!enabled) return
    if (name === 'tile') {
      playNotes([
        {
          freq: semitone(C5, Math.min(step, 16) * 2),
          at: 0,
          dur: 0.07,
          type: 'triangle',
          gain: 0.12,
        },
      ])
      return
    }
    playNotes(SOUNDS[name])
  },
  setEnabled(on: boolean): void {
    enabled = on
  },
  haptic(pattern: number | number[]): void {
    if (enabled) globalThis.navigator?.vibrate?.(pattern)
  },
}
