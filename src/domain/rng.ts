/** Small seedable PRNG so grids and picks are reproducible in tests. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function weightedPick<T>(
  items: readonly T[],
  weights: readonly number[],
  rng: () => number,
): T | null {
  const total = weights.reduce((sum, w) => sum + w, 0)
  if (!items.length || total <= 0) return null
  let roll = rng() * total
  for (let i = 0; i < items.length; i++) {
    roll -= weights[i] ?? 0
    if (roll < 0) return items[i] ?? null
  }
  return items.at(-1) ?? null
}
