import { useState } from 'react'

/** An Online product's main photo (owner 2026-11-26: easier to recognise than a name). */
export default function ProductPhoto({ url, size = 56 }: { url?: string | null; size?: number }) {
  const [broken, setBroken] = useState(false)
  const box = { width: size, height: size, flex: `0 0 ${size}px`, borderRadius: 8,
    border: '1px solid var(--sb-border)', background: 'var(--sb-surface)', objectFit: 'contain' as const }
  if (!url || broken) return <div style={{ ...box, background: 'var(--sb-surface-alt)' }} aria-hidden />
  return <img src={url} alt="" loading="lazy" style={box} onError={() => setBroken(true)} />
}
