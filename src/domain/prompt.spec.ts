import { describe, expect, it } from 'vitest'
import fixture from '@/test/fixtures/it-es.json'
import { buildPrompt, poolFor } from './prompt'
import type { PairData } from './types'

const data = fixture as PairData
const entry = (id: string) => data.deck.find((e) => e.id === id)!

describe('buildPrompt', () => {
  it('shows the base word and accepts target synonyms in word-to-target', () => {
    const p = buildPrompt(entry('casa'), 'word-to-target')
    expect(p).toMatchObject({
      shown: 'casa',
      answerSide: 'target',
      accepted: ['casa', 'hogar'],
      phraseText: null,
    })
  })
  it('shows the target word and accepts every base translation in target-to-word', () => {
    const p = buildPrompt(entry('estar'), 'target-to-word')
    expect(p).toMatchObject({ shown: 'estar', answerSide: 'base', accepted: ['essere', 'stare'] })
  })
  it('blanks the gap in phrase-to-target', () => {
    const p = buildPrompt(entry('estar'), 'phrase-to-target')
    expect(p.phraseText).toBe('＿＿＿＿＿＿ aquí.')
    expect(p.hint).toBe('Ero qui.')
    expect(p.accepted).toEqual(['estaba'])
    expect(p.answerSide).toBe('target')
  })
  it('blanks the base gap in phrase-to-base', () => {
    const p = buildPrompt(entry('estar'), 'phrase-to-base')
    expect(p.phraseText).toBe('Devo ＿＿＿＿＿ qui.')
    expect(p.accepted).toEqual(['stare'])
    expect(p.answerSide).toBe('base')
  })
})

describe('poolFor', () => {
  it('keeps only entries with a phrase for phrase modes', () => {
    expect(poolFor(data.deck, 'phrase-to-target').map((e) => e.id)).toEqual(['estar'])
    expect(poolFor(data.deck, 'word-to-target')).toHaveLength(5)
  })
})
