import type { LoadedPair } from '@/data/loader'
import type { PairProgress, WordStat } from '@/lib/storage'
import { evaluate, type Evaluation, type Reveal } from './evaluate'
import { generateGrid, graphemes, letterFrequencies, type Path } from './grid'
import { buildPrompt, poolFor, type Prompt } from './prompt'
import { MASTERED_BOX, applyResult, pickNext } from './repetition'
import { scoreCorrect, scoreWrongReal } from './scoring'
import { modeDirection, type DeckEntry, type Direction, type Mode } from './types'

export const ROUND_MS = 120_000
const RECENT_PROMPTS = 5
const DECOYS = 2
const DECOY_MIN = 3
const DECOY_MAX = 8
const FREQ_SAMPLE = 3_000

export interface RoundDeps {
  pair: LoadedPair
  mode: Mode
  progress: PairProgress
  /** monotonic clock for round timing */
  now: () => number
  /** wall clock for persisted timestamps; defaults to Date.now */
  clock?: () => number
  rng: () => number
}

export interface RoundState {
  prompt: Prompt | null
  tiles: string[]
  score: number
  streak: number
  bestStreak: number
  correct: string[]
  wrongReal: Reveal[]
  newlyMastered: string[]
  paused: boolean
  over: boolean
}

export interface SubmitOutcome {
  evaluation: Evaluation
  points: number
}

const INVALID: SubmitOutcome = { evaluation: { kind: 'invalid' }, points: 0 }

export class Round {
  readonly state: RoundState = {
    prompt: null,
    tiles: [],
    score: 0,
    streak: 0,
    bestStreak: 0,
    correct: [],
    wrongReal: [],
    newlyMastered: [],
    paused: false,
    over: false,
  }
  answerPath: Path = []

  private readonly dir: Direction
  private readonly pool: DeckEntry[]
  private readonly stats: Record<string, WordStat | undefined> = {}
  private readonly touched = new Set<string>()
  private readonly awarded = new Set<string>()
  private readonly recent: string[] = []
  private readonly decoyPool: string[]
  private readonly letterFreq: Record<string, number>
  private startedAt = 0
  private pausedTotal = 0
  private pausedAt: number | null = null
  private promptStartedAt = 0
  private resolved = true
  private applied = false

  constructor(private readonly deps: RoundDeps) {
    this.dir = modeDirection(deps.mode)
    this.pool = poolFor(deps.pair.data.deck, deps.mode)
    for (const [id, byDir] of Object.entries(deps.progress.words)) this.stats[id] = byDir[this.dir]
    const side = this.dir === 'production' ? 'target' : 'base'
    const words = [...deps.pair.dict[side]]
    this.decoyPool = words.filter((w) => {
      const n = graphemes(w).length
      return n >= DECOY_MIN && n <= DECOY_MAX
    })
    this.letterFreq = letterFrequencies(words.slice(0, FREQ_SAMPLE))
  }

  private wallNow(): number {
    return (this.deps.clock ?? Date.now)()
  }

  start(): void {
    this.startedAt = this.deps.now()
    this.nextPrompt()
  }

  /** Unpaused milliseconds since start. */
  private elapsed(): number {
    const now = this.deps.now()
    const pausedNow = this.pausedAt === null ? 0 : now - this.pausedAt
    return now - this.startedAt - this.pausedTotal - pausedNow
  }

  remainingMs(): number {
    const left = Math.max(0, ROUND_MS - this.elapsed())
    if (left === 0) this.finish()
    return left
  }

  pause(): void {
    if (this.pausedAt === null && !this.state.over) {
      this.pausedAt = this.deps.now()
      this.state.paused = true
    }
  }

  resume(): void {
    if (this.pausedAt !== null) {
      this.pausedTotal += this.deps.now() - this.pausedAt
      this.pausedAt = null
    }
    this.state.paused = false
  }

