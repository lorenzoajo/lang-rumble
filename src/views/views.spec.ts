import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory } from 'vue-router'
import { createAppRouter } from '@/router'
import { useAppStore } from '@/stores/app'
import * as loader from '@/data/loader'
import { log } from '@/lib/log'
import type { Manifest } from '@/domain/types'
import SettingsView from './SettingsView.vue'
import MenuView from './MenuView.vue'

let pinia: ReturnType<typeof createPinia>

beforeEach(() => {
  localStorage.clear()
  pinia = createPinia()
  setActivePinia(pinia)
  vi.restoreAllMocks()
  vi.spyOn(navigator, 'languages', 'get').mockReturnValue(['it-IT'])
  vi.spyOn(log, 'warn').mockImplementation(() => {})
})

describe('router guard', () => {
  it('sends a first-time user to onboarding', async () => {
    const router = createAppRouter(createMemoryHistory())
    await router.push('/')
    expect(router.currentRoute.value.name).toBe('settings')
    expect(router.currentRoute.value.query.onboarding).toBe('1')
  })
  it('lets a user with an active language reach the menu', async () => {
    useAppStore().setActiveTarget('es')
    const router = createAppRouter(createMemoryHistory())
    await router.push('/')
    expect(router.currentRoute.value.name).toBe('menu')
  })
})

describe('play route guard', () => {
  it('sends an unavailable mode back to the menu', async () => {
    const manifest: Manifest = {
      v: 1,
      pairs: { 'it-es': { words: 2000, phrasesTarget: 0, phrasesBase: 0 } },
    }
    vi.spyOn(loader, 'loadManifest').mockResolvedValue(manifest)
    useAppStore().setActiveTarget('es')
    const router = createAppRouter(createMemoryHistory())
    await router.push('/play/phrase-to-target')
    expect(router.currentRoute.value.name).toBe('menu')
  })
  it('sends an unknown mode back to the menu', async () => {
    vi.spyOn(loader, 'loadManifest').mockResolvedValue({ v: 1, pairs: {} })
    useAppStore().setActiveTarget('es')
    const router = createAppRouter(createMemoryHistory())
    await router.push('/play/nonsense')
    expect(router.currentRoute.value.name).toBe('menu')
  })
})

describe('SettingsView', () => {
  it('does not offer the base language as a target', async () => {
    const router = createAppRouter(createMemoryHistory())
    await router.push('/settings')
    const w = mount(SettingsView, { global: { plugins: [pinia, router] } })
    const targets = w.findAll('[data-test="target-row"]').map((r) => r.attributes('data-lang'))
    expect(targets).not.toContain('it')
    expect(targets).toEqual(expect.arrayContaining(['en', 'es', 'de', 'fr']))
  })
})

describe('MenuView', () => {
  it('disables phrase modes when the pair has no phrases', async () => {
    const manifest: Manifest = {
      v: 1,
      pairs: { 'it-es': { words: 2000, phrasesTarget: 0, phrasesBase: 0 } },
    }
    vi.spyOn(loader, 'loadManifest').mockResolvedValue(manifest)
    useAppStore().setActiveTarget('es')
    const router = createAppRouter(createMemoryHistory())
    await router.push('/')
    const w = mount(MenuView, { global: { plugins: [pinia, router] } })
    await flushPromises()
    const buttons = w.findAll('[data-test="mode"]')
    expect(buttons).toHaveLength(4)
    expect(buttons.map((b) => b.attributes('disabled') !== undefined)).toEqual([
      false,
      false,
      true,
      true,
    ])
  })
})
