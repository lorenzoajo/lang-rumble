import { computed, reactive, toRef, watch } from 'vue'
import { defineStore } from 'pinia'
import { provideLang } from '@/i18n'
import { log } from '@/lib/log'
import {
  browserStorage,
  emptyProgress,
  loadState,
  saveState,
  type PairProgress,
  type SaveState,
  type Settings,
} from '@/lib/storage'
import { pairKey, type BaseLang, type LangCode, type PairKey } from '@/domain/types'

const SAVE_DEBOUNCE_MS = 300

export const useAppStore = defineStore('app', () => {
  const storage = browserStorage()
  const state = reactive<SaveState>(loadState(storage, globalThis.navigator?.languages ?? []))
  provideLang(toRef(state.settings, 'base'))

  let timer: ReturnType<typeof setTimeout> | undefined
  const flush = (): void => {
    clearTimeout(timer)
    timer = undefined
    saveState(storage, state)
  }
  watch(
    state,
    () => {
      clearTimeout(timer)
      timer = setTimeout(flush, SAVE_DEBOUNCE_MS)
    },
    { deep: true },
  )
  globalThis.document?.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden' && timer !== undefined) flush()
  })

  const activePair = computed<PairKey | null>(() => {
    const { base, activeTarget } = state.settings
    return activeTarget ? pairKey(base, activeTarget) : null
  })
  const activeProgress = computed<PairProgress | null>(() =>
    activePair.value ? (state.progress[activePair.value] ?? null) : null,
  )

  function setBase(base: BaseLang): void {
    const s = state.settings
    s.base = base
    s.targets = s.targets.filter((t) => t !== base)
    if (s.activeTarget === base) s.activeTarget = null
  }

  function addTarget(target: LangCode): void {
    const s = state.settings
    if (target === s.base) {
      log.warn('cannot learn the base language', { target })
      return
    }
    if (!s.targets.includes(target)) s.targets.push(target)
  }

  function removeTarget(target: LangCode): void {
    const s = state.settings
    s.targets = s.targets.filter((t) => t !== target)
    if (s.activeTarget === target) s.activeTarget = s.targets[0] ?? null
  }

  function setActiveTarget(target: LangCode): void {
    if (target === state.settings.base) {
      log.warn('cannot study the base language', { target })
      return
    }
    addTarget(target)
    state.settings.activeTarget = target
  }

  function setTheme(theme: Settings['theme']): void {
    state.settings.theme = theme
  }

  function setSound(on: boolean): void {
    state.settings.sound = on
  }

  function commitRound(pair: PairKey, update: (p: PairProgress) => void): void {
    const progress = state.progress[pair] ?? emptyProgress()
    update(progress)
    state.progress[pair] = progress
  }

  return {
    state,
    activePair,
    activeProgress,
    setBase,
    addTarget,
    removeTarget,
    setActiveTarget,
    setTheme,
    setSound,
    commitRound,
    flush,
  }
})
