# Lang Rumble Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a mobile-first Vue 3 PWA Ruzzle-style vocabulary game (it/en base → en/it/es/de/fr target) with data built offline from open sources, deployed to GitHub Pages.

**Architecture:** Pure TypeScript domain modules (`src/domain/*`: grid, scoring, repetition, round engine, answer evaluation) with no Vue dependency, wrapped by Pinia stores and Vue components/views. Word data is produced by an offline Node/TS pipeline (`scripts/data/*`) into committed static JSON under `public/data/`, lazily fetched per language pair and precached by the service worker.

**Tech Stack:** Vue 3.5 (`<script setup>`), TypeScript (strict), Vite 8, vue-router (hash history), Pinia, vite-plugin-pwa, Vitest + @vue/test-utils + jsdom, tsx (pipeline), pnpm, devenv.

**Spec:** `docs/superpowers/specs/2026-10-26-lang-rumble-design.md` (plus `spec.md`).

## Global Constraints

- Base languages: `it`, `en`. Targets: `en`, `it`, `es`, `de`, `fr`. Never base === target.
- UI language === base language. Default from `navigator.languages`: first entry starting with `it` → `it`, else `en`.
- Definitions are always in the base language.
- Round length 120 000 ms. Clock pauses while any popup/pause overlay is open.
- Grid 4×4, 8-neighbour adjacency, no tile reuse within a trace.
- Mastered = Leitner box ≥ 3 (boxes 0–5), tracked per word per direction (`production` = answer in target, `recognition` = answer in base).
- All persistence in `localStorage`, single versioned key `lang-rumble:v1`.
- Mobile/touch first: portrait layout, pointer events, no hover-only affordances.
- Vite `base: '/lang-rumble/'`. Deploy on push to `master` via GitHub Actions to Pages.
- No `any`. Strict TS. Errors are logged via `src/lib/log.ts` (no silent catches).
- Data attribution: Wiktionary (CC BY-SA 4.0), Tatoeba (CC BY 2.0 FR), FrequencyWords (MIT).

## Review Focus

- Answer containing characters with no tile-friendly form (spaces, apostrophes, hyphens: `l'acqua`, `o'clock`): excluded at build time. The grid never shows an unbuildable answer. Test in Task 3 (`isPlayableWord`) and Task 7 (generator throws on >16 graphemes).
- `localStorage` unavailable, full, or holding corrupt JSON (private mode, quota): the app still runs with defaults and logs a warning. Test in Task 5.
- The device language is something like `it-CH`/`en-GB`/`de-DE`, or `navigator.languages` is empty: resolve to `it`/`en`/`en`/`en`. Test in Task 2.
- A pair with too few phrases for a phrase mode, or no data file at all: the menu disables that mode and shows a message instead of crashing. Test in Task 8 (`availableModes`) and Task 9 (engine with empty pool).
- The user traces a valid synonym or the lemma when the phrase gap is an inflected form: synonyms count as correct. In phrase mode the lemma is "wrong but real" with a popup that shows the lemma relation. Test in Task 8 (`evaluate`).

---

### Task 1: Scaffold, tooling, CI deploy

**Files:**
- Create: `package.json`, `tsconfig.json`, `tsconfig.node.json`, `vite.config.ts`, `index.html`, `src/main.ts`, `src/App.vue`, `src/env.d.ts`, `.prettierrc.json`, `.github/workflows/deploy.yml`, `src/App.spec.ts`
- Modify: `.gitignore` (add `.data-cache/`), `devenv.nix` (add `bzip2` to packages; scripts `test` → `pnpm test`, `data` → `pnpm data`)

**Interfaces:**
- Produces: scripts `pnpm dev | build | preview | test | typecheck | data`. `test` = `vitest run`, `typecheck` = `vue-tsc --noEmit`, `build` = `vue-tsc --noEmit && vite build`, `data` = `tsx scripts/data/build.ts`.

