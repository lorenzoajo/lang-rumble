import type { BaseLang, LangCode } from '../../src/domain/types'
import {
  cleanGloss,
  glossTokens,
  isPlayableWord,
  rawGlossParts,
  type Edition,
  type LexRecord,
} from './wiktionary'

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
      for (const lang of new Set(r.translations.map((t) => t.lang))) {
        for (const w of firstSenseTranslations([r], lang))
          push(idx.reverseTranslations, key(r.edition, lang, w), r.word)
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
  return [...new Set(candidates)].filter((w) => isPlayableWord(w) && accept(w)).slice(0, MAX)
}

/**
 * A word's own gloss is authoritative: when it exists but cannot be played (de "und" → it "e"),
 * the word is skipped rather than filled from noisier sources.
 */
function fromOwnGloss(records: LexRecord[], accept: (w: string) => boolean): string[] | null {
  const glosses = records.flatMap((r) => r.glosses).slice(0, 2)
  if (!glosses.some((g) => rawGlossParts(g).length)) return null
  return finish(glosses.flatMap(glossTokens), accept)
}

export function baseTranslations(
  idx: LexIndex,
  base: BaseLang,
  target: LangCode,
  lemma: string,
): string[] {
  const known = (w: string): boolean => hasWord(idx, base, w)
  const own = fromOwnGloss(recordsOf(idx, base, target, lemma), known)
  if (own) return own
  if (base === 'it') {
    const english =
      target === 'en'
        ? [lemma]
        : firstGlossTokens(recordsOf(idx, 'en', target, lemma), 1).slice(0, 1)
    const pivot = finish(
      english.flatMap((w) => firstSenseTranslations(recordsOf(idx, 'en', 'en', w), base)),
      known,
    )
    if (pivot.length) return pivot
  }
  return finish(idx.reverseTranslations.get(key(base, target, lemma)) ?? [], known)
}

export function baseDefinition(
  idx: LexIndex,
  base: BaseLang,
  word: string,
  pos?: string,
): string | null {
  const records = recordsOf(idx, base, base, word)
  const ordered = pos
    ? [...records.filter((r) => r.pos === pos), ...records.filter((r) => r.pos !== pos)]
    : records
  for (const r of ordered) {
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

/** Part of speech of the first record for a word, preferring the given edition. */
export function primaryPos(
  idx: LexIndex,
  edition: Edition,
  lang: LangCode,
  word: string,
): string | undefined {
  const other: Edition = edition === 'it' ? 'en' : 'it'
  return (recordsOf(idx, edition, lang, word)[0] ?? recordsOf(idx, other, lang, word)[0])?.pos
}
