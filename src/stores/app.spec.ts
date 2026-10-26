import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useAppStore } from './app'
import { log } from '@/lib/log'

beforeEach(() => {
  localStorage.clear()
  setActivePinia(createPinia())
  vi.spyOn(navigator, 'languages', 'get').mockReturnValue(['it-IT'])
  vi.spyOn(log, 'warn').mockImplementation(() => {})
})

describe('app store', () => {
  it('refuses the base language as a target', () => {
    const app = useAppStore()
    app.addTarget('it')
    expect(app.state.settings.targets).toEqual([])
  })
  it('adds and activates a target', () => {
    const app = useAppStore()
    app.addTarget('es')
    app.setActiveTarget('es')
    expect(app.activePair).toBe('it-es')
  })
  it('clears the active target when the base language becomes equal to it', () => {
    const app = useAppStore()
    app.addTarget('en')
    app.setActiveTarget('en')
    app.setBase('en')
    expect(app.state.settings.activeTarget).toBeNull()
    expect(app.state.settings.targets).not.toContain('en')
  })
  it('creates empty progress when committing the first round of a pair', () => {
    const app = useAppStore()
    app.commitRound('it-es', (p) => {
      p.points += 10
    })
    expect(app.state.progress['it-es']?.points).toBe(10)
  })
})
