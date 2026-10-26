// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { baseDefinition, baseTranslations, buildIndex, targetTranslations } from './resolve'
import { fixtureRecords } from './fixtures/load'

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
