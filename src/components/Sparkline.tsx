import { sparkline } from '../pages/priceLogic'

/** A small line of how a price moved. The numbers are in the label for screen readers. */
export default function Sparkline({ values, label }: { values: number[]; label: string }) {
  const s = sparkline(values)
  if (!s) return null
  return (
    <svg width="140" height="36" viewBox="0 0 140 36" role="img" aria-label={label} className="spark">
      <path d={s.path} fill="none" stroke="var(--sb-primary)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={s.last.x} cy={s.last.y} r="3" fill="var(--sb-primary)" />
    </svg>
  )
}
