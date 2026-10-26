import { describe, expect, it } from 'vitest'
import { applyResult, isMastered, pickNext } from './repetition'
import { mulberry32 } from './rng'
import type { DeckEntry } from './types'
import type { PairProgress } from '@/lib/storage'

const entry = (id: string, rank: number): DeckEntry => ({
  id,
  rank,
  target: [id],
  base: [id + '-b'],
})
const deck = [entry('a', 1), entry('b', 2), entry('c', 3)]
const NOW = 1_000_000_000

describe('applyResult', () => {
  it('moves up one box on correct and caps at 5', () => {
    expect(applyResult(undefined, 'correct', NOW)).toEqual({
      box: 1,
      seen: 1,
      correct: 1,
      lastSeen: NOW,
    })
    expect(applyResult({ box: 5, seen: 9, correct: 9, lastSeen: 0 }, 'correct', NOW).box).toBe(5)
  })
  it('drops to box 0 on skip', () => {
    expect(applyResult({ box: 4, seen: 4, correct: 4, lastSeen: 0 }, 'skip', NOW)).toEqual({
      box: 0,
      seen: 5,
      correct: 4,
      lastSeen: NOW,
    })
  })
  it('only counts the view on seen', () => {
    expect(applyResult({ box: 2, seen: 2, correct: 2, lastSeen: 0 }, 'seen', NOW)).toEqual({
      box: 2,
      seen: 3,
      correct: 2,
      lastSeen: NOW,
    })
  })
  it('treats box 3 as mastered', () => {
    expect(isMastered({ box: 3, seen: 3, correct: 3, lastSeen: 0 })).toBe(true)
    expect(isMastered({ box: 2, seen: 3, correct: 3, lastSeen: 0 })).toBe(false)
    expect(isMastered(undefined)).toBe(false)
  })
})

describe('pickNext', () => {
  it('introduces the most frequent word first', () => {
    expect(pickNext(deck, {}, 'production', NOW, mulberry32(1), new Set())?.id).toBe('a')
  })
  it('favours low boxes over mastered words', () => {
    const old = NOW - 3_600_000
    const words: PairProgress['words'] = {
      a: { production: { box: 0, seen: 3, correct: 0, lastSeen: old } },
      b: { production: { box: 5, seen: 9, correct: 9, lastSeen: old } },
      c: { production: { box: 5, seen: 9, correct: 9, lastSeen: old } },
    }
    const rng = mulberry32(7)
    const counts: Record<string, number> = { a: 0, b: 0, c: 0 }
    for (let i = 0; i < 1000; i++) {
      const id = pickNext(deck, words, 'production', NOW, rng, new Set())?.id
      if (id) counts[id] = (counts[id] ?? 0) + 1
    }
    expect(counts.a).toBeGreaterThan(5 * (counts.b ?? 0))
  })
  it('tracks directions separately', () => {
    const words: PairProgress['words'] = {
      a: { recognition: { box: 5, seen: 9, correct: 9, lastSeen: NOW } },
    }
    expect(pickNext([entry('a', 1)], words, 'production', NOW, mulberry32(1), new Set())?.id).toBe(
      'a',
    )
  })
  it('never returns an excluded word', () => {
    for (let seed = 0; seed < 50; seed++) {
      expect(pickNext(deck, {}, 'production', NOW, mulberry32(seed), new Set(['a']))?.id).not.toBe(
        'a',
      )
    }
  })
  it('returns null for an empty pool', () => {
    expect(pickNext([], {}, 'production', NOW, mulberry32(1), new Set())).toBeNull()
  })
})
