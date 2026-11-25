import enGB from 'antd/locale/en_GB'
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { en, type TextKey } from './en'
import { si } from './si'

export type Lang = 'en' | 'si'
const KEY = 'sb.lang'
const TABLES: Record<Lang, Record<TextKey, string>> = { en, si }

interface LangState {
  lang: Lang
  setLang: (l: Lang) => void
  t: (key: TextKey) => string
}

const LangContext = createContext<LangState | null>(null)

function stored(): Lang {
  try {
    const v = localStorage.getItem(KEY)
    if (v === 'en' || v === 'si') return v
  } catch { /* blocked storage: English */ }
  return 'en'
}

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(stored)
  useEffect(() => { document.documentElement.lang = lang }, [lang])
  const value = useMemo<LangState>(() => ({
    lang,
    setLang: (l) => {
      setLangState(l)
      try { localStorage.setItem(KEY, l) } catch { /* not remembered */ }
    },
    t: (key) => TABLES[lang][key] ?? en[key] ?? key,
  }), [lang])
  return <LangContext.Provider value={value}>{children}</LangContext.Provider>
}

export function useT(): LangState {
  const v = useContext(LangContext)
  if (!v) throw new Error('useT outside LangProvider')
  return v
}

/** antd's own texts (pagination, empty, ...) follow the app language. Sinhala has no antd
 *  locale, so those stay English there; our own texts are all translated. */
export const antdLocale = enGB