- [ ] **Step 1:** On branch `feat/initial-app`, create the files. Use dependencies vue, vue-router, pinia. Dev dependencies: vite, @vitejs/plugin-vue, vite-plugin-pwa, typescript, vue-tsc, vitest, @vue/test-utils, jsdom, tsx, @types/node. `vite.config.ts` sets `base: '/lang-rumble/'` and `test.environment: 'jsdom'`. `tsconfig` sets `strict`, `noUncheckedIndexedAccess`, and path alias `@/*` → `src/*`.
- [ ] **Step 2:** Write the smoke test `src/App.spec.ts`: mounting `App` with a router stub renders without throwing.
- [ ] **Step 3:** Run `pnpm install && pnpm test && pnpm build`. Expected: the test passes and `dist/` is created.
- [ ] **Step 4:** Add `.github/workflows/deploy.yml`. On `push` to `master` plus `workflow_dispatch`, it runs pnpm/action-setup, setup-node 22 with pnpm cache, `pnpm install --frozen-lockfile`, `pnpm test`, `pnpm build`, actions/upload-pages-artifact (`dist`) and actions/deploy-pages. Permissions: `pages: write`, `id-token: write`.
- [ ] **Step 5:** Commit `chore: scaffold vue+ts pwa, ci deploy`.

### Task 2: Core types, logging, i18n

**Files:**
- Create: `src/domain/types.ts`, `src/lib/log.ts`, `src/i18n/messages.ts`, `src/i18n/index.ts`, `src/i18n/index.spec.ts`

**Interfaces (Produces, used by all later tasks):**
```ts
// src/domain/types.ts
export type BaseLang = 'it' | 'en'
export type LangCode = 'it' | 'en' | 'es' | 'de' | 'fr'
export type PairKey = `${BaseLang}-${LangCode}`
export type Mode = 'word-to-target' | 'target-to-word' | 'phrase-to-target' | 'phrase-to-base'
export type Direction = 'production' | 'recognition'   // production: answer in target
export type Side = 'target' | 'base'
export interface Phrase { text: string; gap: string; hint: string } // text in answer lang contains gap (lowercased match); hint in other lang
export interface DeckEntry { id: string; rank: number; target: string[]; base: string[]; phrase?: { target?: Phrase; base?: Phrase } }
export interface LexEntry { tr: string[]; def: string | null }   // tr into the other language; def in base lang
export interface PairData { v: 1; base: BaseLang; target: LangCode; deck: DeckEntry[]; lexicon: Record<Side, Record<string, LexEntry>> }
export interface Manifest { v: 1; pairs: Partial<Record<PairKey, { words: number; phrasesTarget: number; phrasesBase: number }>> }
export const BASE_LANGS: readonly BaseLang[]; export const TARGET_LANGS: readonly LangCode[]
export function pairKey(base: BaseLang, target: LangCode): PairKey
export function modeDirection(mode: Mode): Direction   // word-to-target & phrase-to-target → production
// src/lib/log.ts
export const log: { info(msg: string, ctx?: Record<string, unknown>): void; warn(...same); error(msg: string, err?: unknown, ctx?: Record<string, unknown>): void }
// src/i18n/index.ts
export function detectBaseLang(languages: readonly string[]): BaseLang
export function useI18n(): { t: (key: MessageKey, params?: Record<string, string | number>) => string; lang: ComputedRef<BaseLang> }
export function langName(code: LangCode, inLang: BaseLang): string
```
`messages.ts` exports `en` (the source of `MessageKey = keyof typeof en`) and `it: Record<MessageKey, string>`. `{name}` placeholders are interpolated. `useI18n` reads the base language from the settings store (Task 5). Until that exists, it accepts an injected ref through `provideLang(ref)`, which the store wires up.

- [ ] **Step 1: Tests** in `src/i18n/index.spec.ts`:
  - `detectBaseLang(['it-CH','en'])` → `'it'`; `['en-GB']` → `'en'`; `['de-DE','it']` → `'it'`; `[]` → `'en'`
  - every key in `en` exists and is non-empty in `it`
  - `t('round.points', {n: 5})` with the template `'{n} points'` → `'5 points'`
- [ ] **Step 2:** Run `pnpm test src/i18n`. Expected: FAIL.
- [ ] **Step 3:** Implement the types, log and i18n. `detectBaseLang` scans the list in order and returns the first `it`/`en` match, else `'en'`. Add messages for every screen in Tasks 11–12 now. Keys can be added later in both languages.
- [ ] **Step 4:** Run `pnpm test src/i18n`. Expected: PASS.
- [ ] **Step 5:** Commit `feat: core types, logger, i18n`.

### Task 3: Data pipeline — pure transforms

**Files:**
- Create: `scripts/data/wiktionary.ts`, `scripts/data/lemmas.ts`, `scripts/data/resolve.ts`, `scripts/data/phrases.ts`, `scripts/data/*.spec.ts`, `scripts/data/fixtures/*.jsonl`
- Modify: `vite.config.ts` (`test.include` also covers `scripts/**/*.spec.ts`)

