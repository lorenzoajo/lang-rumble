// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { findGap, pickPhrase } from './phrases'

describe('findGap', () => {
  it('matches a form case-insensitively on word boundaries', () => {
    expect(findGap('¿Dónde Estaba él?', ['estaba', 'estar'])).toBe('estaba')
  })
  it('does not match inside a longer word', () => {
    expect(findGap('estabas', ['estaba'])).toBeNull()
  })
})

describe('pickPhrase', () => {
  it('picks the shortest sentence containing a form within the word limit', () => {
    const p = pickPhrase(
      [
        { text: 'Yo estaba en la casa grande de mi abuela ayer por la tarde.', hint: 'long' },
        { text: 'Estaba aquí.', hint: 'Ero qui.' },
        { text: 'No.', hint: 'No.' },
      ],
      ['estaba'],
      10,
    )
    expect(p).toEqual({ text: 'Estaba aquí.', gap: 'estaba', hint: 'Ero qui.' })
  })
  it('returns null when no sentence fits', () => {
    expect(pickPhrase([{ text: 'Hola.', hint: 'Ciao.' }], ['estaba'], 10)).toBeNull()
  })
})
