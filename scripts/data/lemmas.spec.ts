// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { rankLemmas } from './lemmas'

describe('rankLemmas', () => {
  const formOf = new Map([
    ['estaba', ['estar']],
    ['está', ['estar']],
  ])
  const known = new Set(['estar', 'casa'])

  it('merges inflected forms into their lemma', () => {
    expect(
      rankLemmas(
        [
          ['estaba', 10],
          ['estar', 5],
          ['está', 7],
        ],
        formOf,
        known,
      ),
    ).toEqual([{ lemma: 'estar', count: 22, forms: ['estaba', 'estar', 'está'] }])
  })
  it('keeps a word that is itself a lemma even if it is also a form', () => {
    const f = new Map([['casa', ['casar']]])
    expect(rankLemmas([['casa', 3]], f, known)[0]?.lemma).toBe('casa')
  })
  it('orders by merged count and drops unknown words', () => {
    const r = rankLemmas(
      [
        ['casa', 15],
        ['estaba', 10],
        ['estar', 6],
        ['zzz', 100],
      ],
      formOf,
      known,
    )
    expect(r.map((x) => x.lemma)).toEqual(['estar', 'casa'])
  })
})
