import { afterEach, describe, expect, it, vi } from 'vitest'
import { STORAGE_KEY, defaultState, loadState, saveState } from './storage'
import { log } from './log'

function memoryStorage(initial: Record<string, string> = {}): Storage {
  const data = new Map(Object.entries(initial))
  return {
    get length() {
      return data.size
    },
    clear: () => data.clear(),
    getItem: (k) => data.get(k) ?? null,
    key: (i) => [...data.keys()][i] ?? null,
    removeItem: (k) => void data.delete(k),
    setItem: (k, v) => void data.set(k, v),
  }
}

afterEach(() => vi.restoreAllMocks())

describe('loadState', () => {
  it('returns defaults derived from the device language without storage', () => {
    const s = loadState(null, ['it-IT'])
    expect(s.settings.base).toBe('it')
    expect(s.settings.targets).toEqual([])
    expect(s.settings.activeTarget).toBeNull()
  })
  it('falls back to defaults and warns on corrupt json', () => {
    const warn = vi.spyOn(log, 'warn').mockImplementation(() => {})
    const s = loadState(memoryStorage({ [STORAGE_KEY]: '{not json' }), ['en'])
    expect(s).toEqual(defaultState(['en']))
    expect(warn).toHaveBeenCalled()
  })
  it('falls back to defaults on an unknown version', () => {
    vi.spyOn(log, 'warn').mockImplementation(() => {})
    const s = loadState(memoryStorage({ [STORAGE_KEY]: JSON.stringify({ v: 99 }) }), ['en'])
    expect(s).toEqual(defaultState(['en']))
  })
  it('round-trips a saved state', () => {
    const storage = memoryStorage()
    const state = defaultState(['en'])
    state.settings.targets = ['es']
    saveState(storage, state)
    expect(loadState(storage, ['it'])).toEqual(state)
  })
})

describe('saveState', () => {
  it('logs instead of throwing when the quota is exceeded', () => {
    const error = vi.spyOn(log, 'error').mockImplementation(() => {})
    const storage = memoryStorage()
    storage.setItem = () => {
      throw new DOMException('full', 'QuotaExceededError')
    }
    expect(() => saveState(storage, defaultState(['en']))).not.toThrow()
    expect(error).toHaveBeenCalled()
  })
})
