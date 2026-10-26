export interface RankedLemma {
  lemma: string
  count: number
  forms: string[]
}

/**
 * Collapses a frequency list onto lemmas. A word that is itself a known lemma stays as is
 * (es "casa" is also a form of "casar"); otherwise its first known form-of lemma takes the count.
 * Exception: a form of one of `topLemmas` always maps there (fr "est" → "être", not the noun "east").
 */
export function rankLemmas(
  freq: [string, number][],
  formOf: Map<string, string[]>,
  known: Set<string>,
  topLemmas: ReadonlySet<string> = new Set(),
): RankedLemma[] {
  const byLemma = new Map<string, { count: number; forms: Set<string> }>()
  for (const [word, count] of freq) {
    const lemmas = formOf.get(word) ?? []
    const top = lemmas.find((l) => l !== word && topLemmas.has(l) && known.has(l))
    const lemma = top ?? (known.has(word) ? word : lemmas.find((l) => known.has(l)))
    if (!lemma) continue
    const acc = byLemma.get(lemma) ?? { count: 0, forms: new Set<string>() }
    acc.count += count
    acc.forms.add(word)
    byLemma.set(lemma, acc)
  }
  return [...byLemma.entries()]
    .map(([lemma, { count, forms }]) => ({ lemma, count, forms: [...forms].sort() }))
    .sort((a, b) => b.count - a.count)
}