**Interfaces:**
```ts
// wiktionary.ts
export type Edition = 'it' | 'en'
export interface LexRecord { edition: Edition; lang: LangCode; word: string; pos: string; glosses: string[]; formOf: string[]; translations: { lang: LangCode; word: string; sense: string | null }[] }
export function parseRecord(line: string, edition: Edition): LexRecord | null
export function cleanGloss(gloss: string, word: string): string | null
export function isPlayableWord(w: string): boolean
// lemmas.ts
export function rankLemmas(freq: [string, number][], formOf: Map<string, string[]>, known: Set<string>): { lemma: string; count: number; forms: string[] }[]
// resolve.ts
export interface LexIndex { byLangWord: Map<string, LexRecord[]> }   // key `${edition}:${lang}:${word}`
export function buildIndex(records: Iterable<LexRecord>): LexIndex
export function baseTranslations(idx: LexIndex, base: BaseLang, target: LangCode, lemma: string): string[]
export function baseDefinition(idx: LexIndex, base: BaseLang, word: string): string | null
export function targetTranslations(idx: LexIndex, base: BaseLang, target: LangCode, baseWord: string): string[]
// phrases.ts
export interface Sentence { id: number; lang: LangCode; text: string }
export function findGap(text: string, forms: string[]): string | null  // case-insensitive, Unicode word boundaries, returns form as written lowercased
export function pickPhrase(candidates: { text: string; hint: string }[], forms: string[], maxWords: number): Phrase | null // shortest sentence containing a form, ≤ maxWords
```
Rules (from the spec): `parseRecord` keeps only `lang_code` ∈ LangCode and drops `pos` ∈ {name, character, symbol, prefix, suffix, abbrev, phrase, proverb}. It lowercases the word, and `formOf` comes from `senses[].form_of[].word`. `cleanGloss` strips parentheticals, rejects glosses that are empty, equal the word, or are it-edition stubs like `casa ( approfondimento)`, and trims trailing punctuation. `isPlayableWord`: `/^\p{L}+$/u`, 2–12 graphemes. `baseTranslations` priority is (a) the base-edition record for the target word: split its first two glosses on `,;`, keep single playable tokens that exist as base-language records. (b) Base-language records whose translations into `target` contain the lemma. (c) Pivot via English, only when base = `it` and target ≠ `en`: the first gloss of the en-edition target record → English head word → translations of that English record into `it`, first sense only. The result is deduped and capped at 4. `baseDefinition` returns the first cleaned non-form-of gloss of the base-edition, base-language record.

- [ ] **Step 1: Tests** using fixture lines copied from real kaikki data (it-edition `casa`/it, `casa`/es, `estar`/es with `form_of` on `estaba`, and en-edition `house`/en with translations):
  - `parseRecord` of a proper noun → `null`; of `estaba` → `formOf: ['estar']`
  - `cleanGloss('casa ( approfondimento) f sing','casa')` → `null`; `cleanGloss('edificio (destinato) all\'abitazione.', 'casa')` → `"edificio all'abitazione"`
  - `isPlayableWord("l'acqua")` → false; `('o-clock')` → false; `('straße')` → true; `('a')` → false
  - `rankLemmas([['estaba',10],['estar',5],['está',7]], formOf, known)` → `[{lemma:'estar',count:22,forms:['estaba','estar','está']}]` (forms sorted)
  - `baseTranslations(idx,'it','es','casa')` includes `'casa'`. The pivot path returns `'casa'` for es `hogar` via en `home`.
  - `findGap('¿Dónde Estaba él?', ['estaba','estar'])` → `'estaba'`; `findGap('estabas', ['estaba'])` → `null`
- [ ] **Step 2:** Run `pnpm test scripts/data`. Expected: FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run `pnpm test scripts/data`. Expected: PASS.
- [ ] **Step 5:** Commit `feat(data): wiktionary/tatoeba transforms`.

### Task 4: Data pipeline — download, build, generate

**Files:**
- Create: `scripts/data/download.ts`, `scripts/data/build.ts`, `scripts/data/stream.ts`, `public/data/*.json` (generated), `ATTRIBUTION.md`

**Interfaces:**
- Consumes: Task 3 functions, Task 2 types.
- Produces: `public/data/manifest.json` (`Manifest`), `public/data/{base}-{target}.json` (`PairData`) for the 8 pairs it-{en,es,de,fr} and en-{it,es,de,fr}, and `public/data/dict-{lang}.json` (`string[]`, the sorted valid-word list used for "real word" detection).

