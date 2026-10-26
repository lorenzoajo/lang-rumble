import { computed, ref, shallowRef, type ComputedRef, type Ref } from 'vue'
import type { BaseLang, LangCode } from '@/domain/types'
import { en, it, type MessageKey } from './messages'

const catalogs: Record<BaseLang, Record<MessageKey, string>> = { en, it }

const names: Record<BaseLang, Record<LangCode, string>> = {
  en: { it: 'Italian', en: 'English', es: 'Spanish', de: 'German', fr: 'French' },
  it: { it: 'Italiano', en: 'Inglese', es: 'Spagnolo', de: 'Tedesco', fr: 'Francese' },
}

// Holder ref so components that called useI18n() before the store bound a source still react.
const current = shallowRef<{ src: Ref<BaseLang> }>({ src: ref('en') })

export function detectBaseLang(languages: readonly string[]): BaseLang {
  for (const tag of languages) {
    const primary = tag.toLowerCase().split('-')[0]
    if (primary === 'it' || primary === 'en') return primary
  }
  return 'en'
}

/** Binds the UI language to a reactive source (the settings store). */
export function provideLang(source: Ref<BaseLang>): void {
  current.value = { src: source }
}

export function langName(code: LangCode, inLang: BaseLang): string {
  return names[inLang][code]
}

export function translate(
  lang: BaseLang,
  key: MessageKey,
  params?: Record<string, string | number>,
): string {
  const template = catalogs[lang][key]
  if (!params) return template
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in params ? String(params[name]) : match,
  )
}

export function useI18n(): {
  t: (key: MessageKey, params?: Record<string, string | number>) => string
  lang: ComputedRef<BaseLang>
} {
  const lang = computed(() => current.value.src.value)
  return { t: (key, params) => translate(lang.value, key, params), lang }
}

export type { MessageKey }
