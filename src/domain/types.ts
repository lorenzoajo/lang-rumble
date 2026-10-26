export type BaseLang = 'it' | 'en'
export type LangCode = 'it' | 'en' | 'es' | 'de' | 'fr'
export type PairKey = `${BaseLang}-${LangCode}`
export type Mode = 'word-to-target' | 'target-to-word' | 'phrase-to-target' | 'phrase-to-base'
/** production: the answer is built in the target language; recognition: in the base language */
export type Direction = 'production' | 'recognition'
export type Side = 'target' | 'base'

/** `text` is in the answer language and contains `gap` (lowercased match); `hint` is in the other language */
export interface Phrase {
  text: string
  gap: string
  hint: string
}

export interface DeckEntry {
  id: string
  rank: number
  target: string[]
  base: string[]
  phrase?: { target?: Phrase; base?: Phrase }
}

/** `tr` translates into the other language of the pair; `def` is always in the base language */
export interface LexEntry {
  tr: string[]
  def: string | null
}

export interface PairData {
  v: 1
  base: BaseLang
  target: LangCode
  deck: DeckEntry[]
  lexicon: Record<Side, Record<string, LexEntry>>
}

export interface PairStats {
  words: number
  phrasesTarget: number
  phrasesBase: number
}

export interface Manifest {
  v: 1
  pairs: Partial<Record<PairKey, PairStats>>
}

export const BASE_LANGS: readonly BaseLang[] = ['it', 'en']
export const TARGET_LANGS: readonly LangCode[] = ['en', 'it', 'es', 'de', 'fr']
export const MODES: readonly Mode[] = [
  'word-to-target',
  'target-to-word',
  'phrase-to-target',
  'phrase-to-base',
]

export function pairKey(base: BaseLang, target: LangCode): PairKey {
  return `${base}-${target}`
}

export function modeDirection(mode: Mode): Direction {
  return mode === 'word-to-target' || mode === 'phrase-to-target' ? 'production' : 'recognition'
}
