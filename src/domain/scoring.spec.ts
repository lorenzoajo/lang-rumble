import { describe, expect, it } from 'vitest'
import { scoreCorrect, scoreWrongReal } from './scoring'

describe('scoring', () => {
  it('gives letters plus the full time bonus when instant', () => {
    expect(scoreCorrect(4, 0, 0)).toBe(90)
  })
  it('drops the time bonus after 30 seconds', () => {
    expect(scoreCorrect(4, 30_000, 0)).toBe(40)
    expect(scoreCorrect(4, 90_000, 0)).toBe(40)
  })
  it('caps the streak multiplier at x2', () => {
    expect(scoreCorrect(4, 0, 10)).toBe(180)
  })
  it('gives a small bonus for real but wrong words', () => {
    expect(scoreWrongReal(5)).toBe(10)
  })
})
