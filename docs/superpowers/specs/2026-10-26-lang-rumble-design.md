# Lang Rumble — Design

Date: 2026-10-26
Source requirements: `spec.md` (repo root). This document refines it; where they conflict, this wins.

## Intent

A playful, Ruzzle-style mobile game that teaches the ~2,000 most frequent words of a language. The user sees a word (or a sentence with a gap) and builds the translation by dragging across a letter grid. The feel is slot-machine/arcade: points, sounds, wobbling tiles, bright colours. The goal is habit-forming practice of high-frequency vocabulary, with explanations (translation + definition in the user's own language) whenever they build a word.

## Goals

- Learn from **Italian** or **English** (the "base" language) into **English, Italian, Spanish, German, French** (the "target"). No same-language pair.
- A user can study several targets; they switch in the language/settings page. One pair is active at a time; never mixed within a session.
- Modes (from the main menu, big colourful buttons):
  1. **Word → target**: base word shown, build the target word.
  2. **Target → word**: target word shown, build the base word.
  3. **Phrase → target**: base-language sentence shown as a hint; the target-language sentence is shown with one word blanked; build the blanked target word.
  4. **Phrase → base**: the reverse of 3 (target sentence as hint, base sentence with the gap, build the base word).
- **Popup on every submitted real word**:
  - Wrong-but-real word (exists in the answer language's dictionary): popup shows the word built, its translation into the other language, and its definition **in the base language**. Unmistakably styled as wrong (red/negative colour, "wrong" label, icon). Awards a small bonus.
  - Correct word: same popup layout, clearly styled as correct (green/positive), with the definition in the base language. After dismissing, a new prompt and a new grid appear.
  - Non-words: no popup; the trace shakes and clears.
- **Progress section**: per target language: words seen, words mastered, best streak, total points, list of "to review" words.
- **Languages/settings section**: choose base language, add/switch target languages, light/dark theme toggle, sound on/off.
- **UI i18n**: the app's own UI text is in the base language (Italian or English). Initial value comes from the device (`navigator.languages`): Italian if the first matching language is `it`, otherwise English. The user can change it in settings; the base language for learning and the UI language are the same setting.
- **Persistence**: preferences and progress live in `localStorage` on the device. No accounts, no backend.
- **Spaced repetition**: track every word the user has seen. Words answered correctly repeatedly appear less often; missed words return sooner.
- **Mobile and touch first**. Portrait phone layout is the target. Desktop must not break, but it gets no special design.
- PWA: installable, works offline after first load.

## Non-goals (this version)

- No backend, accounts, sync, leaderboards or multiplayer.
- No base languages other than Italian and English.
- No desktop/large-screen layout work.
- No audio pronunciation (sound effects only).
- Perfect data. The word data is best effort; gaps are acceptable.

## Anti-goals

- Mixing two target languages in one session.
- A popup for a wrong word that could be mistaken for success.
- A dull, form-like UI. If it feels like a flashcard app, it failed.
- Network dependence at play time. All data ships with the app.

## Constraints

- Vue 3, Composition API (`<script setup>`), TypeScript (strict), Vite, PWA (`vite-plugin-pwa`).
- Modular, easily themed CSS. Light and dark themes are driven by CSS custom properties. Theme default follows `prefers-color-scheme` and can be overridden in settings.
- Hosted on GitHub Pages. A GitHub Actions workflow builds and deploys on every push to `master`. Vite `base` must match the repo path (`/lang-rumble/`).
- Development environment is the existing devenv (Node 22, pnpm).
- Word data is shipped as static JSON in the frontend and loaded lazily per language pair.

## Data (decided: built from open sources)

An offline build script (`scripts/build-data/`, Node + TS, run manually, not in CI) downloads the sources, processes them and writes JSON into `public/data/` (or `src/data/`), which is committed.

Sources (validated during design):
- **Frequency**: hermitdave/FrequencyWords 2018 `*_50k.txt` (MIT, OpenSubtitles-based) for it, en, es, de, fr.
- **Italian-language glosses/definitions and translations**: kaikki.org Italian-edition Wiktextract dump (CC BY-SA). Measured coverage of top 2k: Italian definitions 1777, English words with Italian gloss 1782, es/de/fr only ~660–820.
- **English-language glosses/definitions and translations**: kaikki.org English-edition Wiktextract data (CC BY-SA), used as a pivot to fill es/de/fr gaps and as the source for English definitions.
- **Phrases**: Tatoeba sentence pairs (CC BY 2.0 FR).

Processing rules:
- Lemmatize frequency entries using Wiktionary `form_of` data (estaba → estar). Merge counts into the lemma.
- Drop proper nouns, single letters, numbers, interjection noise and entries without data.
- Per pair, the deck is the first 2,000 lemmas by frequency that have **target word + base translation + base-language definition**. Gaps are skipped by going deeper in the frequency list. A phrase is optional per word. Phrase modes only draw from words that have one.
- Definitions are always in the base language. For a foreign word, the definition shown is the base-language definition of its base translation.
- Translations are lowercased and kept to words of ≥2 letters made of characters in the grid alphabet. Accented letters stay as their own tiles (é, ü, ñ, ß, à…), so the grid can always spell the answer.
- A dictionary of valid words per language (for "wrong but real" detection) is derived from the same data (the full lemma + form set, capped to keep size reasonable). It needs translation + base definition only for words that get a popup. Words without data still count as real; their popup shows "no definition available".
- An attribution file (`ATTRIBUTION.md` + an about screen in the app) credits Wiktionary (CC BY-SA), Tatoeba (CC BY) and FrequencyWords (MIT).

## Gameplay details (builder's suggestions, accepted by the user)

- **Grid**: 4×4 tiles. Drag through adjacent tiles (8-neighbourhood) to trace a word. No tile is reused in one trace. Release submits. The grid is generated so the answer is always traceable. Remaining tiles are filled to favour forming other real words in the answer language (e.g. by also embedding 1–2 decoy dictionary words, then filling with frequency-weighted letters). Answers longer than 16 letters are excluded from the deck. Multi-word answers are excluded.
- **Scoring**: base points per letter + time bonus decaying over ~30 s + streak multiplier for consecutive correct answers. A real-but-wrong word gives a small bonus once per distinct word per round. Skip is allowed and resets the streak.
- **Feel**: tiles wobble/scale on touch-over, a trace line follows the finger, slot-machine-style roll-in when a new grid appears, point counters tick up, short sound effects (Web Audio, generated or small bundled files), optional haptics (`navigator.vibrate`).
- **Mastery / repetition**: per word per pair, track times seen, times correct, last seen, and a box level (Leitner-style, 0–5). Correct → box up. Wrong/skip → box 0. Mastered = box ≥ 3. Word selection is weighted toward low boxes and words not seen recently, and introduces unseen words in frequency order.

## Rounds (user decision)

- Play happens in **timed rounds of 2 minutes**, started from the main menu for the chosen mode.
- The round clock **pauses while any popup is open** (correct/wrong word popup, pause menu) and resumes when it is dismissed.
- Within a round, prompts follow one another. A correct answer loads the next prompt and grid. Skip loads the next prompt.
- When time runs out, a **results screen** shows total points, words correct, wrong-but-real words found (with their meanings), best streak in the round, and words that became mastered. Buttons: play again, back to menu.
- The per-prompt time bonus is measured on unpaused time since the prompt appeared.

## Calls made after builder review (designer's calls, not user decisions)

- **Synonyms**: each deck entry stores a list of accepted answers (e.g. casa → house, home; you → tu, voi, lei). Any accepted answer counts as correct. The popup shows the one built plus the others. Grid decoys must not be accepted answers.
- **Phrase blanks**: the blank is the form that literally appears in the sentence (estaba, not estar). The popup shows the lemma alongside it. A phrase is only attached to a word when one of the word's forms appears literally in the gapped sentence (target side for mode 3, base side for mode 4), matched case-insensitively on word boundaries. Otherwise the word has no phrase for that direction.
- **Short decks**: quality beats count. A pair ships however many words pass the data rules, with no padding to 2,000 using weak pivots. The pivot through English accepts only the first-sense translation. The build script prints a coverage report per pair.
- **Mastery granularity**: tracked per word per direction (base→target "production" vs target→base "recognition"). Phrase modes share the box of their direction. Progress shows mastered = mastered in both directions.

## Persistence

`localStorage` under a versioned key: settings (base/UI language, active target, list of targets, theme, sound), and per pair progress (per-word stats, points, best streak). Writes are debounced. On a corrupt or unknown version, it resets with a console warning.

## Left to the builder

- Exact visual design, palette, fonts, animation timings, sound design.
- Component/store structure (Pinia or composables), router choice, i18n approach (vue-i18n or a minimal typed dictionary).
- Data JSON shapes, file splitting, and dictionary size cap.
- Test strategy (unit tests for grid generation, scoring, selection, data loaders. A light e2e is optional).