Sources, cached in `.data-cache/` and skipped if already present:
- `https://kaikki.org/dictionary/raw-wiktextract-data.jsonl.gz` (en edition)
- `https://kaikki.org/itwiktionary/raw-wiktextract-data.jsonl.gz`
- `https://raw.githubusercontent.com/hermitdave/FrequencyWords/master/content/2018/{l}/{l}_50k.txt`
- `https://downloads.tatoeba.org/exports/per_language/{ita,eng,spa,deu,fra}/{iso3}_sentences.tsv.bz2`
- `https://downloads.tatoeba.org/exports/links.tar.bz2`

Build steps in `build.ts`:
1. Load the frequency lists, top 50k each.
2. Stream both gz dumps line by line (`zlib.createGunzip` + `readline`). Keep records whose word is in that language's frequency set, or that are a base-language record (it, en) of any word.
3. Stream the bz2 files via `spawn('bzip2', ['-dc', file])`, and the links tarball with `tar -xOjf`.
4. For each pair:
   - `rankLemmas`
   - for each playable lemma in rank order, keep it if `baseTranslations` is non-empty and `baseDefinition(base[0])` is non-null; stop at 2,000
   - `target` answers = [lemma, plus other deck lemmas sharing `base[0]`] (cap 3)
   - phrases: `pickPhrase` with `maxWords` 10, target side using lemma forms, base side using base-answer forms (where the linked target sentence also contains a lemma form)
   - lexicon: target side covers deck lemmas plus the top 5k target words with translations; base side covers the base words of the deck plus `targetTranslations`
5. `dict-{lang}`: playable words from the frequency top 20k that exist as records in either edition, unioned with every deck/lexicon word.
6. Print the coverage table (words, phrasesTarget, phrasesBase per pair).

- [ ] **Step 1:** Implement `download.ts` (Node `fetch` streamed to file, with progress logged every 50 MB) and `build.ts`.
- [ ] **Step 2:** Run `pnpm data` in the background (multi-GB download). Expected: 8 pair files plus 5 dict files plus the manifest. The coverage table shows ≥ 1,000 words for every pair. If any pair is < 1,000, log it in the PR description and continue (the spec accepts best effort).
- [ ] **Step 3:** Check that the total size of `public/data` is < 15 MB (`du -sh public/data`). If not, cap the lexicon at 3k and the dict at 15k, then rerun.
- [ ] **Step 4:** Write `ATTRIBUTION.md` (sources, licenses, links; the generated data is CC BY-SA 4.0).
- [ ] **Step 5:** Commit `feat(data): generated word data from open sources`.

### Task 5: Persistence + settings/progress store

**Files:**
- Create: `src/lib/storage.ts`, `src/stores/app.ts`, `src/lib/storage.spec.ts`, `src/stores/app.spec.ts`

**Interfaces:**
```ts
// src/lib/storage.ts
export interface WordStat { box: number; seen: number; correct: number; lastSeen: number }
export interface PairProgress { words: Record<string, Partial<Record<Direction, WordStat>>>; points: number; bestStreak: number; rounds: number }
export interface Settings { base: BaseLang; targets: LangCode[]; activeTarget: LangCode | null; theme: 'system' | 'light' | 'dark'; sound: boolean }
export interface SaveState { v: 1; settings: Settings; progress: Partial<Record<PairKey, PairProgress>> }
export const STORAGE_KEY = 'lang-rumble:v1'
export function defaultState(languages: readonly string[]): SaveState
export function loadState(storage: Storage | null, languages: readonly string[]): SaveState
export function saveState(storage: Storage | null, state: SaveState): void
export function emptyProgress(): PairProgress
// src/stores/app.ts  (Pinia setup store 'app')
state: SaveState (reactive); getters: activePair: PairKey | null; activeProgress: PairProgress | null
actions: setBase(b), addTarget(t), removeTarget(t), setActiveTarget(t), setTheme(t), setSound(on), commitRound(pair: PairKey, update: (p: PairProgress) => void)
```
The store saves through a watcher with a 300 ms debounce, plus a flush on `visibilitychange` → hidden. `addTarget`/`setActiveTarget` refuse `t === base` (no-op plus a `log.warn`). `setBase` removes `base` from `targets` and clears `activeTarget` when they become equal.

