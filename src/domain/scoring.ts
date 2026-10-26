const POINTS_PER_LETTER = 10
const TIME_BONUS = 50
const TIME_BONUS_WINDOW_MS = 30_000
const STREAK_STEP = 0.2
const STREAK_CAP = 5
const WRONG_REAL_PER_LETTER = 2

export function scoreCorrect(letters: number, elapsedMs: number, streakBefore: number): number {
  const timeBonus = Math.round(TIME_BONUS * Math.max(0, 1 - elapsedMs / TIME_BONUS_WINDOW_MS))
  const multiplier = 1 + Math.min(streakBefore, STREAK_CAP) * STREAK_STEP
  return Math.round((letters * POINTS_PER_LETTER + timeBonus) * multiplier)
}

export function scoreWrongReal(letters: number): number {
  return letters * WRONG_REAL_PER_LETTER
}
