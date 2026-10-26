import type { BaseLang, LangCode } from '../../src/domain/types'
import { cleanGloss, glossTokens, isPlayableWord, type Edition, type LexRecord } from './wiktionary'

export interface LexIndex {
  records: Map<string, LexRecord[]>
  /** `${edition}:${translationLang}:${translationWord}` → headwords (in the edition's own language) */
  reverseTranslations: Map<string, string[]>
  /** `${edition}:${lang}:${glossToken}` → words of `lang` glossed with that token */
  reverseGlosses: Map<string, string[]>
  words: Map<LangCode, Set<string>>
}

const MAX = 4

const key = (edition: Edition, lang: LangCode, word: string): string => `${edition}:${lang}:${word}`

function push(map: Map<string, string[]>, k: string, v: string): void {
  const list = map.get(k)
  if (!list) map.set(k, [v])
  else if (!list.includes(v)) list.push(v)
}

export function buildIndex(records: Iterable<LexRecord>): LexIndex {
  const idx: LexIndex = {
    records: new Map(),
    reverseTranslations: new Map(),
    reverseGlosses: new Map(),
    words: new Map(),
  }
  for (const r of records) {
    const k = key(r.edition, r.lang, r.word)
    const list = idx.records.get(k)
    if (list) list.push(r)
    else idx.records.set(k, [r])
    if (r.glosses.length) {
      const set = idx.words.get(r.lang) ?? new Set<string>()
      set.add(r.word)
      idx.words.set(r.lang, set)
    }
    if (r.lang === r.edition) {
      for (const t of r.translations) {
        push(idx.reverseTranslations, key(r.edition, t.lang, t.word.toLowerCase()), r.word)
      }
    } else {
      for (const g of r.glosses.slice(0, 2)) {
        for (const token of glossTokens(g))
          push(idx.reverseGlosses, key(r.edition, r.lang, token), r.word)
      }
    }
  }
  return idx
}

export function hasWord(idx: LexIndex, lang: LangCode, word: string): boolean {
  return idx.words.get(lang)?.has(word) ?? false
}

function recordsOf(idx: LexIndex, edition: Edition, lang: LangCode, word: string): LexRecord[] {
  return idx.records.get(key(edition, lang, word)) ?? []
}

function firstGlossTokens(records: LexRecord[], take: number): string[] {
  return records
    .flatMap((r) => r.glosses)
    .slice(0, take)
    .flatMap(glossTokens)
}

/** Translations of the record's first translated sense into `lang`. */
function firstSenseTranslations(records: LexRecord[], lang: LangCode): string[] {
  for (const r of records) {
    const into = r.translations.filter((t) => t.lang === lang)
    const first = into[0]
    if (!first) continue
    return into
      .filter((t) => t.sense === first.sense)
      .map((t) => t.word.toLowerCase())
      .filter(isPlayableWord)
  }
  return []
}

function finish(candidates: string[], accept: (w: string) => boolean): string[] {
  return [...new Set(candidates)].filter(accept).slice(0, MAX)
}

export function baseTranslations(
  idx: LexIndex,
  base: BaseLang,
  target: LangCode,
  lemma: string,
): string[] {
  const known = (w: string): boolean => hasWord(idx, base, w)
  const fromGloss = firstGlossTokens(recordsOf(idx, base, target, lemma), 2)
  const fromTables = idx.reverseTranslations.get(key(base, target, lemma)) ?? []
  const direct = finish([...fromGloss, ...fromTables], known)
  if (direct.length || base === 'en' || target === 'en') return direct
  const english = firstGlossTokens(recordsOf(idx, 'en', target, lemma), 1).slice(0, 1)
  const pivot = english.flatMap((w) => firstSenseTranslations(recordsOf(idx, 'en', 'en', w), base))
  return finish(pivot, known)
}

export function baseDefinition(idx: LexIndex, base: BaseLang, word: string): string | null {
  for (const r of recordsOf(idx, base, base, word)) {
    for (const g of r.glosses) {
      const cleaned = cleanGloss(g, word)
      if (cleaned) return cleaned
    }
  }
  return null
}

export function targetTranslations(
  idx: LexIndex,
  base: BaseLang,
  target: LangCode,
  baseWord: string,
): string[] {
  const known = (w: string): boolean => hasWord(idx, target, w)
  const fromTables = firstSenseTranslations(recordsOf(idx, base, base, baseWord), target)
  const fromGlosses = idx.reverseGlosses.get(key(base, target, baseWord)) ?? []
  const viaEnglishEdition =
    base === 'it' ? firstGlossTokens(recordsOf(idx, 'en', 'it', baseWord), 2) : []
  const englishDirect = target === 'en' ? viaEnglishEdition : []
  const direct = finish([...fromTables, ...fromGlosses, ...englishDirect], known)
  if (direct.length || base === 'en' || target === 'en') return direct
  const pivot = viaEnglishEdition
    .slice(0, 1)
    .flatMap((w) => firstSenseTranslations(recordsOf(idx, 'en', 'en', w), target))
  return finish(pivot, known)
}
