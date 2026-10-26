// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { cleanGloss, isPlayableWord, parseRecord } from './wiktionary'
import { fixtureLines } from './fixtures/load'

const line = (edition: 'it' | 'en', word: string, lang: string, pos?: string): string => {
  const found = fixtureLines(edition).find((l) => {
    const e = JSON.parse(l) as { word: string; lang_code: string; pos: string }
    return e.word === word && e.lang_code === lang && (!pos || e.pos === pos)
  })
  if (!found) throw new Error(`fixture ${edition}:${lang}:${word} missing`)
  return found
}

describe('parseRecord', () => {
  it('drops proper nouns', () => {
    expect(parseRecord(line('en', 'Juan', 'es'), 'en')).toBeNull()
  })
  it('extracts form_of lemmas', () => {
    const r = parseRecord(line('en', 'estaba', 'es'), 'en')
    expect(r?.formOf).toEqual(['estar'])
    expect(r?.glosses).toEqual([])
  })
  it('keeps glosses and translations of known languages', () => {
    const r = parseRecord(line('en', 'dog', 'en', 'noun'), 'en')
    expect(r?.lang).toBe('en')
    expect(r?.glosses.length).toBeGreaterThan(0)
    expect(r?.translations).toContainEqual(expect.objectContaining({ lang: 'it', word: 'cane' }))
  })
  it('ignores languages outside the app', () => {
    expect(parseRecord('{"word":"x","lang_code":"fi","pos":"noun","senses":[]}', 'en')).toBeNull()
  })
})

describe('cleanGloss', () => {
  it('rejects italian wiktionary stub glosses', () => {
    expect(cleanGloss('casa ( approfondimento) f sing', 'casa')).toBeNull()
    expect(cleanGloss('casa ( citazioni)', 'casa')).toBeNull()
  })
  it('strips parentheticals and trailing punctuation', () => {
    expect(cleanGloss("edificio (destinato) all'abitazione.", 'casa')).toBe(
      "edificio all'abitazione",
    )
  })
  it('rejects glosses equal to the word', () => {
    expect(cleanGloss('Casa', 'casa')).toBeNull()
  })
})

describe('isPlayableWord', () => {
  it.each([
    ["l'acqua", false],
    ['o-clock', false],
    ['straße', true],
    ['a', false],
    ['niño', true],
    ['abcdefghijklm', false],
  ])('%s → %s', (word, expected) => {
    expect(isPlayableWord(word)).toBe(expected)
  })
})
