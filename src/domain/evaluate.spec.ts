import { describe, expect, it } from 'vitest'
import fixture from '@/test/fixtures/it-es.json'
import dictEs from '@/test/fixtures/dict-es.json'
import dictIt from '@/test/fixtures/dict-it.json'
import type { LoadedPair } from '@/data/loader'
import { evaluate } from './evaluate'
import { buildPrompt } from './prompt'
import type { PairData } from './types'

const data = fixture as PairData
const pair: LoadedPair = { data, dict: { target: new Set(dictEs), base: new Set(dictIt) } }
const entry = (id: string) => data.deck.find((e) => e.id === id)!

describe('evaluate', () => {
  it('accepts the answer with an italian definition', () => {
    const r = evaluate('casa', buildPrompt(entry('casa'), 'word-to-target'), pair)
    expect(r.kind).toBe('correct')
    if (r.kind !== 'correct') return
    expect(r.reveal).toMatchObject({ word: 'casa', correct: true, translations: ['casa'] })
    expect(r.reveal.definition).toMatch(/abitazione/)
  })
  it('accepts a synonym as correct without calling it a form of the lemma', () => {
    const r = evaluate('HOGAR', buildPrompt(entry('casa'), 'word-to-target'), pair)
    expect(r.kind).toBe('correct')
    if (r.kind === 'correct') expect(r.reveal.lemma).toBeNull()
  })
  it('accepts the inflected gap and reports the lemma in phrase mode', () => {
    const r = evaluate('estaba', buildPrompt(entry('estar'), 'phrase-to-target'), pair)
    expect(r.kind).toBe('correct')
    if (r.kind === 'correct') expect(r.reveal.lemma).toBe('estar')
  })
  it('treats the lemma as a real but wrong word and flags it as the base form', () => {
    const r = evaluate('estar', buildPrompt(entry('estar'), 'phrase-to-target'), pair)
    expect(r.kind).toBe('wrong-real')
    if (r.kind === 'wrong-real') expect(r.reveal.baseForm).toBe(true)
  })
  it('does not flag unrelated wrong words as the base form', () => {
    const r = evaluate('perro', buildPrompt(entry('estar'), 'phrase-to-target'), pair)
    if (r.kind !== 'wrong-real') throw new Error('expected wrong-real')
    expect(r.reveal.baseForm).toBe(false)
  })
  it('lists the other accepted answers on a correct answer', () => {
    const r = evaluate('casa', buildPrompt(entry('casa'), 'word-to-target'), pair)
    if (r.kind !== 'correct') throw new Error('expected correct')
    expect(r.reveal.alternatives).toEqual(['hogar'])
  })
  it('explains a real but wrong word', () => {
    const r = evaluate('perro', buildPrompt(entry('casa'), 'word-to-target'), pair)
    expect(r.kind).toBe('wrong-real')
    if (r.kind !== 'wrong-real') return
    expect(r.reveal.correct).toBe(false)
    expect(r.reveal.translations).toContain('cane')
  })
  it('falls back to the definition of the translation when the word has none', () => {
    const r = evaluate('gato', buildPrompt(entry('casa'), 'word-to-target'), pair)
    if (r.kind !== 'wrong-real') throw new Error('expected wrong-real')
    expect(r.reveal.definition).toBe('felino domestico')
  })
  it('knows dictionary words without lexicon data', () => {
    const r = evaluate('mesa', buildPrompt(entry('casa'), 'word-to-target'), pair)
    expect(r.kind).toBe('wrong-real')
    if (r.kind === 'wrong-real') expect(r.reveal.definition).toBeNull()
  })
  it('rejects non words', () => {
    expect(evaluate('xqz', buildPrompt(entry('casa'), 'word-to-target'), pair).kind).toBe('invalid')
  })
})
