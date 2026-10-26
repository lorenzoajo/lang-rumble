import { detectBaseLang } from '@/i18n'
import type { BaseLang, Direction, LangCode, PairKey } from '@/domain/types'
import { log } from './log'

export interface WordStat {
  box: number
  seen: number
  correct: number
  lastSeen: number
}

export interface PairProgress {
  words: Record<string, Partial<Record<Direction, WordStat>>>
  points: number
  bestStreak: number
  rounds: number
}

export interface Settings {
  base: BaseLang
  targets: LangCode[]
  activeTarget: LangCode | null
  theme: 'system' | 'light' | 'dark'
  sound: boolean
}

export interface SaveState {
  v: 1
  settings: Settings
  progress: Partial<Record<PairKey, PairProgress>>
}

export const STORAGE_KEY = 'lang-rumble:v1'

export function defaultState(languages: readonly string[]): SaveState {
  return {
    v: 1,
    settings: {
      base: detectBaseLang(languages),
      targets: [],
      activeTarget: null,
      theme: 'system',
      sound: true,
    },
    progress: {},
  }
}

export function emptyProgress(): PairProgress {
  return { words: {}, points: 0, bestStreak: 0, rounds: 0 }
}

function isSaveState(value: unknown): value is SaveState {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Partial<SaveState>
  return v.v === 1 && typeof v.settings === 'object' && typeof v.progress === 'object'
}

export function loadState(storage: Storage | null, languages: readonly string[]): SaveState {
  const fallback = defaultState(languages)
  if (!storage) return fallback
  let raw: string | null
  try {
    raw = storage.getItem(STORAGE_KEY)
  } catch (err) {
    log.error('storage unavailable', err)
    return fallback
  }
  if (raw === null) return fallback
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!isSaveState(parsed)) {
      log.warn('saved state has an unknown shape, resetting')
      return fallback
    }
    return { ...parsed, settings: { ...fallback.settings, ...parsed.settings } }
  } catch (err) {
    log.warn('saved state is corrupt, resetting', { err: String(err) })
    return fallback
  }
}

export function saveState(storage: Storage | null, state: SaveState): void {
  if (!storage) return
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch (err) {
    log.error('could not save state', err)
  }
}

export function browserStorage(): Storage | null {
  try {
    return globalThis.localStorage ?? null
  } catch (err) {
    log.warn('localStorage is not accessible', { err: String(err) })
    return null
  }
}
