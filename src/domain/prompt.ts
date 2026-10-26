import { graphemes } from './grid'
import type { DeckEntry, Mode, Phrase, Side } from './types'

export interface Prompt {
  entry: DeckEntry
  mode: Mode
  answerSide: Side
  shown: string
  hint: string | null
  phraseText: string | null
  accepted: string[]
}

const BLANK = '＿'

function blankGap(phrase: Phrase): string {
  for (const m of phrase.text.matchAll(/\p{L}+/gu)) {
    if (m[0].toLowerCase() === phrase.gap) {
      const start = m.index
      return (
        phrase.text.slice(0, start) +
        BLANK.repeat(graphemes(m[0]).length) +
        phrase.text.slice(start + m[0].length)
      )
    }
  }
  return phrase.text
}

function phraseOf(entry: DeckEntry, side: Side): Phrase | undefined {
  return entry.phrase?.[side]
}

export function poolFor(deck: DeckEntry[], mode: Mode): DeckEntry[] {
  if (mode === 'phrase-to-target') return deck.filter((e) => phraseOf(e, 'target'))
  if (mode === 'phrase-to-base') return deck.filter((e) => phraseOf(e, 'base'))
  return deck
}

export function buildPrompt(entry: DeckEntry, mode: Mode): Prompt {
  const base = { entry, mode, hint: null, phraseText: null }
  switch (mode) {
    case 'word-to-target':
      return { ...base, answerSide: 'target', shown: entry.base[0] ?? '', accepted: entry.target }
    case 'target-to-word':
      return { ...base, answerSide: 'base', shown: entry.target[0] ?? '', accepted: entry.base }
    case 'phrase-to-target':
    case 'phrase-to-base': {
      const side: Side = mode === 'phrase-to-target' ? 'target' : 'base'
      const phrase = phraseOf(entry, side)
      if (!phrase) throw new Error(`entry "${entry.id}" has no ${side} phrase`)
      return {
        entry,
        mode,
        answerSide: side,
        shown: (side === 'target' ? entry.base[0] : entry.target[0]) ?? '',
        hint: phrase.hint,
        phraseText: blankGap(phrase),
        accepted: [phrase.gap],
      }
    }
  }
}
