import type { PairProgress, WordStat } from '@/lib/storage'
import { weightedPick } from './rng'
import type { DeckEntry, Direction } from './types'

export const MASTERED_BOX = 3
const MAX_BOX = 5
const BOX_WEIGHTS = [8, 4, 2, 1, 0.5, 0.25]
const NEW_WORD_WEIGHT = 6
const RECENT_MS = 120_000
const RECENT_FACTOR = 0.1

export function applyResult(
  stat: WordStat | undefined,
  result: 'correct' | 'skip' | 'seen',
  now: number,
): WordStat {
  const prev = stat ?? { box: 0, seen: 0, correct: 0, lastSeen: 0 }
  const box =
    result === 'correct' ? Math.min(prev.box + 1, MAX_BOX) : result === 'skip' ? 0 : prev.box
  return {
    box,
    seen: prev.seen + 1,
    correct: prev.correct + (result === 'correct' ? 1 : 0),
    lastSeen: now,
  }
}

export function isMastered(stat: WordStat | undefined): boolean {
  return (stat?.box ?? 0) >= MASTERED_BOX
}

/**
 * Leitner-weighted pick: seen words are weighted by box (recently seen ones damped),
 * and the most frequent unseen word competes as the next new word.
 */
export function pickNext(
  pool: DeckEntry[],
  stats: PairProgress['words'],
  dir: Direction,
  now: number,
  rng: () => number,
  exclude: ReadonlySet<string>,
): DeckEntry | null {
  const items: DeckEntry[] = []
  const weights: number[] = []
  let fresh: DeckEntry | null = null
  for (const entry of pool) {
    if (exclude.has(entry.id)) continue
    const stat = stats[entry.id]?.[dir]
    if (!stat) {
      if (!fresh || entry.rank < fresh.rank) fresh = entry
      continue
    }
    const recent = now - stat.lastSeen < RECENT_MS ? RECENT_FACTOR : 1
    items.push(entry)
    weights.push((BOX_WEIGHTS[stat.box] ?? BOX_WEIGHTS[MAX_BOX] ?? 0.25) * recent)
  }
  if (fresh) {
    items.push(fresh)
    weights.push(NEW_WORD_WEIGHT)
  }
  return weightedPick(items, weights, rng)
}
