import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import RoundHud from './RoundHud.vue'

describe('RoundHud', () => {
  it('formats the remaining time and warns under ten seconds', () => {
    const w = mount(RoundHud, { props: { remainingMs: 65_000, score: 0, streak: 0 } })
    expect(w.get('[data-test="timer"]').text()).toBe('1:05')
    expect(w.get('[data-test="timer"]').classes()).not.toContain('is-low')
  })
  it('marks the timer low near the end', () => {
    const w = mount(RoundHud, { props: { remainingMs: 9_000, score: 0, streak: 0 } })
    expect(w.get('[data-test="timer"]').text()).toBe('0:09')
    expect(w.get('[data-test="timer"]').classes()).toContain('is-low')
  })
})
