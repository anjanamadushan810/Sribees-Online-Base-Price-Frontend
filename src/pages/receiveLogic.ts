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

/** What staff typed for one line. `units` starts empty: they count what really came. */
export interface Entry {
  units: number | null; free_units: number; unit_price: string; weight_kg: string
  expiry: string | null; labels: string; selling_price: string; listed_price: string
  product_id: string | null
}

export const startEntry = (l: FormLine): Entry => ({
  units: null, free_units: 0, unit_price: l.unit_price, weight_kg: '', expiry: null, labels: '',
  selling_price: l.shop?.selling_price ?? '', listed_price: l.shop?.listed_price ?? '',
  product_id: l.online_variant_id,
})

export const labelNumbers = (text: string): string[] => text.split(/[\s,]+/).filter(Boolean)

export type Problem = 'nothing' | 'units' | 'price' | 'weight' | 'size' | 'sell' | 'label' | 'transport' | 'expiry'

/** The first thing to fix before the receipt can be sent; the server checks everything again. */
export function problem(lines: FormLine[], entries: Record<string, Entry>, transport: string):
{ kind: Problem; line?: FormLine } | null {
  if (transport.trim() !== '' && !isValidAmount(transport)) return { kind: 'transport' }
  let any = false
  for (const line of lines) {
    const e = entries[line.order_line_id]
    if (!e || !e.units) continue // nothing of this line came
    any = true
    if (!Number.isInteger(e.units) || e.units < 0 || e.units > line.due_units) return { kind: 'units', line }
    if (!isValidAmount(e.unit_price)) return { kind: 'price', line }
    if (!e.product_id) return { kind: 'size', line }
    if (line.by_weight && !(Number(e.weight_kg) > 0)) return { kind: 'weight', line }
    const sell = e.selling_price.trim(); const listed = e.listed_price.trim()
    if ((sell && !isValidAmount(sell)) || (listed && !isValidAmount(listed))) return { kind: 'sell', line }
    if (sell && listed && toCents(sell) > toCents(listed)) return { kind: 'sell', line }
    if (labelNumbers(e.labels).some((n) => !labelLooksValid(n))) return { kind: 'label', line }
    // expiry is required on every line (owner 2026-11-27)
    if (!e.expiry) return { kind: 'expiry', line }
  }
  return any ? null : { kind: 'nothing' }
}

/** A shop price is sent only when staff changed it: otherwise Online keeps its own. */
function changed(typed: string, now: string | null | undefined): string | null {
  const v = typed.trim()
  if (!v || !isValidAmount(v)) return null
  return now != null && toCents(v) === toCents(now) ? null : v.replace(/,/g, '')
}

export function receiptLines(lines: FormLine[], entries: Record<string, Entry>) {
  return lines.flatMap((line) => {
    const e = entries[line.order_line_id]
    if (!e || !e.units) return []
    const listed = changed(e.listed_price, line.shop?.listed_price)
    let selling = changed(e.selling_price, line.shop?.selling_price)
    // a new listed price alone must not leave the old selling price above it
    if (listed && !selling && e.selling_price.trim()) selling = e.selling_price.trim().replace(/,/g, '')
    return [{
      order_line_id: line.extra ? null : line.order_line_id,
      online_variant_id: line.extra ? line.online_variant_id : null,
      units: e.units, free_units: e.free_units,
      unit_price: e.unit_price.replace(/,/g, ''),
      weight_kg: line.by_weight ? e.weight_kg : null,
      expiry_date: e.expiry, product_id: line.extra ? null : e.product_id, labels: labelNumbers(e.labels),
      listed_price: listed, selling_price: selling,
    }]
  })
}

/** Units ordered and not coming: the order closes with them still missing. */
export function shortUnits(lines: FormLine[], entries: Record<string, Entry>): number {
  return lines.reduce((n, l) => l.extra ? n
    : n + Math.max(l.due_units - (entries[l.order_line_id]?.units ?? 0), 0), 0)
}

export function goodsCents(lines: FormLine[], entries: Record<string, Entry>): number {
  return lines.reduce((sum, l) => {
    const e = entries[l.order_line_id]
    return e?.units && isValidAmount(e.unit_price) ? sum + toCents(e.unit_price) * e.units : sum
  }, 0)
}

export const canReceive = (status: string): boolean => status === 'accepted' || status === 'approved'
