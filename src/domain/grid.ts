import { weightedPick } from './rng'

export const GRID_SIZE = 4
const CELLS = GRID_SIZE * GRID_SIZE
const MAX_STEPS = 20_000

export type Path = number[]

const segmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' })

export function graphemes(word: string): string[] {
  return [...segmenter.segment(word.toLowerCase())].map((s) => s.segment)
}

export function isAdjacent(a: number, b: number): boolean {
  if (a === b) return false
  const dr = Math.abs(Math.floor(a / GRID_SIZE) - Math.floor(b / GRID_SIZE))
  const dc = Math.abs((a % GRID_SIZE) - (b % GRID_SIZE))
  return dr <= 1 && dc <= 1
}

export function isValidPath(path: Path): boolean {
  if (new Set(path).size !== path.length) return false
  return path.every(
    (cell, i) => cell >= 0 && cell < CELLS && (i === 0 || isAdjacent(path[i - 1] as number, cell)),
  )
}

export function wordFromPath(tiles: string[], path: Path): string {
  return path.map((i) => tiles[i] ?? '').join('')
}

const NEIGHBOURS: number[][] = Array.from({ length: CELLS }, (_, a) =>
  Array.from({ length: CELLS }, (_, b) => b).filter((b) => isAdjacent(a, b)),
)

function shuffled<T>(items: readonly T[], rng: () => number): T[] {
  const out = [...items]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[out[i], out[j]] = [out[j] as T, out[i] as T]
  }
  return out
}

/**
 * Randomised DFS that lays `letters` on the board. A cell is usable when empty, or (when
 * `reuse` is on) when it already holds the same letter, so decoys can share tiles with the answer.
 */
function place(
  board: (string | null)[],
  letters: string[],
  rng: () => number,
  reuse: boolean,
): Path | null {
  let steps = 0
  const path: Path = []
  const fits = (cell: number, letter: string): boolean =>
    !path.includes(cell) && (board[cell] === null || (reuse && board[cell] === letter))
  const walk = (cell: number, i: number): boolean => {
    if (++steps > MAX_STEPS) return false
    path.push(cell)
    if (i === letters.length - 1) return true
    const next = letters[i + 1] as string
    for (const n of shuffled(NEIGHBOURS[cell] ?? [], rng)) {
      if (fits(n, next) && walk(n, i + 1)) return true
    }
    path.pop()
    return false
  }
  const first = letters[0]
  if (first === undefined) return null
  for (const start of shuffled([...Array(CELLS).keys()], rng)) {
    if (fits(start, first) && walk(start, 0)) {
      path.forEach((cell, i) => (board[cell] = letters[i] as string))
      return path
    }
  }
  return null
}

export function letterFrequencies(words: string[]): Record<string, number> {
  const freq: Record<string, number> = {}
  for (const w of words) for (const g of graphemes(w)) freq[g] = (freq[g] ?? 0) + 1
  return freq
}

export function generateGrid(
  answer: string,
  decoys: string[],
  letterFreq: Record<string, number>,
  rng: () => number,
): { tiles: string[]; answerPath: Path } {
  const letters = graphemes(answer)
  if (letters.length === 0 || letters.length > CELLS) {
    throw new Error(`answer "${answer}" does not fit a ${GRID_SIZE}x${GRID_SIZE} board`)
  }
  let board: (string | null)[] = []
  let answerPath: Path | null = null
  for (let attempt = 0; attempt < 10 && !answerPath; attempt++) {
    board = Array<string | null>(CELLS).fill(null)
    answerPath = place(board, letters, rng, false)
  }
  if (!answerPath) throw new Error(`could not place "${answer}"`)

  for (const decoy of decoys.slice(0, 2)) {
    const trial = [...board]
    if (place(trial, graphemes(decoy), rng, true)) board = trial
  }

  const pool = Object.keys(letterFreq)
  const weights = pool.map((l) => letterFreq[l] ?? 0)
  const tiles = board.map((t) => t ?? weightedPick(pool, weights, rng) ?? 'a')
  return { tiles, answerPath }
}
