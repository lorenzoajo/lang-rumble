import { describe, expect, it } from 'vitest'
import {
  generateGrid,
  graphemes,
  isAdjacent,
  isValidPath,
  letterFrequencies,
  wordFromPath,
} from './grid'
import { mulberry32 } from './rng'

const freq = letterFrequencies(['casa', 'perro', 'gato', 'niño', 'straße'])

describe('adjacency', () => {
  it('treats diagonals as adjacent and row wraps as not', () => {
    expect(isAdjacent(0, 5)).toBe(true)
    expect(isAdjacent(3, 4)).toBe(false)
    expect(isAdjacent(5, 5)).toBe(false)
  })
  it('rejects paths that reuse a tile or jump', () => {
    expect(isValidPath([0, 1, 2])).toBe(true)
    expect(isValidPath([0, 1, 0])).toBe(false)
    expect(isValidPath([0, 2])).toBe(false)
  })
})

describe('graphemes', () => {
  it('keeps accented letters as one tile', () => {
    expect(graphemes('niño')).toHaveLength(4)
    expect(graphemes('Cœur')).toEqual(['c', 'œ', 'u', 'r'])
  })
})

describe('generateGrid', () => {
  it.each(['straße', 'niño', 'cœur', 'casa', 'abcdefghijklmnop'])(
    'always contains %s',
    (answer) => {
      for (let seed = 0; seed < 200; seed++) {
        const { tiles, answerPath } = generateGrid(
          answer,
          ['gato', 'perro'],
          freq,
          mulberry32(seed),
        )
        expect(tiles).toHaveLength(16)
        expect(isValidPath(answerPath)).toBe(true)
        expect(wordFromPath(tiles, answerPath)).toBe(answer)
      }
    },
  )
  it('throws on answers longer than the board', () => {
    expect(() => generateGrid('abcdefghijklmnopq', [], freq, mulberry32(1))).toThrow()
  })
  it('fills every tile with a letter', () => {
    const { tiles } = generateGrid('sí', [], freq, mulberry32(3))
    expect(tiles.every((t) => /^\p{L}$/u.test(t))).toBe(true)
  })
})
