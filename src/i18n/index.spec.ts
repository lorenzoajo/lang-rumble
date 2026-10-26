import { describe, expect, it } from 'vitest'
import { ref } from 'vue'
import { detectBaseLang, langName, provideLang, useI18n } from './index'
import { en, it as itMessages } from './messages'

describe('detectBaseLang', () => {
  it('picks italian from a regional italian locale', () => {
    expect(detectBaseLang(['it-CH', 'en'])).toBe('it')
  })
  it('picks english from en-GB', () => {
    expect(detectBaseLang(['en-GB'])).toBe('en')
  })
  it('skips unsupported languages until a supported one', () => {
    expect(detectBaseLang(['de-DE', 'it'])).toBe('it')
  })
  it('defaults to english when nothing matches', () => {
    expect(detectBaseLang([])).toBe('en')
    expect(detectBaseLang(['de-DE'])).toBe('en')
  })
})

describe('messages', () => {
  it('has a non-empty italian translation for every english key', () => {
    for (const key of Object.keys(en) as (keyof typeof en)[]) {
      expect(itMessages[key], key).toBeTruthy()
    }
  })
})

describe('useI18n', () => {
  it('interpolates params in the active language', () => {
    const lang = ref<'it' | 'en'>('en')
    provideLang(lang)
    const { t } = useI18n()
    expect(t('round.points', { n: 5 })).toBe('5 points')
    lang.value = 'it'
    expect(t('round.points', { n: 5 })).toBe('5 punti')
  })
  it('names languages in the base language', () => {
    expect(langName('de', 'it')).toBe('Tedesco')
    expect(langName('de', 'en')).toBe('German')
  })
})
