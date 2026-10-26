import { beforeEach, describe, expect, it, vi } from 'vitest'
import fixture from '@/test/fixtures/it-es.json'
import { availableModes, clearCache, loadPair } from './loader'
import { log } from '@/lib/log'
import type { Manifest } from '@/domain/types'

const json = (body: unknown): Response => new Response(JSON.stringify(body), { status: 200 })

beforeEach(() => clearCache())

describe('loadPair', () => {
  it('fetches each file once and builds dictionaries', async () => {
    const fetcher = vi.fn(async (url: string | URL | Request) => {
      const u = String(url)
      if (u.endsWith('it-es.json')) return json(fixture)
      if (u.endsWith('dict-es.json')) return json(['perro'])
      return json(['cane'])
    }) as unknown as typeof fetch
    const a = await loadPair('it', 'es', fetcher)
    await loadPair('it', 'es', fetcher)
    expect(fetcher).toHaveBeenCalledTimes(3)
    expect(a.dict.target.has('perro')).toBe(true)
    expect(a.dict.base.has('cane')).toBe(true)
  })
  it('rejects and logs when a file is missing', async () => {
    const error = vi.spyOn(log, 'error').mockImplementation(() => {})
    const fetcher = vi.fn(
      async () => new Response('nope', { status: 404 }),
    ) as unknown as typeof fetch
    await expect(loadPair('it', 'fr', fetcher)).rejects.toThrow()
    expect(error).toHaveBeenCalled()
  })
})

describe('availableModes', () => {
  it('needs at least 20 phrases per side for phrase modes', () => {
    const manifest: Manifest = {
      v: 1,
      pairs: { 'it-es': { words: 2000, phrasesTarget: 5, phrasesBase: 40 } },
    }
    expect(availableModes(manifest, 'it-es')).toEqual([
      'word-to-target',
      'target-to-word',
      'phrase-to-base',
    ])
    expect(availableModes(manifest, 'it-de')).toEqual([])
  })
})
