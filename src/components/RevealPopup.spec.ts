import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import RevealPopup from './RevealPopup.vue'
import type { Reveal } from '@/domain/evaluate'

const reveal = (correct: boolean): Reveal => ({
  word: 'perro',
  side: 'target',
  correct,
  translations: ['cane'],
  definition: 'animale domestico',
  lemma: null,
  alternatives: [],
  baseForm: false,
})

describe('RevealPopup', () => {
  it('styles a correct answer as success', () => {
    const w = mount(RevealPopup, { props: { reveal: reveal(true) } })
    expect(w.get('[role="dialog"]').classes()).toContain('is-correct')
    expect(w.text()).toContain('Correct!')
    expect(w.text()).toContain('animale domestico')
  })
  it('styles a wrong word unmistakably as wrong', () => {
    const w = mount(RevealPopup, { props: { reveal: reveal(false) } })
    expect(w.get('[role="dialog"]').classes()).toContain('is-wrong')
    expect(w.text()).toContain('Not this one!')
    expect(w.text()).not.toContain('Correct!')
  })
  it('falls back when there is no definition', () => {
    const w = mount(RevealPopup, { props: { reveal: { ...reveal(false), definition: null } } })
    expect(w.text()).toContain('No definition available')
  })
  it('emits close from the continue button', async () => {
    const w = mount(RevealPopup, { props: { reveal: reveal(true) } })
    await w.get('button').trigger('click')
    expect(w.emitted('close')).toHaveLength(1)
  })
})
