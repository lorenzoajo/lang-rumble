import type { LangCode } from '../../src/domain/types'

export type Edition = 'it' | 'en'

export interface LexTranslation {
  lang: LangCode
  word: string
  sense: string | null
}

export interface LexRecord {
  edition: Edition
  lang: LangCode
  word: string
  pos: string
  /** most specific gloss of every non form-of sense, in order */
  glosses: string[]
  formOf: string[]
  translations: LexTranslation[]
}

interface RawSense {
  glosses?: string[]
  form_of?: { word?: string }[]
}

interface RawEntry {
  word?: string
  lang_code?: string
  pos?: string
  senses?: RawSense[]
  translations?: { lang_code?: string; word?: string; sense?: string }[]
}

const LANGS = new Set<string>(['it', 'en', 'es', 'de', 'fr'])
const DROPPED_POS = new Set([
  'name',
  'character',
  'symbol',
  'prefix',
  'suffix',
  'infix',
  'abbrev',
  'phrase',
  'proverb',
  'punct',
  'romanization',
])
const STUB_GLOSS = /^\S+\s*\(\s*(approfondimento|citazioni)|definizione mancante/i
const segmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' })

function isLang(code: string | undefined): code is LangCode {
  return code !== undefined && LANGS.has(code)
}

export function parseRecord(line: string, edition: Edition): LexRecord | null {
  const raw = JSON.parse(line) as RawEntry
  if (!raw.word || !isLang(raw.lang_code) || !raw.pos || DROPPED_POS.has(raw.pos)) return null
  const glosses: string[] = []
  const formOf: string[] = []
  for (const sense of raw.senses ?? []) {
    if (sense.form_of?.length) {
      for (const f of sense.form_of) if (f.word && !formOf.includes(f.word)) formOf.push(f.word)
      continue
    }
    const last = sense.glosses?.at(-1)
    if (last) glosses.push(last)
  }
  const translations: LexTranslation[] = []
  for (const t of raw.translations ?? []) {
    if (isLang(t.lang_code) && t.word) {
      translations.push({ lang: t.lang_code, word: t.word, sense: t.sense ?? null })
    }
  }
  return {
    edition,
    lang: raw.lang_code,
    word: raw.word.toLowerCase(),
    pos: raw.pos,
    glosses,
    formOf,
    translations,
  }
}

export function stripParentheticals(text: string): string {
  let out = text
  let prev = ''
  while (prev !== out) {
    prev = out
    out = out.replace(/\s*\([^()]*\)/g, '')
  }
  return out.replace(/\s+/g, ' ').trim()
}

export function cleanGloss(gloss: string, word: string): string | null {
  if (STUB_GLOSS.test(gloss)) return null
  const cleaned = stripParentheticals(gloss).replace(/[\s.;:,]+$/, '')
  if (!cleaned || cleaned.toLowerCase() === word.toLowerCase()) return null
  return cleaned
}

export function graphemeCount(word: string): number {
  return [...segmenter.segment(word)].length
}

export function isPlayableWord(word: string): boolean {
  if (!/^\p{L}+$/u.test(word)) return false
  const n = graphemeCount(word)
  return n >= 2 && n <= 12
}

/** Single-word candidates from a gloss: "dog (the species…)", "casa, abitazione", "to be" → playable tokens */
export function glossTokens(gloss: string): string[] {
  if (STUB_GLOSS.test(gloss)) return []
  return stripParentheticals(gloss)
    .split(/[,;]/)
    .map((part) =>
      part
        .trim()
        .toLowerCase()
        .replace(/^to\s+/, '')
        .replace(/[.:!?]+$/, ''),
    )
    .filter((token) => token !== 'etc' && isPlayableWord(token))
}

/** Like glossTokens but keeps unplayable parts, to tell "no gloss" apart from "gloss we cannot play". */
export function rawGlossParts(gloss: string): string[] {
  if (STUB_GLOSS.test(gloss)) return []
  return stripParentheticals(gloss)
    .split(/[,;]/)
    .map((part) => part.trim())
    .filter(Boolean)
}
