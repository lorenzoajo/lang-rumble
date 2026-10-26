import { join } from 'node:path'
import type { LangCode } from '../../src/domain/types'

export const CACHE_DIR = join(process.cwd(), '.data-cache')
export const OUT_DIR = join(process.cwd(), 'public/data')

export const LANGS: readonly LangCode[] = ['it', 'en', 'es', 'de', 'fr']
export const ISO3: Record<LangCode, string> = {
  it: 'ita',
  en: 'eng',
  es: 'spa',
  de: 'deu',
  fr: 'fra',
}

export interface Source {
  file: string
  url: string
}

export const sources = {
  kaikkiEn: {
    file: 'kaikki-en.jsonl.gz',
    url: 'https://kaikki.org/dictionary/raw-wiktextract-data.jsonl.gz',
  },
  kaikkiIt: {
    file: 'kaikki-it.jsonl.gz',
    url: 'https://kaikki.org/itwiktionary/raw-wiktextract-data.jsonl.gz',
  },
  freq: (l: LangCode): Source => ({
    file: `freq-${l}.txt`,
    url: `https://raw.githubusercontent.com/hermitdave/FrequencyWords/master/content/2018/${l}/${l}_50k.txt`,
  }),
  tatoeba: (l: LangCode): Source => ({
    file: `tatoeba-${ISO3[l]}.tsv.bz2`,
    url: `https://downloads.tatoeba.org/exports/per_language/${ISO3[l]}/${ISO3[l]}_sentences.tsv.bz2`,
  }),
  tatoebaLinks: {
    file: 'tatoeba-links.tar.bz2',
    url: 'https://downloads.tatoeba.org/exports/links.tar.bz2',
  },
}

export function allSources(): Source[] {
  return [
    sources.kaikkiEn,
    sources.kaikkiIt,
    ...LANGS.map(sources.freq),
    ...LANGS.map(sources.tatoeba),
    sources.tatoebaLinks,
  ]
}

export const cachePath = (s: Source): string => join(CACHE_DIR, s.file)
