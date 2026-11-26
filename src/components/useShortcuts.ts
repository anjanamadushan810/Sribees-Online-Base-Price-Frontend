import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

const isTyping = (el: EventTarget | null) => {
  const n = el as HTMLElement | null
  return !!n && (['INPUT', 'TEXTAREA', 'SELECT'].includes(n.tagName) || n.isContentEditable)
}

/** `/` focuses the search box; `g` then `o` / `s` goes to Orders / Suppliers. */
export function useShortcuts(focusSearch: () => void, allowed: { o: boolean; s: boolean; m: boolean }) {
  const navigate = useNavigate()
  useEffect(() => {
    let armed = 0
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey || isTyping(e.target)) return
      if (e.key === '/') { e.preventDefault(); focusSearch(); return }
      if (e.key === 'g') { armed = Date.now(); return }
      if (Date.now() - armed < 1200) {
        const go = { o: '/orders', s: '/suppliers' } as const
        const k = e.key as keyof typeof go
        if (k in go && allowed[k]) { armed = 0; navigate(go[k]) }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [focusSearch, allowed, navigate])
}
