import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  BASE_LANGS,
  TARGET_LANGS,
  pairKey,
  type BaseLang,
  type DeckEntry,
  type LangCode,
  type LexEntry,
  type Manifest,
  type PairData,
  type Phrase,
} from '../../src/domain/types'
import { downloadAll } from './download'
import { rankLemmas, type RankedLemma } from './lemmas'
import { findGap, pickPhrase, wordCount } from './phrases'
import {
  baseDefinition,
  baseTranslations,
  buildIndex,
  primaryPos,
  targetTranslations,
  type LexIndex,
} from './resolve'
import { LANGS, OUT_DIR, cachePath, sources } from './sources'
import { lines } from './stream'
import { isPlayableWord, parseRecord, type Edition, type LexRecord } from './wiktionary'

const DECK_SIZE = 2000
const FREQ_TOP = 50_000
const DICT_TOP = 20_000
const LEXICON_TARGET_TOP = 5_000
const LEXICON_BASE_TOP = 3_000
const MAX_TARGET_ANSWERS = 3
const PHRASE_MAX_WORDS = 10
const PHRASE_SCAN_LIMIT = 3_000
const TOP_LEMMA_RANK = 300
// Cheap prefilter on the raw line before JSON.parse; key order differs between editions.
const HEAD = /"word": "((?:[^"\\]|\\.)*)", (?:"lang": "[^"]*", )?"lang_code": "([a-z]+)"/

type Pair = { base: BaseLang; target: LangCode }

interface PairBuild extends Pair {
  deck: DeckEntry[]
  forms: Map<string, string[]>
  lexicon: PairData['lexicon']
}

function loadFrequencies(): Map<LangCode, [string, number][]> {
  const out = new Map<LangCode, [string, number][]>()
  for (const l of LANGS) {
    const rows = readFileSync(cachePath(sources.freq(l)), 'utf8')
      .split('\n')
      .slice(0, FREQ_TOP)
      .map((row): [string, number] => {
        const [word = '', count = '0'] = row.trim().split(' ')
        return [word.toLowerCase(), Number(count)]
      })
      .filter(([w]) => w.length > 0)
    out.set(l, rows)
  }
  return out
}

async function loadRecords(freqSets: Map<LangCode, Set<string>>): Promise<LexRecord[]> {
  const records: LexRecord[] = []
  const editions: [Edition, string][] = [
    ['it', cachePath(sources.kaikkiIt)],
    ['en', cachePath(sources.kaikkiEn)],
  ]
  for (const [edition, file] of editions) {
    let seen = 0
    for await (const line of lines(file)) {
      if (++seen % 1_000_000 === 0)
        console.log(`  ${edition}: ${seen / 1_000_000}M lines, ${records.length} kept`)
      const head = HEAD.exec(line)
      if (!head?.[1] || !head[2]) continue
      const words = freqSets.get(head[2] as LangCode)
      if (!words?.has(head[1].toLowerCase())) continue
      const record = parseRecord(line, edition)
      if (record && words.has(record.word)) records.push(record)
    }
  }
  return records
}

function formOfMaps(records: LexRecord[]): Map<LangCode, Map<string, string[]>> {
  const out = new Map<LangCode, Map<string, string[]>>(LANGS.map((l) => [l, new Map()]))
  for (const r of records) {
    if (!r.formOf.length) continue
    const map = out.get(r.lang)
    if (!map) continue
    const lemmas = map.get(r.word) ?? []
    for (const lemma of r.formOf) {
      const l = lemma.toLowerCase()
      if (!lemmas.includes(l)) lemmas.push(l)
    }
    map.set(r.word, lemmas)
  }
  return out
}

/** Moves the first translation that has a base-language definition to the front. */
function withDefinition(
  idx: LexIndex,
  base: BaseLang,
  tr: string[],
  pos?: string,
): string[] | null {
  const i = tr.findIndex((w) => baseDefinition(idx, base, w, pos) !== null)
  if (i < 0) return null
  const first = tr[i] as string
  return [first, ...tr.filter((w) => w !== first)]
}

