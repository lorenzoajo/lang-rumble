import type { Phrase } from '../../src/domain/types'

const WORD = /\p{L}+/gu

export function findGap(text: string, forms: string[]): string | null {
  const wanted = new Set(forms)
  for (const match of text.matchAll(WORD)) {
    const token = match[0].toLowerCase()
    if (wanted.has(token)) return token
  }
  return null
}

export function wordCount(text: string): number {
  return [...text.matchAll(WORD)].length
}

export function pickPhrase(
  candidates: { text: string; hint: string }[],
  forms: string[],
  maxWords: number,
): Phrase | null {
  let best: Phrase | null = null
  for (const c of candidates) {
    if (wordCount(c.text) > maxWords) continue
    if (best && c.text.length >= best.text.length) continue
    const gap = findGap(c.text, forms)
    if (gap) best = { text: c.text, gap, hint: c.hint }
  }
  return best
}
