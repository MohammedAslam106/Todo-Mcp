import { useSyncExternalStore } from 'react'

// Light/dark/system theme. The initial `.dark` class is applied before first paint by the
// inline script in `client/index.html` (same storage key), so there's no flash on load.

export type Theme = 'light' | 'dark' | 'system'

const STORAGE_KEY = 'theme'
const listeners = new Set<() => void>()

function readTheme(): Theme {
  try {
    const value = localStorage.getItem(STORAGE_KEY)
    return value === 'light' || value === 'dark' ? value : 'system'
  } catch {
    return 'system'
  }
}

function systemPrefersDark() {
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

function apply(theme: Theme) {
  const dark = theme === 'dark' || (theme === 'system' && systemPrefersDark())
  document.documentElement.classList.toggle('dark', dark)
  document.documentElement.style.colorScheme = dark ? 'dark' : 'light'
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  const media = window.matchMedia('(prefers-color-scheme: dark)')
  const onSystemChange = () => {
    if (readTheme() === 'system') apply('system')
    listener()
  }
  media.addEventListener('change', onSystemChange)
  return () => {
    listeners.delete(listener)
    media.removeEventListener('change', onSystemChange)
  }
}

export function setTheme(theme: Theme) {
  try {
    if (theme === 'system') localStorage.removeItem(STORAGE_KEY)
    else localStorage.setItem(STORAGE_KEY, theme)
  } catch {
    // Storage unavailable (private mode): the choice just won't persist.
  }
  apply(theme)
  listeners.forEach((listener) => listener())
}

export function useTheme() {
  const theme = useSyncExternalStore(subscribe, readTheme, () => 'system' as Theme)
  const resolvedTheme = useSyncExternalStore(
    subscribe,
    () => (document.documentElement.classList.contains('dark') ? 'dark' : 'light'),
    () => 'light' as const,
  )
  return { theme, resolvedTheme, setTheme }
}
