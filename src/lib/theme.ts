import type { Settings } from './storage'

export function applyTheme(
  pref: Settings['theme'],
  root: HTMLElement = document.documentElement,
): void {
  const dark =
    pref === 'dark' ||
    (pref === 'system' &&
      (globalThis.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false))
  root.dataset.theme = dark ? 'dark' : 'light'
}

/** Re-applies the system theme when the OS preference flips. Returns an unsubscribe function. */
export function watchSystemTheme(getPref: () => Settings['theme']): () => void {
  const media = globalThis.matchMedia?.('(prefers-color-scheme: dark)')
  if (!media) return () => {}
  const onChange = (): void => {
    if (getPref() === 'system') applyTheme('system')
  }
  media.addEventListener('change', onChange)
  return () => media.removeEventListener('change', onChange)
}
