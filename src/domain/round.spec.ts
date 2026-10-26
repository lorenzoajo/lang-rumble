import { describe, expect, it } from 'vitest'
import fixture from '@/test/fixtures/it-es.json'
import dictEs from '@/test/fixtures/dict-es.json'
import dictIt from '@/test/fixtures/dict-it.json'
import type { LoadedPair } from '@/data/loader'
import { emptyProgress, type PairProgress } from '@/lib/storage'
import { ROUND_MS, Round } from './round'
import { mulberry32 } from './rng'
import { scoreCorrect, scoreWrongReal } from './scoring'
import { graphemes, wordFromPath } from './grid'
import type { Mode, PairData } from './types'

const data = fixture as PairData
const pair: LoadedPair = { data, dict: { target: new Set(dictEs), base: new Set(dictIt) } }

function setup(
  mode: Mode = 'word-to-target',
  progress: PairProgress = emptyProgress(),
  p: LoadedPair = pair,
) {
  let t = 1_000_000
  const clock = { advance: (ms: number) => (t += ms) }
  const round = new Round({ pair: p, mode, progress, now: () => t, rng: mulberry32(42) })
  round.start()
  return { round, clock, progress }
}

describe('Round clock', () => {
  it('counts down from two minutes', () => {
    const { round, clock } = setup()
    clock.advance(10_000)
    expect(round.remainingMs()).toBe(ROUND_MS - 10_000)
  })
  it('does not count paused time', () => {
    const { round, clock } = setup()
    clock.advance(10_000)
    round.pause()
    clock.advance(30_000)
    round.resume()
    expect(round.remainingMs()).toBe(110_000)
  })
  it('ends when time runs out', () => {
    const { round, clock } = setup()
    clock.advance(ROUND_MS)
    expect(round.remainingMs()).toBe(0)
    expect(round.state.over).toBe(true)
  })
})

describe('Round answers', () => {
  it('puts the answer on the board', () => {
    const { round } = setup()
    const prompt = round.state.prompt!
    expect(wordFromPath(round.state.tiles, round.answerPath)).toBe(prompt.accepted[0])
  })
  it('scores a correct answer with time bonus and pauses for the popup', () => {
    const { round, clock } = setup()
    clock.advance(5_000)
    const answer = round.state.prompt!.accepted[0]!
    const out = round.submit(answer)
    expect(out.evaluation.kind).toBe('correct')
    expect(out.points).toBe(scoreCorrect(graphemes(answer).length, 5_000, 0))
    expect(round.state.streak).toBe(1)
    expect(round.state.paused).toBe(true)
  })
  it('awards a real but wrong word only once per round', () => {
    const { round } = setup()
    const decoy = round.state.prompt!.accepted.includes('mesa') ? 'sol' : 'mesa'
    expect(round.submit(decoy).points).toBe(scoreWrongReal(graphemes(decoy).length))
    round.resume()
    expect(round.submit(decoy).points).toBe(0)
    expect(round.state.wrongReal).toHaveLength(1)
  })
  it('ignores submissions while paused', () => {
    const { round } = setup()
    round.pause()
    expect(round.submit(round.state.prompt!.accepted[0]!).evaluation.kind).toBe('invalid')
  })
  it('loads a new prompt after next()', () => {
    const { round } = setup()
    const first = round.state.prompt!.entry.id
    round.submit(round.state.prompt!.accepted[0]!)
    round.next()
    expect(round.state.paused).toBe(false)
    expect(round.state.prompt!.entry.id).not.toBe(first)
  })
})

describe('Round progress', () => {
  it('resets the streak on skip and drops the word to box 0', () => {
    const progress = emptyProgress()
    const { round } = setup('word-to-target', progress)
    round.submit(round.state.prompt!.accepted[0]!)
    round.next()
    const skipped = round.state.prompt!.entry.id
    round.skip()
    expect(round.state.streak).toBe(0)
    round.applyTo(progress)
    expect(progress.words[skipped]?.production?.box).toBe(0)
    expect(progress.rounds).toBe(1)
    expect(progress.points).toBe(round.state.score)
  })
  it('lists words that reach the mastered box', () => {
    const progress = emptyProgress()
    progress.words.casa = { production: { box: 2, seen: 2, correct: 2, lastSeen: 0 } }
    const { round } = setup('word-to-target', progress)
    for (let i = 0; i < 10 && !round.state.newlyMastered.length; i++) {
      round.submit(round.state.prompt!.accepted[0]!)
      round.next()
    }
    expect(round.state.newlyMastered).toContain('casa')
  })
  it('keeps directions apart', () => {
    const progress = emptyProgress()
    const { round } = setup('target-to-word', progress)
    const id = round.state.prompt!.entry.id
    round.submit(round.state.prompt!.accepted[0]!)
    round.applyTo(progress)
    expect(progress.words[id]?.recognition?.box).toBe(1)
    expect(progress.words[id]?.production).toBeUndefined()
  })
  it('ends immediately when the mode has no words', () => {
    const empty: LoadedPair = {
      ...pair,
      data: { ...data, deck: data.deck.map(({ phrase: _, ...e }) => e) },
    }
    const { round } = setup('phrase-to-target', emptyProgress(), empty)
    expect(round.state.over).toBe(true)
    expect(round.state.prompt).toBeNull()
  })
})
