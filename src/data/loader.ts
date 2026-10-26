import { log } from '@/lib/log'
import {
  MODES,
  pairKey,
  type BaseLang,
  type LangCode,
  type Manifest,
  type Mode,
  type PairData,
  type PairKey,
  type Side,
} from '@/domain/types'

export interface LoadedPair {
  data: PairData
  dict: Record<Side, ReadonlySet<string>>
}

const MIN_PHRASES = 20

const pairs = new Map<PairKey, Promise<LoadedPair>>()
const dicts = new Map<LangCode, Promise<ReadonlySet<string>>>()
let manifest: Promise<Manifest> | null = null

export function clearCache(): void {
  pairs.clear()
  dicts.clear()
  manifest = null
}

async function getJson<T>(file: string, fetcher: typeof fetch): Promise<T> {
  const url = `${import.meta.env.BASE_URL}data/${file}`
  const res = await fetcher(url)
  if (!res.ok) throw new Error(`GET ${url} → ${res.status}`)
  return (await res.json()) as T
}

function memo<K, V>(
  cache: Map<K, Promise<V>>,
  key: K,
  load: () => Promise<V>,
  what: string,
): Promise<V> {
  const hit = cache.get(key)
  if (hit) return hit
  const p = load().catch((err: unknown) => {
    cache.delete(key)
    log.error(`could not load ${what}`, err)
    throw err instanceof Error ? err : new Error(String(err))
  })
  cache.set(key, p)
  return p
}

function loadDict(lang: LangCode, fetcher: typeof fetch): Promise<ReadonlySet<string>> {
  return memo(
    dicts,
    lang,
    async () => new Set(await getJson<string[]>(`dict-${lang}.json`, fetcher)),
    `dict-${lang}`,
  )
}

export function loadManifest(fetcher: typeof fetch = fetch): Promise<Manifest> {
  if (!manifest) {
    manifest = getJson<Manifest>('manifest.json', fetcher).catch((err: unknown) => {
      manifest = null
      log.error('could not load manifest', err)
      throw err instanceof Error ? err : new Error(String(err))
    })
  }
  return manifest
}

export function loadPair(
  base: BaseLang,
  target: LangCode,
  fetcher: typeof fetch = fetch,
): Promise<LoadedPair> {
  const key = pairKey(base, target)
  return memo(
    pairs,
    key,
    async () => {
      const [data, targetDict, baseDict] = await Promise.all([
        getJson<PairData>(`${key}.json`, fetcher),
        loadDict(target, fetcher),
        loadDict(base, fetcher),
      ])
      return { data, dict: { target: targetDict, base: baseDict } }
    },
    key,
  )
}

export function availableModes(m: Manifest, key: PairKey): Mode[] {
  const stats = m.pairs[key]
  if (!stats || stats.words === 0) return []
  return MODES.filter((mode) => {
    if (mode === 'phrase-to-target') return stats.phrasesTarget >= MIN_PHRASES
    if (mode === 'phrase-to-base') return stats.phrasesBase >= MIN_PHRASES
    return true
  })
}
