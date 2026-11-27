// The receiving page's rules, apart from React so they can be tested.
import { isValidAmount, toCents } from '../api/money'
import { labelLooksValid } from './labelLogic'

export interface Shop {
  stock_mode: string | null; stock_quantity: number | null; stock_grams: number | null
  has_batches: boolean | null; listed_price: string | null; selling_price: string | null
  visible: boolean | null
}

export interface FormLine {
  order_line_id: string; name: string; name_si: string | null; image_url: string | null
  online_variant_id: string | null; pack_sizes: { online_variant_id: string; name: string }[]
  due_units: number; unit_price: string; mrp: string | null; by_weight: boolean
  unit_weight_grams: number | null; shop: Shop | null
  /** came without being ordered (owner 2026-11-26): keyed by its pack size id */
  extra?: boolean
}

/** A product we already sell that came without being ordered (only existing products:
 *  the super admin adds new ones on Online). */
export function extraLine(item: { online_variant_id: string; name: string; variant: string
  name_si: string | null; image_url?: string | null; weight_grams: number | null; last_price?: string | null }): FormLine {
  return {
    order_line_id: item.online_variant_id, name: `${item.name} ${item.variant}`.trim(),
    name_si: item.name_si, image_url: item.image_url ?? null, online_variant_id: item.online_variant_id,
    pack_sizes: [], due_units: 1_000_000, unit_price: item.last_price ?? '', mrp: null,
    by_weight: false, unit_weight_grams: item.weight_grams, shop: null, extra: true,
  }
}

export interface ReceivingForm {
  order_id: string; order_no: string; status: string; supplier_name: string; branch_name: string
  transport_charge: string; transport_cap_pct: number; labels_required: boolean
  online_stock_in: boolean; online_error: string | null; lines: FormLine[]
}

/** What staff typed for one part of a line. `units` starts empty: they count what really
 *  came. Owner 2026-11-27: one ordered product may come in parts with their own price, MRP
 *  and expiry (30 + 18 of 48); every part becomes its own batch. */
export interface Entry {
  units: number | null; free_units: number; unit_price: string; weight_kg: string
  expiry: string | null; labels: string; selling_price: string; listed_price: string
  product_id: string | null; mrp: string
}

/** The parts typed per order line (most lines have one). */
export type Parts = Record<string, Entry[]>

export const startEntry = (l: FormLine): Entry => ({
  units: null, free_units: 0, unit_price: l.unit_price, weight_kg: '', expiry: null, labels: '',
  selling_price: l.shop?.selling_price ?? '', listed_price: l.shop?.listed_price ?? '',
  product_id: l.online_variant_id, mrp: l.mrp ?? '',
})

/** A new part of a line: what is still due after the other parts, the same pack size and
 *  shop prices; price, MRP and expiry are typed again (they are why it is a new part). */
export function nextPart(l: FormLine, parts: Entry[]): Entry {
  const left = Math.max(l.due_units - partUnits(parts), 0)
  const first = parts[0]
  return { ...startEntry(l), units: left || null, product_id: first?.product_id ?? l.online_variant_id }
}

const MAX_UNITS = 1_000_000

/** Units that came above what was ordered (owner 2026-11-27: taken, after a confirm). */
export function overUnits(lines: FormLine[], parts: Parts): { line: FormLine; over: number }[] {
  return lines.filter((l) => !l.extra)
    .map((line) => ({ line, over: partUnits(parts[line.order_line_id]) - line.due_units }))
    .filter((x) => x.over > 0)
}

export const partUnits = (parts: Entry[] | undefined): number =>
  (parts ?? []).reduce((n, e) => n + (e.units ?? 0), 0)

export const labelNumbers = (text: string): string[] => text.split(/[\s,]+/).filter(Boolean)

export type Problem = 'nothing' | 'units' | 'price' | 'weight' | 'size' | 'sell' | 'label' | 'transport' | 'expiry' | 'mrp'

