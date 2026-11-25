import { ConfigProvider } from 'antd'
import enGB from 'antd/locale/en_GB'
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { buildTheme, cssVars, type Mode } from './tokens'

export type Preference = 'system' | 'light' | 'dark'

interface ThemeState {
  preference: Preference
  mode: Mode
  setPreference: (p: Preference) => void
  /** system -> light -> dark -> system */
  cycle: () => void
}

const ThemeContext = createContext<ThemeState | null>(null)
const KEY = 'sb.theme'

function stored(): Preference {
  try {
    const v = localStorage.getItem(KEY)
    if (v === 'light' || v === 'dark' || v === 'system') return v
  } catch { /* private window or blocked storage */ }
  return 'system'
}

function systemMode(): Mode {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches
    ? 'dark' : 'light'
}

export function ThemeProvider({ children, locale = enGB }: { children: ReactNode; locale?: typeof enGB }) {
  const [preference, setPref] = useState<Preference>(stored)
  const [system, setSystem] = useState<Mode>(systemMode)

  useEffect(() => {
    const q = window.matchMedia?.('(prefers-color-scheme: dark)')
    if (!q) return
    const on = () => setSystem(q.matches ? 'dark' : 'light')
    q.addEventListener('change', on)
    return () => q.removeEventListener('change', on)
  }, [])

  const mode: Mode = preference === 'system' ? system : preference

  useEffect(() => {
    const root = document.documentElement
    root.dataset.theme = mode
    root.style.colorScheme = mode
    for (const [k, v] of Object.entries(cssVars(mode))) root.style.setProperty(k, v)
  }, [mode])

  const value = useMemo<ThemeState>(() => {
    const setPreference = (p: Preference) => {
      setPref(p)
      try { localStorage.setItem(KEY, p) } catch { /* not remembered */ }
    }
    const order: Preference[] = ['system', 'light', 'dark']
    return {
      preference, mode, setPreference,
      cycle: () => setPreference(order[(order.indexOf(preference) + 1) % order.length]),
    }
  }, [preference, mode])

  return (
    <ThemeContext.Provider value={value}>
      <ConfigProvider locale={locale} theme={buildTheme(mode)}>{children}</ConfigProvider>
    </ThemeContext.Provider>
  )
}

export function useTheme(): ThemeState {
  const v = useContext(ThemeContext)
  if (!v) throw new Error('useTheme outside ThemeProvider')
  return v
}