- [ ] **Step 1: Tests:**
  - `loadState(null, ['it'])` returns defaults with `base 'it'`
  - corrupt JSON → defaults and `log.warn` called (spy)
  - `{v: 99}` → defaults
  - a `setItem` that throws `QuotaExceededError` → no throw, `log.error` called
  - store: `addTarget('it')` with base `it` → targets unchanged
  - `setBase('en')` when the active target is `en` → `activeTarget` becomes null
- [ ] **Step 2:** Run `pnpm test src/lib/storage src/stores`. Expected: FAIL.
- [ ] **Step 3:** Implement. Wire `provideLang` from Task 2 to `state.settings.base`.
- [ ] **Step 4:** Run the same command. Expected: PASS.
- [ ] **Step 5:** Commit `feat: local persistence and app store`.

### Task 6: Spaced repetition

**Files:**
- Create: `src/domain/repetition.ts`, `src/domain/repetition.spec.ts`

**Interfaces:**
```ts
export const MASTERED_BOX = 3
export function applyResult(stat: WordStat | undefined, result: 'correct' | 'skip' | 'seen', now: number): WordStat
export function pickNext(pool: DeckEntry[], stats: PairProgress['words'], dir: Direction, now: number, rng: () => number, exclude: ReadonlySet<string>): DeckEntry | null
export function isMastered(stat: WordStat | undefined): boolean
```
`applyResult`: `correct` → box+1 (max 5), correct+1. `skip` → box 0. All results do seen+1 and set lastSeen. Weighting for `pickNext` over seen entries: box weights `[8,4,2,1,0.5,0.25]`, ×0.1 if `now - lastSeen < 120_000`. The lowest-rank unseen entry joins the pool with weight 6. Excluded ids are never returned. It returns null when nothing is eligible.

- [ ] **Step 1: Tests:**
  - box transitions (5 stays 5 on correct, skip → 0)
  - with an empty stats object, the first pick is the rank-1 entry
  - with a deterministic rng, over 1,000 picks a box-0 word is chosen > 5× as often as a box-5 word
  - an excluded id is never returned
  - empty pool → null
- [ ] **Step 2:** Run `pnpm test src/domain/repetition`. Expected: FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run the same command. Expected: PASS.
- [ ] **Step 5:** Commit `feat: leitner repetition`.

### Task 7: Scoring and grid generation

**Files:**
- Create: `src/domain/scoring.ts`, `src/domain/grid.ts`, `src/domain/rng.ts`, `src/domain/scoring.spec.ts`, `src/domain/grid.spec.ts`

**Interfaces:**
```ts
// scoring.ts
export function scoreCorrect(letters: number, elapsedMs: number, streakBefore: number): number
//   round((letters*10 + round(50*max(0,1-elapsedMs/30000))) * (1 + min(streakBefore,5)*0.2))
export function scoreWrongReal(letters: number): number   // letters*2
// rng.ts
export function mulberry32(seed: number): () => number
// grid.ts
export const GRID_SIZE = 4
export type Path = number[]  // tile indexes 0..15
export function graphemes(word: string): string[]   // Intl.Segmenter
export function isAdjacent(a: number, b: number): boolean
export function isValidPath(path: Path): boolean   // adjacency + no reuse
export function wordFromPath(tiles: string[], path: Path): string
export function generateGrid(answer: string, decoys: string[], letterFreq: Record<string, number>, rng: () => number): { tiles: string[]; answerPath: Path }
export function letterFrequencies(words: string[]): Record<string, number>
```
`generateGrid`: place the answer with randomized DFS on the 4×4 board (throw if > 16 graphemes or if no path exists after the search). For up to 2 decoys, try to place each by DFS that may reuse a tile already holding the same letter, keeping the placement only if it fits. Fill empty tiles by weighted pick from `letterFreq`. Tiles are lowercase graphemes.

- [ ] **Step 1: Tests:**
  - `scoreCorrect(4, 0, 0)` → 90; `scoreCorrect(4, 30000, 0)` → 40; `scoreCorrect(4, 0, 10)` → 180; `scoreWrongReal(5)` → 10
  - `isAdjacent(0,5)` true, `(3,4)` false
  - for 200 random seeds and answers `['straße','niño','cœur','casa','abcdefghijklmnop']`, `wordFromPath(tiles, answerPath) === answer` and `isValidPath(answerPath)`
  - a 17-letter answer throws
  - `graphemes('niño')` has length 4
