import { afterEach, describe, expect, it, vi } from 'vitest'
import { applyTheme } from './theme'

const mockScheme = (dark: boolean) =>
  vi
    .spyOn(window, 'matchMedia')
    .mockImplementation(
      (query: string) =>
        ({ matches: dark && query.includes('dark'), media: query }) as MediaQueryList,
    )

afterEach(() => vi.restoreAllMocks())

describe('applyTheme', () => {
  it('applies an explicit theme', () => {
    applyTheme('dark')
    expect(document.documentElement.dataset.theme).toBe('dark')
    applyTheme('light')
    expect(document.documentElement.dataset.theme).toBe('light')
  })
  it('follows the system preference', () => {
    window.matchMedia ??= (() => ({ matches: false })) as unknown as typeof window.matchMedia
    mockScheme(true)
    applyTheme('system')
    expect(document.documentElement.dataset.theme).toBe('dark')
    mockScheme(false)
    applyTheme('system')
    expect(document.documentElement.dataset.theme).toBe('light')
  })
})