/** The first thing to fix before the receipt can be sent; the server checks everything again. */
export function problem(lines: FormLine[], parts: Parts, transport: string):
{ kind: Problem; line?: FormLine; part?: number } | null {
  if (transport.trim() !== '' && !isValidAmount(transport)) return { kind: 'transport' }
  let any = false
  for (const line of lines) {
    const list = parts[line.order_line_id] ?? []
    // owner 2026-11-27: more than ordered may come; the page asks staff to confirm it
    for (const [i, e] of list.entries()) {
      if (!e.units) continue // nothing of this part came
      any = true
      const at = { line, part: list.length > 1 ? i + 1 : undefined }
      if (!Number.isInteger(e.units) || e.units < 0 || e.units > MAX_UNITS) return { kind: 'units', ...at }
      if (!isValidAmount(e.unit_price)) return { kind: 'price', ...at }
      if (!e.product_id) return { kind: 'size', ...at }
      if (line.by_weight && !(Number(e.weight_kg) > 0)) return { kind: 'weight', ...at }
      if (e.mrp.trim() && !(isValidAmount(e.mrp) && toCents(e.mrp) > 0)) return { kind: 'mrp', ...at }
      const sell = e.selling_price.trim(); const listed = e.listed_price.trim()
      if ((sell && !isValidAmount(sell)) || (listed && !isValidAmount(listed))) return { kind: 'sell', ...at }
      if (sell && listed && toCents(sell) > toCents(listed)) return { kind: 'sell', ...at }
      if (labelNumbers(e.labels).some((n) => !labelLooksValid(n))) return { kind: 'label', ...at }
      // expiry is required on every part (owner 2026-11-27)
      if (!e.expiry) return { kind: 'expiry', ...at }
    }
  }
  return any ? null : { kind: 'nothing' }
}

/** A shop price is sent only when staff changed it: otherwise Online keeps its own. */
function changed(typed: string, now: string | null | undefined): string | null {
  const v = typed.trim()
  if (!v || !isValidAmount(v)) return null
  return now != null && toCents(v) === toCents(now) ? null : v.replace(/,/g, '')
}

/** Every part that came, in page order, with the line it belongs to (the preview's rows
 *  come back in this same order). */
export function cameParts(lines: FormLine[], parts: Parts): { line: FormLine; part: number; entry: Entry }[] {
  return lines.flatMap((line) => (parts[line.order_line_id] ?? [])
    .map((entry, part) => ({ line, part, entry }))
    .filter((x) => !!x.entry.units))
}

export function receiptLines(lines: FormLine[], parts: Parts) {
  return cameParts(lines, parts).map(({ line, entry: e }) => {
    const listed = changed(e.listed_price, line.shop?.listed_price)
    let selling = changed(e.selling_price, line.shop?.selling_price)
    // a new listed price alone must not leave the old selling price above it
    if (listed && !selling && e.selling_price.trim()) selling = e.selling_price.trim().replace(/,/g, '')
    const mrp = e.mrp.trim().replace(/,/g, '')
    return {
      order_line_id: line.extra ? null : line.order_line_id,
      online_variant_id: line.extra ? line.online_variant_id : null,
      units: e.units as number, free_units: e.free_units,
      unit_price: e.unit_price.replace(/,/g, ''),
      weight_kg: line.by_weight ? e.weight_kg : null,
      expiry_date: e.expiry, product_id: line.extra ? null : e.product_id, labels: labelNumbers(e.labels),
      listed_price: listed, selling_price: selling, mrp: mrp || null,
    }
  })
}

/** Units ordered and not coming: the order closes with them still missing. */
export function shortUnits(lines: FormLine[], parts: Parts): number {
  return lines.reduce((n, l) => l.extra ? n
    : n + Math.max(l.due_units - partUnits(parts[l.order_line_id]), 0), 0)
}

export function goodsCents(lines: FormLine[], parts: Parts): number {
  return cameParts(lines, parts).reduce((sum, { entry: e }) =>
    isValidAmount(e.unit_price) ? sum + toCents(e.unit_price) * (e.units as number) : sum, 0)
}

export const canReceive = (status: string): boolean => status === 'accepted' || status === 'approved'