  submit(word: string): SubmitOutcome {
    const prompt = this.state.prompt
    if (!prompt || this.state.over || this.state.paused || this.remainingMs() === 0) return INVALID
    const evaluation = evaluate(word, prompt, this.deps.pair)
    let points = 0
    if (evaluation.kind === 'correct') {
      points = scoreCorrect(
        graphemes(evaluation.reveal.word).length,
        this.elapsed() - this.promptStartedAt,
        this.state.streak,
      )
      this.state.streak += 1
      this.state.bestStreak = Math.max(this.state.bestStreak, this.state.streak)
      this.state.correct.push(evaluation.reveal.word)
      this.record(prompt.entry.id, 'correct')
      this.pause()
    } else if (evaluation.kind === 'wrong-real') {
      if (!this.awarded.has(evaluation.reveal.word)) {
        this.awarded.add(evaluation.reveal.word)
        this.state.wrongReal.push(evaluation.reveal)
        points = scoreWrongReal(graphemes(evaluation.reveal.word).length)
      }
      this.pause()
    }
    this.state.score += points
    return { evaluation, points }
  }

  next(): void {
    this.resume()
    this.nextPrompt()
  }

  skip(): void {
    const prompt = this.state.prompt
    if (!prompt || this.state.over) return
    this.state.streak = 0
    this.record(prompt.entry.id, 'skip')
    this.nextPrompt()
  }

  applyTo(progress: PairProgress): void {
    if (this.applied) return
    this.applied = true
    this.finish()
    for (const id of this.touched) {
      const stat = this.stats[id]
      if (stat) progress.words[id] = { ...progress.words[id], [this.dir]: stat }
    }
    progress.points += this.state.score
    progress.bestStreak = Math.max(progress.bestStreak, this.state.bestStreak)
    progress.rounds += 1
  }

  private finish(): void {
    if (!this.state.over) {
      this.state.over = true
      this.state.paused = false
    }
    if (!this.resolved && this.state.prompt) this.record(this.state.prompt.entry.id, 'seen')
  }

  private record(id: string, result: 'correct' | 'skip' | 'seen'): void {
    const before = this.stats[id]
    const after = applyResult(before, result, this.wallNow())
    this.stats[id] = after
    this.touched.add(id)
    this.resolved = true
    if (
      (before?.box ?? 0) < MASTERED_BOX &&
      after.box >= MASTERED_BOX &&
      !this.state.newlyMastered.includes(id)
    ) {
      this.state.newlyMastered.push(id)
    }
  }

  private nextPrompt(): void {
    if (this.state.over) return
    const stats: PairProgress['words'] = {}
    for (const [id, stat] of Object.entries(this.stats)) if (stat) stats[id] = { [this.dir]: stat }
    const now = this.wallNow()
    const exclude = new Set(this.recent.slice(-Math.min(RECENT_PROMPTS, this.pool.length - 1)))
    const entry = pickNext(this.pool, stats, this.dir, now, this.deps.rng, exclude)
    if (!entry) {
      this.state.prompt = null
      this.finish()
      return
    }
    const prompt = buildPrompt(entry, this.deps.mode)
    const decoys = this.pickDecoys(prompt.accepted)
    const grid = generateGrid(
      prompt.accepted[0] ?? entry.id,
      decoys,
      this.letterFreq,
      this.deps.rng,
    )
    this.recent.push(entry.id)
    this.state.prompt = prompt
    this.state.tiles = grid.tiles
    this.answerPath = grid.answerPath
    this.promptStartedAt = this.elapsed()
    this.resolved = false
  }

  private pickDecoys(accepted: string[]): string[] {
    const out: string[] = []
    for (let tries = 0; tries < 20 && out.length < DECOYS && this.decoyPool.length; tries++) {
      const w = this.decoyPool[Math.floor(this.deps.rng() * this.decoyPool.length)]
      if (w && !accepted.includes(w) && !out.includes(w)) out.push(w)
    }
    return out
  }
}
