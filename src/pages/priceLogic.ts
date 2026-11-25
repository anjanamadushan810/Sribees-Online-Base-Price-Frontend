import type { HeldOffer } from '../api/types'

export type AgoUnit = 'now' | 'minutes' | 'hours' | 'days' | 'months'

/** How long ago, as a number and a unit, so each language words it its own way. */
export function ago(iso: string, now = Date.now()): { n: number; unit: AgoUnit } {
  const mins = Math.max(0, Math.floor((now - new Date(iso).getTime()) / 60000))
  if (mins < 2) return { n: 0, unit: 'now' }
  if (mins < 60) return { n: mins, unit: 'minutes' }
  if (mins < 60 * 24) return { n: Math.floor(mins / 60), unit: 'hours' }
  if (mins < 60 * 24 * 60) return { n: Math.floor(mins / (60 * 24)), unit: 'days' }
  return { n: Math.floor(mins / (60 * 24 * 30)), unit: 'months' }
}

/** The lowest price among offers (all offers at that price count as cheapest). */
export function cheapestPrice(offers: { price: string }[]): number | null {
  const prices = offers.map((o) => Number(o.price)).filter((n) => !Number.isNaN(n))
  return prices.length ? Math.min(...prices) : null
}

/** Newest first -> the price we agreed last, ignoring orders that were cancelled. */
export function currentBase<T extends { unit_price: string; recorded_at: string; voided_at: string | null }>(
  history: T[],
): T | undefined {
  return [...history].filter((h) => !h.voided_at)
    .sort((a, b) => b.recorded_at.localeCompare(a.recorded_at))[0]
}

/** An SVG polyline for the price over time (oldest on the left). Null for fewer than 2 points. */
export function sparkline(values: number[], width = 140, height = 36, pad = 4) {
  if (values.length < 2) return null
  const lo = Math.min(...values), hi = Math.max(...values)
  const span = hi - lo || 1
  const pts = values.map((v, i) => ({
    x: pad + (i * (width - 2 * pad)) / (values.length - 1),
    y: height - pad - ((v - lo) * (height - 2 * pad)) / span,
  }))
  return { path: pts.map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' '),
    last: pts[pts.length - 1], lo, hi }
}

export interface HeldGroup { supplier_id: string; supplier_name: string; rows: HeldOffer[] }

export function groupHeld(rows: HeldOffer[]): HeldGroup[] {
  const by = new Map<string, HeldGroup>()
  for (const r of rows) {
    const g = by.get(r.supplier_id) ?? { supplier_id: r.supplier_id, supplier_name: r.supplier_name, rows: [] }
    g.rows.push(r)
    by.set(r.supplier_id, g)
  }
  return [...by.values()].sort((a, b) => b.rows.length - a.rows.length || a.supplier_name.localeCompare(b.supplier_name))
}

/** The message to send a supplier about their held lines. The words come from `texts`. */
export function heldMessage(
  g: HeldGroup,
  texts: { hello: string; line: string; closing: string },
  fmtText: (text: string, values: Record<string, string | number>) => string,
  money: (v: string | null) => string,
): string {
  const lines = g.rows.map((r) => fmtText(texts.line, {
    item: `${r.heading} ${r.label}`.trim(), price: money(r.price), mrp: money(r.mrp),
  }))
  return [fmtText(texts.hello, { name: g.supplier_name }), ...lines, texts.closing].join('\n')
}