function buildPair(idx: LexIndex, pair: Pair, ranked: Map<LangCode, RankedLemma[]>): PairBuild {
  const { base, target } = pair
  const deck: DeckEntry[] = []
  const forms = new Map<string, string[]>()
  const posOf = new Map<string, string | undefined>()
  for (const lemma of ranked.get(target) ?? []) {
    if (deck.length >= DECK_SIZE) break
    if (!isPlayableWord(lemma.lemma)) continue
    const pos = primaryPos(idx, base, target, lemma.lemma)
    const tr = withDefinition(idx, base, baseTranslations(idx, base, target, lemma.lemma), pos)
    // Identical spellings (es "no" → it "no") make the round trivial.
    if (!tr || tr.includes(lemma.lemma)) continue
    deck.push({ id: lemma.lemma, rank: deck.length + 1, target: [lemma.lemma], base: tr })
    posOf.set(lemma.lemma, pos)
    forms.set(lemma.lemma, lemma.forms.filter(isPlayableWord))
  }

  const byBase = new Map<string, string[]>()
  for (const e of deck) {
    const key = e.base[0] as string
    byBase.set(key, [...(byBase.get(key) ?? []), e.id])
  }
  for (const e of deck) {
    const shared = e.base[0] as string
    // A synonym must round-trip: translating the shared base word back must reach it.
    const back = new Set(targetTranslations(idx, base, target, shared))
    const synonyms = (byBase.get(shared) ?? []).filter((s) => s !== e.id && back.has(s))
    e.target = [e.id, ...synonyms].slice(0, MAX_TARGET_ANSWERS)
  }

  const lexTarget: Record<string, LexEntry> = {}
  for (const e of deck) {
    lexTarget[e.id] = {
      tr: e.base,
      def: baseDefinition(idx, base, e.base[0] as string, posOf.get(e.id)),
    }
  }
  for (const lemma of (ranked.get(target) ?? []).slice(0, LEXICON_TARGET_TOP)) {
    if (lexTarget[lemma.lemma] || !isPlayableWord(lemma.lemma)) continue
    const tr = baseTranslations(idx, base, target, lemma.lemma)
    if (!tr.length) continue
    const ordered = withDefinition(idx, base, tr) ?? tr
    lexTarget[lemma.lemma] = { tr: ordered, def: baseDefinition(idx, base, ordered[0] as string) }
  }

  const lexBase: Record<string, LexEntry> = {}
  const baseWords = new Set<string>(deck.flatMap((e) => e.base))
  for (const lemma of (ranked.get(base) ?? []).slice(0, LEXICON_BASE_TOP))
    baseWords.add(lemma.lemma)
  for (const w of baseWords) {
    if (!isPlayableWord(w)) continue
    const tr = targetTranslations(idx, base, target, w)
    const def = baseDefinition(idx, base, w)
    if (tr.length || def) lexBase[w] = { tr, def }
  }

  return { ...pair, deck, forms, lexicon: { target: lexTarget, base: lexBase } }
}

interface Corpus {
  sentences: Map<LangCode, Map<number, string>>
  tokens: Map<LangCode, Map<string, number[]>>
  links: Map<number, number[]>
}

async function loadCorpus(needed: Map<LangCode, Set<string>>): Promise<Corpus> {
  const sentences = new Map<LangCode, Map<number, string>>()
  const tokens = new Map<LangCode, Map<string, number[]>>()
  for (const l of LANGS) {
    const byId = new Map<number, string>()
    const byToken = new Map<string, number[]>()
    const want = needed.get(l) ?? new Set<string>()
    for await (const line of lines(cachePath(sources.tatoeba(l)))) {
      const [id, , text] = line.split('\t')
      if (!id || !text || wordCount(text) > PHRASE_MAX_WORDS) continue
      const n = Number(id)
      byId.set(n, text)
      for (const m of text.matchAll(/\p{L}+/gu)) {
        const token = m[0].toLowerCase()
        if (!want.has(token)) continue
        const list = byToken.get(token)
        if (!list) byToken.set(token, [n])
        else if (list.at(-1) !== n) list.push(n)
      }
    }
    sentences.set(l, byId)
    tokens.set(l, byToken)
    console.log(`  tatoeba ${l}: ${byId.size} short sentences`)
  }
  const links = new Map<number, number[]>()
  const known = (id: number): boolean => LANGS.some((l) => sentences.get(l)?.has(id))
  for await (const line of lines(cachePath(sources.tatoebaLinks))) {
    const [a, b] = line.split('\t').map(Number)
    if (a === undefined || b === undefined || !known(a) || !known(b)) continue
    const list = links.get(a)
    if (!list) links.set(a, [b])
    else list.push(b)
  }
  console.log(`  tatoeba links: ${links.size}`)
  return { sentences, tokens, links }
}

function candidates(
  corpus: Corpus,
  fromLang: LangCode,
  fromTokens: string[],
  toLang: LangCode,
  used: Set<number>,
): { id: number; text: string; hint: string }[] {
  const ids = new Set<number>()
  for (const t of fromTokens)
    for (const id of corpus.tokens.get(fromLang)?.get(t) ?? []) ids.add(id)
  const out: { id: number; text: string; hint: string }[] = []
  for (const id of ids) {
    if (out.length >= PHRASE_SCAN_LIMIT) break
    if (used.has(id)) continue
    const text = corpus.sentences.get(fromLang)?.get(id)
    if (!text) continue
    for (const linked of corpus.links.get(id) ?? []) {
      const hint = corpus.sentences.get(toLang)?.get(linked)
      if (hint) out.push({ id, text, hint })
    }
  }
  return out
}

