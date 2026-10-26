// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { baseDefinition, baseTranslations, buildIndex, targetTranslations } from './resolve'
import { fixtureRecords } from './fixtures/load'
import type { LexRecord } from './wiktionary'

const all = buildIndex([...fixtureRecords('it'), ...fixtureRecords('en')])

describe('baseTranslations', () => {
  it('uses the italian edition gloss for a spanish word', () => {
    expect(baseTranslations(all, 'it', 'es', 'casa')).toContain('casa')
    expect(baseTranslations(all, 'it', 'es', 'perro')).toContain('cane')
  })
  it('pivots through english when the italian edition has no entry', () => {
    // hogar is absent from the italian edition fixture: es hogar → en home → it casa
    expect(baseTranslations(all, 'it', 'es', 'hogar')).toContain('casa')
  })
  it('uses english glosses for english base', () => {
    expect(baseTranslations(all, 'en', 'es', 'perro')).toContain('dog')
  })
  it('returns nothing for unknown words', () => {
    expect(baseTranslations(all, 'it', 'es', 'zzz')).toEqual([])
  })
})

describe('baseDefinition', () => {
  it('returns an italian definition from the italian edition', () => {
    expect(baseDefinition(all, 'it', 'cane')).toMatch(/^animale domestico/)
  })
  it('returns null when only stub glosses exist', () => {
    expect(baseDefinition(all, 'it', 'casa')).toBeNull()
  })
  it('returns an english definition for english base', () => {
    expect(baseDefinition(all, 'en', 'house')).toMatch(/abode/)
  })
})

describe('targetTranslations', () => {
  it('maps an english word to spanish via translation tables', () => {
    expect(targetTranslations(all, 'en', 'es', 'dog')).toContain('perro')
  })
  it('maps an italian word to english', () => {
    expect(targetTranslations(all, 'it', 'en', 'cane')).toContain('dog')
  })
})

describe('translation quality rules', () => {
  const rec = (
    r: Partial<LexRecord> & Pick<LexRecord, 'edition' | 'lang' | 'word'>,
  ): LexRecord => ({
    pos: 'noun',
    glosses: [],
    formOf: [],
    translations: [],
    ...r,
  })

  it('skips a word whose own gloss is unplayable instead of using noisy reverse tables', () => {
    const idx = buildIndex([
      rec({ edition: 'it', lang: 'de', word: 'und', pos: 'conj', glosses: ['e'] }),
      rec({
        edition: 'it',
        lang: 'it',
        word: 'più',
        pos: 'adv',
        glosses: ['in maggior quantità'],
        translations: [
          { lang: 'de', word: 'mehr', sense: 'quantità' },
          { lang: 'de', word: 'und', sense: 'addizione' },
        ],
      }),
    ])
    expect(baseTranslations(idx, 'it', 'de', 'und')).toEqual([])
  })

  it('uses only the first sense of reverse translation tables', () => {
    const idx = buildIndex([
      rec({
        edition: 'it',
        lang: 'it',
        word: 'più',
        glosses: ['in maggior quantità'],
        translations: [
          { lang: 'de', word: 'mehr', sense: 'quantità' },
          { lang: 'de', word: 'plus', sense: 'addizione' },
        ],
      }),
      rec({ edition: 'it', lang: 'de', word: 'plus', glosses: [] }),
    ])
    expect(baseTranslations(idx, 'it', 'de', 'mehr')).toEqual(['più'])
    expect(baseTranslations(idx, 'it', 'de', 'plus')).toEqual([])
  })

  it('prefers a definition with the same part of speech', () => {
    const idx = buildIndex([
      rec({ edition: 'it', lang: 'it', word: 'avere', pos: 'noun', glosses: ['totale dei beni'] }),
      rec({ edition: 'it', lang: 'it', word: 'avere', pos: 'verb', glosses: ['possedere'] }),
    ])
    expect(baseDefinition(idx, 'it', 'avere', 'verb')).toBe('possedere')
    expect(baseDefinition(idx, 'it', 'avere')).toBe('totale dei beni')
  })
})
