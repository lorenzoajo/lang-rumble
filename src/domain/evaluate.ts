import type { LoadedPair } from '@/data/loader'
import type { Prompt } from './prompt'
import type { Side } from './types'

export interface Reveal {
  word: string
  side: Side
  correct: boolean
  translations: string[]
  definition: string | null
  lemma: string | null
  /** other answers that would also have been correct */
  alternatives: string[]
  /** a wrong word that is the base form of the inflected phrase gap */
  baseForm: boolean
  /** the solution shown after a skip */
  skipped: boolean
}

export type Evaluation =
  { kind: 'correct'; reveal: Reveal } | { kind: 'wrong-real'; reveal: Reveal } | { kind: 'invalid' }

function describe(
  word: string,
  side: Side,
  pair: LoadedPair,
  fallbackTr: string[],
): Pick<Reveal, 'translations' | 'definition'> {
  const lex = pair.data.lexicon
  const entry = lex[side][word]
  const translations = entry?.tr ?? fallbackTr
  let definition = entry?.def ?? null
  // Target-language words carry the base definition of their translation.
  if (!definition && side === 'target') {
    const first = translations[0]
    definition = (first && lex.base[first]?.def) ?? null
  }
  return { translations, definition }
}

export function evaluate(raw: string, prompt: Prompt, pair: LoadedPair): Evaluation {
  const word = raw.toLowerCase()
  const side = prompt.answerSide
  const { entry } = prompt
  if (prompt.accepted.includes(word)) {
    const fallback = side === 'target' ? entry.base : entry.target
    const lemma = prompt.mode === 'phrase-to-target' && word !== entry.id ? entry.id : null
    return {
      kind: 'correct',
      reveal: {
        word,
        side,
        correct: true,
        lemma,
        alternatives: prompt.accepted.filter((w) => w !== word),
        baseForm: false,
        skipped: false,
        ...describe(word, side, pair, fallback),
      },
    }
  }
  if (pair.dict[side].has(word) || pair.data.lexicon[side][word]) {
    return {
      kind: 'wrong-real',
      reveal: {
        word,
        side,
        correct: false,
        lemma: null,
        alternatives: [],
        baseForm: prompt.mode === 'phrase-to-target' && word === entry.id,
        skipped: false,
        ...describe(word, side, pair, []),
      },
    }
  }
  return { kind: 'invalid' }
}
