import { detectBaseLang } from '@/i18n'
import {
  BASE_LANGS,
  TARGET_LANGS,
  type BaseLang,
  type Direction,
  type LangCode,
  type PairKey,
} from '@/domain/types'
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isSaveState(value: unknown): value is SaveState {
  return isRecord(value) && value.v === 1 && isRecord(value.settings) && isRecord(value.progress)
}

const THEMES: readonly Settings['theme'][] = ['system', 'light', 'dark']

/** Keeps each saved setting only if it has a valid value; anything else falls back to the default. */
function sanitizeSettings(raw: Record<string, unknown>, fallback: Settings): Settings {
  const base = BASE_LANGS.find((b) => b === raw.base) ?? fallback.base
  const targets = Array.isArray(raw.targets)
    ? TARGET_LANGS.filter((t) => t !== base && (raw.targets as unknown[]).includes(t))
    : fallback.targets
  const active = TARGET_LANGS.find((t) => t === raw.activeTarget)
  return {
    base,
    targets,
    activeTarget: active && targets.includes(active) ? active : null,
    theme: THEMES.find((t) => t === raw.theme) ?? fallback.theme,
    sound: typeof raw.sound === 'boolean' ? raw.sound : fallback.sound,
  }
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
    return {
      v: 1,
      settings: sanitizeSettings(
        parsed.settings as unknown as Record<string, unknown>,
        fallback.settings,
      ),
      progress: parsed.progress,
    }
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
