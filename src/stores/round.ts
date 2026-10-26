import { reactive, ref, shallowRef } from 'vue'
import { defineStore } from 'pinia'
import { loadPair } from '@/data/loader'
import type { Reveal } from '@/domain/evaluate'
import { ROUND_MS, Round } from '@/domain/round'
import type { Mode, PairKey } from '@/domain/types'
import { emptyProgress } from '@/lib/storage'
import { log } from '@/lib/log'
import { sfx } from '@/lib/sfx'
import { useAppStore } from './app'

export interface RoundSummary {
  mode: Mode
  pair: PairKey
  score: number
  correct: string[]
  wrongReal: Reveal[]
  bestStreak: number
  newlyMastered: string[]
}

const WARN_FROM_MS = 10_000

export const useRoundStore = defineStore('round', () => {
  const round = shallowRef<Round | null>(null)
  const remainingMs = ref(ROUND_MS)
  const loading = ref(false)
  const error = ref<string | null>(null)
  const lastSummary = ref<RoundSummary | null>(null)
  let pair: PairKey | null = null
  let mode: Mode | null = null
  let frame = 0
  let lastWholeSecond = 0
  let onEnd: (() => void) | null = null

  function tick(): void {
    const r = round.value
    if (!r) return
    remainingMs.value = r.remainingMs()
    const whole = Math.ceil(remainingMs.value / 1000)
    if (!r.state.paused && whole !== lastWholeSecond && remainingMs.value < WARN_FROM_MS)
      sfx.play('tick')
    lastWholeSecond = whole
    if (r.state.over) {
      end()
      return
    }
    frame = requestAnimationFrame(tick)
  }

  async function start(m: Mode, ended: () => void): Promise<void> {
    stop()
    const app = useAppStore()
    const { base, activeTarget } = app.state.settings
    if (!activeTarget || !app.activePair) return
    loading.value = true
    error.value = null
    try {
      const loaded = await loadPair(base, activeTarget)
      const r = reactive(
        new Round({
          pair: loaded,
          mode: m,
          progress: app.state.progress[app.activePair] ?? emptyProgress(),
          now: () => performance.now(),
          rng: Math.random,
        }),
      ) as Round
      pair = app.activePair
      mode = m
      onEnd = ended
      round.value = r
      r.start()
      remainingMs.value = r.remainingMs()
      frame = requestAnimationFrame(tick)
    } catch (err) {
      log.error('could not start round', err)
      error.value = String(err)
    } finally {
      loading.value = false
    }
  }

  /** Commits progress, stores the summary and notifies the view. Safe to call more than once. */
  function end(): void {
    const r = round.value
    if (!r || !pair || !mode) return
    cancelAnimationFrame(frame)
    const app = useAppStore()
    app.commitRound(pair, (p) => r.applyTo(p))
    lastSummary.value = {
      mode,
      pair,
      score: r.state.score,
      correct: [...r.state.correct],
      wrongReal: [...r.state.wrongReal],
      bestStreak: r.state.bestStreak,
      newlyMastered: [...r.state.newlyMastered],
    }
    round.value = null
    sfx.play('end')
    onEnd?.()
    onEnd = null
  }

  /** Drops the round without saving (leaving the play screen mid-round still saves via end()). */
  function stop(): void {
    cancelAnimationFrame(frame)
    round.value = null
    onEnd = null
  }

  return { round, remainingMs, loading, error, lastSummary, start, end, stop }
})