- [ ] **Step 2:** Run `pnpm test src/domain/scoring src/domain/grid`. Expected: FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run the same command. Expected: PASS.
- [ ] **Step 5:** Commit `feat: scoring and grid generation`.

### Task 8: Runtime data loading and answer evaluation

**Files:**
- Create: `src/data/loader.ts`, `src/domain/evaluate.ts`, `src/domain/prompt.ts`, `src/data/loader.spec.ts`, `src/domain/evaluate.spec.ts`, `src/domain/prompt.spec.ts`, `src/test/fixtures/it-es.json`, `src/test/fixtures/dict-es.json`, `src/test/fixtures/dict-it.json`

**Interfaces:**
```ts
// loader.ts
export interface LoadedPair { data: PairData; dict: Record<Side, ReadonlySet<string>> }
export function loadManifest(fetcher?: typeof fetch): Promise<Manifest>
export function loadPair(base: BaseLang, target: LangCode, fetcher?: typeof fetch): Promise<LoadedPair> // memoized; URL `${import.meta.env.BASE_URL}data/...`
export function availableModes(manifest: Manifest, key: PairKey): Mode[]  // phrase modes need ≥ 20 phrases on that side
// prompt.ts
export interface Prompt { entry: DeckEntry; mode: Mode; answerSide: Side; shown: string; hint: string | null; phraseText: string | null; accepted: string[] }
export function buildPrompt(entry: DeckEntry, mode: Mode): Prompt
export function poolFor(deck: DeckEntry[], mode: Mode): DeckEntry[]
// evaluate.ts
export interface Reveal { word: string; side: Side; correct: boolean; translations: string[]; definition: string | null; lemma: string | null }
export type Evaluation = { kind: 'correct'; reveal: Reveal } | { kind: 'wrong-real'; reveal: Reveal } | { kind: 'invalid' }
export function evaluate(word: string, prompt: Prompt, pair: LoadedPair): Evaluation
```
`buildPrompt` by mode:
- word-to-target: shown `base[0]`, accepted `target`
- target-to-word: shown `target[0]`, accepted `base`
- phrase-to-target: phraseText is `phrase.target.text` with the gap replaced by `＿` × gap length, hint `phrase.target.hint`, shown `base[0]`, accepted `[gap]`
- phrase-to-base: mirrored, using `phrase.base`

`evaluate`: the word is lowercased and checked against `accepted` → correct. Otherwise, if it is in `dict[answerSide]` or in `lexicon[answerSide]` → wrong-real. Otherwise invalid. The definition comes from `lexicon[side][word].def`. For a wrong word in the target language that has no def, use the def of its first base translation. For a correct answer in phrase mode, `lemma` = `entry.id` when it differs from the word.

- [ ] **Step 1: Tests** (using the hand-written fixture `it-es` with 5 entries: casa, estar with phrase gap `estaba`, hogar, perro, gato):
  - production `casa` → correct with an Italian definition
  - a phrase prompt for `estar`: `estaba` → correct with lemma `estar`; `estar` → wrong-real
  - `perro` on a `casa` prompt → wrong-real, `translations` includes `cane`
  - `xqz` → invalid
  - `availableModes` with phrasesTarget 5 excludes `phrase-to-target`
  - `loadPair` called twice → fetch called once per file (mock fetcher)
  - a fetch 404 rejects with an Error and calls `log.error`
- [ ] **Step 2:** Run `pnpm test src/data src/domain/evaluate src/domain/prompt`. Expected: FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run the same command. Expected: PASS.
- [ ] **Step 5:** Commit `feat: pair loading, prompts, answer evaluation`.

### Task 9: Round engine

**Files:**
- Create: `src/domain/round.ts`, `src/domain/round.spec.ts`

**Interfaces:**
```ts
export const ROUND_MS = 120_000
export interface RoundDeps { pair: LoadedPair; mode: Mode; progress: PairProgress; now: () => number; rng: () => number }
export interface RoundState { prompt: Prompt | null; tiles: string[]; score: number; streak: number; bestStreak: number; correct: string[]; wrongReal: Reveal[]; newlyMastered: string[]; paused: boolean; over: boolean }
export interface SubmitOutcome { evaluation: Evaluation; points: number }
export class Round {
  constructor(deps: RoundDeps)
  readonly state: RoundState
  start(): void
  remainingMs(): number          // excludes paused time; clamps at 0 and sets over
  pause(): void; resume(): void
  submit(word: string): SubmitOutcome   // correct → pause() (popup opens); caller calls next() after dismissal
  next(): void                           // resume + new prompt + new grid
  skip(): void
  applyTo(progress: PairProgress): void  // writes WordStats ('seen' for every shown prompt, 'correct' / 'skip'), points, bestStreak, rounds+1
}
```
- Decoys for `generateGrid` are 2 random words from `dict[answerSide]` with ≥ 3 graphemes, none in `accepted`. `letterFreq` is computed once per round from the dict.
- Wrong-real points are awarded once per distinct word per round.
- Every popup (correct or wrong-real) is opened by the UI, which calls `pause()`/`resume()`. `submit` returns the outcome and leaves the clock alone except on correct, where it pauses.
- An empty pool sets `over` immediately with `prompt null`.
- Elapsed time per prompt counts unpaused time only.

