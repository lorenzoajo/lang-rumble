import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import fixture from '@/test/fixtures/it-es.json'
import dictEs from '@/test/fixtures/dict-es.json'
import dictIt from '@/test/fixtures/dict-it.json'
import * as loader from '@/data/loader'
import type { PairData } from '@/domain/types'
import { log } from '@/lib/log'
import { useAppStore } from './app'
import { useRoundStore } from './round'

const loaded: loader.LoadedPair = {
  data: fixture as PairData,
  dict: { target: new Set(dictEs), base: new Set(dictIt) },
}

beforeEach(() => {
  localStorage.clear()
  setActivePinia(createPinia())
  vi.spyOn(navigator, 'languages', 'get').mockReturnValue(['it-IT'])
  vi.spyOn(log, 'warn').mockImplementation(() => {})
  vi.stubGlobal('requestAnimationFrame', () => 1)
  vi.stubGlobal('cancelAnimationFrame', () => {})
  useAppStore().setActiveTarget('es')
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('round store lifecycle', () => {
  it('does not start a round whose screen was left while loading', async () => {
    let resolve: (p: loader.LoadedPair) => void = () => {}
    vi.spyOn(loader, 'loadPair').mockReturnValue(new Promise((r) => (resolve = r)))
    const rounds = useRoundStore()
    const ended = vi.fn()
    const starting = rounds.start('word-to-target', ended)
    rounds.stop()
    resolve(loaded)
    await starting
    expect(rounds.round).toBeNull()
  })

  it('saves without navigating when the round is left mid-way', async () => {
    vi.spyOn(loader, 'loadPair').mockResolvedValue(loaded)
    const rounds = useRoundStore()
    const ended = vi.fn()
    await rounds.start('word-to-target', ended)
    rounds.end({ navigate: false })
    expect(ended).not.toHaveBeenCalled()
    expect(useAppStore().state.progress['it-es']?.rounds).toBe(1)
    expect(rounds.lastSummary).not.toBeNull()
  })

  it('navigates to results when the round ends normally', async () => {
    vi.spyOn(loader, 'loadPair').mockResolvedValue(loaded)
    const rounds = useRoundStore()
    const ended = vi.fn()
    await rounds.start('word-to-target', ended)
    rounds.end()
    rounds.end()
    expect(ended).toHaveBeenCalledTimes(1)
    expect(useAppStore().state.progress['it-es']?.rounds).toBe(1)
  })
})