function attachPhrases(build: PairBuild, corpus: Corpus): void {
  const { base, target } = build
  const usedTarget = new Set<number>()
  const usedBase = new Set<number>()
  for (const e of build.deck) {
    const forms = [...new Set([e.id, ...(build.forms.get(e.id) ?? [])])]
    const tc = candidates(corpus, target, forms, base, usedTarget)
    // Prefer sentences whose translation contains one of the expected base words.
    const tcGood = tc.filter((c) => findGap(c.hint, e.base) !== null)
    const pt = pickPhrase(tcGood.length ? tcGood : tc, forms, PHRASE_MAX_WORDS)

    const bc = candidates(corpus, base, e.base, target, usedBase).filter(
      (c) => findGap(c.hint, forms) !== null,
    )
    const pb = pickPhrase(bc, e.base, PHRASE_MAX_WORDS)

    const phrase: { target?: Phrase; base?: Phrase } = {}
    if (pt) {
      phrase.target = pt
      const id = tc.find((c) => c.text === pt.text)?.id
      if (id !== undefined) usedTarget.add(id)
      if (!build.lexicon.target[pt.gap]) {
        build.lexicon.target[pt.gap] = build.lexicon.target[e.id] ?? { tr: e.base, def: null }
      }
    }
    if (pb) {
      phrase.base = pb
      const id = bc.find((c) => c.text === pb.text)?.id
      if (id !== undefined) usedBase.add(id)
    }
    if (phrase.target || phrase.base) e.phrase = phrase
  }
}

function buildDicts(
  freq: Map<LangCode, [string, number][]>,
  idx: LexIndex,
  formOf: Map<LangCode, Map<string, string[]>>,
): Map<LangCode, Set<string>> {
  const out = new Map<LangCode, Set<string>>()
  for (const l of LANGS) {
    const set = new Set<string>()
    for (const [w] of (freq.get(l) ?? []).slice(0, DICT_TOP)) {
      if (isPlayableWord(w) && (idx.words.get(l)?.has(w) || formOf.get(l)?.has(w))) set.add(w)
    }
    out.set(l, set)
  }
  return out
}

function writeJson(name: string, data: unknown): number {
  const json = JSON.stringify(data)
  writeFileSync(join(OUT_DIR, name), json)
  return json.length
}

async function main(): Promise<void> {
  await downloadAll()
  const freq = loadFrequencies()
  const freqSets = new Map<LangCode, Set<string>>(
    [...freq.entries()].map(([l, rows]) => [l, new Set(rows.map(([w]) => w))]),
  )

  console.log('reading wiktionary dumps…')
  const records = await loadRecords(freqSets)
  console.log(`kept ${records.length} records`)
  const idx = buildIndex(records)
  const formOf = formOfMaps(records)
  records.length = 0

  const ranked = new Map<LangCode, RankedLemma[]>()
  for (const l of LANGS) {
    const known = idx.words.get(l) ?? new Set<string>()
    const top = new Set(
      (freq.get(l) ?? [])
        .slice(0, TOP_LEMMA_RANK)
        .map(([w]) => w)
        .filter((w) => known.has(w)),
    )
    ranked.set(l, rankLemmas(freq.get(l) ?? [], formOf.get(l) ?? new Map(), known, top))
  }

  const pairs: Pair[] = BASE_LANGS.flatMap((base) =>
    TARGET_LANGS.filter((t) => t !== base).map((target) => ({ base, target })),
  )
  const builds = pairs.map((p) => {
    const b = buildPair(idx, p, ranked)
    console.log(`  ${pairKey(p.base, p.target)}: ${b.deck.length} words`)
    return b
  })
  const dicts = buildDicts(freq, idx, formOf)

  const needed = new Map<LangCode, Set<string>>(LANGS.map((l) => [l, new Set<string>()]))
  for (const b of builds) {
    for (const e of b.deck) {
      for (const f of [e.id, ...(b.forms.get(e.id) ?? [])]) needed.get(b.target)?.add(f)
      for (const w of e.base) needed.get(b.base)?.add(w)
    }
  }
  console.log('reading tatoeba…')
  const corpus = await loadCorpus(needed)

  mkdirSync(OUT_DIR, { recursive: true })
  const manifest: Manifest = { v: 1, pairs: {} }
  for (const b of builds) {
    attachPhrases(b, corpus)
    for (const e of b.deck) for (const w of e.target) dicts.get(b.target)?.add(w)
    for (const w of Object.keys(b.lexicon.target)) dicts.get(b.target)?.add(w)
    for (const w of Object.keys(b.lexicon.base)) dicts.get(b.base)?.add(w)
    const data: PairData = {
      v: 1,
      base: b.base,
      target: b.target,
      deck: b.deck,
      lexicon: b.lexicon,
    }
    const key = pairKey(b.base, b.target)
    const size = writeJson(`${key}.json`, data)
    const stats = {
      words: b.deck.length,
      phrasesTarget: b.deck.filter((e) => e.phrase?.target).length,
      phrasesBase: b.deck.filter((e) => e.phrase?.base).length,
    }
    manifest.pairs[key] = stats
    console.log(`  ${key}: ${JSON.stringify(stats)} ${(size / 1024).toFixed(0)} KB`)
  }
  for (const [l, set] of dicts) writeJson(`dict-${l}.json`, [...set].sort())
  writeJson('manifest.json', manifest)

  console.log('\ncoverage')
  console.table(manifest.pairs)
}

main().catch((err: unknown) => {
  console.error(err)
  process.exit(1)
})