- [ ] **Step 1: Tests** with a fake clock:
  - `remainingMs` after 10 s → 110 000; pause, advance 30 s, resume → still 110 000
  - correct at 5 s, streak 0, `casa` → points `scoreCorrect(4,5000,0)`; `streak` 1
  - wrong-real twice same word → points awarded once
  - skip resets streak and `applyTo` sets box 0
  - at 120 s, `over` is true
  - a word reaching box 3 via `applyTo` is listed in `newlyMastered`
  - empty pool → `over` true on start
- [ ] **Step 2:** Run `pnpm test src/domain/round`. Expected: FAIL.
- [ ] **Step 3:** Implement. (`newlyMastered` is computed inside `submit` by projecting the box from the current progress and the round's own tally.)
- [ ] **Step 4:** Run the same command. Expected: PASS.
- [ ] **Step 5:** Commit `feat: timed round engine`.

### Task 10: Theme, CSS architecture, sound and haptics

**Files:**
- Create: `src/styles/tokens.css`, `src/styles/base.css`, `src/styles/animations.css`, `src/styles/index.css`, `src/lib/theme.ts`, `src/lib/sfx.ts`, `src/lib/theme.spec.ts`

**Interfaces:**
```ts
export function applyTheme(pref: Settings['theme'], root?: HTMLElement): void   // sets data-theme="light|dark" (system → matchMedia)
export const sfx: { play(name: 'tile' | 'correct' | 'wrong' | 'invalid' | 'tick' | 'end' | 'tap'): void; setEnabled(on: boolean): void; haptic(pattern: number | number[]): void }
```
`tokens.css` defines every colour, radius, shadow, font and spacing as custom properties on `:root[data-theme="light"]` and `:root[data-theme="dark"]`, plus a palette for the mode buttons (4 bright colours), and `--ok`/`--bad` for popups. Components use tokens only. `sfx` synthesizes short tones with WebAudio (no assets) and lazily creates the AudioContext on first user gesture. It no-ops when disabled or unsupported.

- [ ] **Step 1: Tests:**
  - `applyTheme('dark')` sets `data-theme="dark"`
  - `applyTheme('system')` with a matchMedia mock reporting dark → `dark`
- [ ] **Step 2:** Run `pnpm test src/lib/theme`. Expected: FAIL.
- [ ] **Step 3:** Implement. Import `styles/index.css` in `main.ts`, and call `applyTheme` from the store watcher.
- [ ] **Step 4:** Run the same command. Expected: PASS.
- [ ] **Step 5:** Commit `feat: themable css tokens, sfx`.

### Task 11: Game components

**Files:**
- Create: `src/components/LetterBoard.vue`, `src/components/RevealPopup.vue`, `src/components/RoundHud.vue`, `src/components/PromptCard.vue`, `src/components/*.spec.ts`

**Interfaces:**
- `LetterBoard` props `{ tiles: string[]; rolling: boolean }`, emits `submit(word: string, path: Path)` and `trace(path: Path)`. It uses pointer events with `touch-action: none` and `setPointerCapture`. Hit-testing uses `document.elementFromPoint` against tiles shrunk to 70% radius, so diagonal swipes don't clip neighbours. A tile pops/wobbles when added to the path, and an SVG polyline follows the path. Moving back onto the previous tile pops the last tile (undo). `rolling` triggers the slot-machine roll-in animation (staggered translateY per column). It plays `sfx.play('tile')`.
- `RevealPopup` props `{ reveal: Reveal }`, emits `close`. When `correct`, it uses the `--ok` background, ✓ icon and `t('reveal.correct')` header. When wrong, it uses the `--bad` background, ✗ icon and `t('reveal.wrong')` header. Both show the word, lemma (if any), translations and definition (or `t('reveal.noDefinition')`). Close is a big button.
- `RoundHud` props `{ remainingMs: number; score: number; streak: number }`. The timer turns red under 10 s, and the score animates (tween) on change.
- `PromptCard` props `{ prompt: Prompt }`. It shows the word, or the phrase with the gap highlighted plus the hint in smaller type.

- [ ] **Step 1: Tests:**
  - `LetterBoard`: simulated pointerdown on tile 0 → pointermove to 1 → pointerup emits `submit` with the word from tiles 0 and 1 (stub `elementFromPoint`)
  - `RevealPopup`: correct reveal has class `is-correct` and the correct header. Wrong has `is-wrong`, and its header text differs.
- [ ] **Step 2:** Run `pnpm test src/components`. Expected: FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run the same command. Expected: PASS.
- [ ] **Step 5:** Commit `feat: board, popup, hud components`.

### Task 12: Views, router, PWA

**Files:**
- Create: `src/router.ts`, `src/views/MenuView.vue`, `src/views/PlayView.vue`, `src/views/ResultsView.vue`, `src/views/ProgressView.vue`, `src/views/SettingsView.vue`, `src/views/AboutView.vue`, `src/stores/round.ts`, `public/icons/*` (generated SVG/PNG icons), `src/views/*.spec.ts`
- Modify: `vite.config.ts` (VitePWA: `registerType: 'autoUpdate'`, manifest name "Lang Rumble", `display: 'standalone'`, `orientation: 'portrait'`, theme colours, icons, `workbox.globPatterns: ['**/*.{js,css,html,svg,png,json}']`, `maximumFileSizeToCacheInBytes: 6_000_000`), `src/App.vue`

**Interfaces:**
- Routes (hash history): `/` Menu, `/play/:mode` Play, `/results` Results, `/progress`, `/settings`, `/about`. A guard redirects to `/settings?onboarding=1` when `activeTarget` is null (except for settings/about).
- `stores/round.ts` (Pinia 'round') holds the current `Round`, ticks via `requestAnimationFrame`, exposes reactive `state`/`remainingMs`, and keeps `lastSummary` for Results. On `over` it calls `round.applyTo` inside `app.commitRound` and routes to `/results`. `visibilitychange` hidden → pause.
- **Menu:** 4 big colourful mode buttons (disabled with a reason per `availableModes`), plus links to Progress, Settings and About. It shows the active pair (flags as emoji plus localized names).
- **Play:** HUD, PromptCard, LetterBoard, skip and pause buttons. On wrong-real/correct it shows RevealPopup (round paused). On invalid it shakes the trace and plays `sfx('invalid')`.
- **Results:** points (counter roll-up), correct words, wrong-real words with meanings, best streak, newly mastered. Buttons: play again, menu.
- **Progress:** per target in `targets`, it shows seen / mastered (both directions) / total deck, points, best streak, and a "to review" list (box 0 with seen > 0, top 20).
- **Settings:** base language (it/en), target list add/remove/activate (excluding base), theme (system/light/dark), sound toggle. Onboarding mode shows a welcome line and requires picking one target.
- **About:** attribution text from `ATTRIBUTION.md` content (localized intro + links).

- [ ] **Step 1: Tests:**
  - router guard: with no active target, navigating to `/` lands on `/settings`
  - `SettingsView` doesn't list `it` as a target option when base is `it`
  - `MenuView` renders 4 mode buttons and disables phrase modes when the manifest has 0 phrases
- [ ] **Step 2:** Run `pnpm test src/views`. Expected: FAIL.
- [ ] **Step 3:** Implement the views, router, round store and PWA config.
- [ ] **Step 4:** Run `pnpm test && pnpm build`. Expected: all tests PASS, and the build emits `sw.js` + `manifest.webmanifest`.
- [ ] **Step 5:** Commit `feat: views, router, pwa`.

### Task 13: End-to-end verification

- [ ] **Step 1:** Run `pnpm typecheck && pnpm test && pnpm build`. Expected: all green.
- [ ] **Step 2:** `pnpm preview`, then drive it in a mobile viewport (390×844):
  - onboarding → pick Spanish
  - play word-to-target: trace the answer → green popup, timer paused; trace a decoy → red popup
  - finish the round → results
  - progress shows the counts
  - toggle dark theme and reload → the theme persists
  - switch the device language to `it` with fresh storage → Italian UI
- [ ] **Step 3:** Fix any defects found (each with a regression test), and commit.
