import type { Catalog, Supplier } from '../api/types'

export interface CatalogStats { sections: number; lines: number; held: number; notForSale: number }

/** The numbers shown on the supplier's header and tab labels. */
export function catalogStats(c: Catalog | undefined): CatalogStats {
  const out: CatalogStats = { sections: 0, lines: 0, held: 0, notForSale: 0 }
  if (!c) return out
  out.sections = c.sections.length
  for (const s of c.sections) {
    for (const p of s.products) {
      for (const o of p.offers) {
        out.lines += 1
        if (o.held_reason) out.held += 1
        if (!o.is_active || !p.is_active) out.notForSale += 1
      }
    }
  }
  return out
}

/** Sri Lankan mobile -> international digits for a WhatsApp link: 0712345678 -> 94712345678. */
export function waNumber(phone: string | null | undefined): string | null {
  const d = (phone ?? '').replace(/\D/g, '')
  if (!d) return null
  if (d.startsWith('94') && d.length >= 11) return d
  if (d.startsWith('0') && d.length === 10) return `94${d.slice(1)}`
  return null
}

export function contactLinks(s: Pick<Supplier, 'phone' | 'email'>) {
  const wa = waNumber(s.phone)
  return {
    call: s.phone ? `tel:${s.phone.replace(/[^\d+]/g, '')}` : null,
    whatsapp: wa ? `https://wa.me/${wa}` : null,
    email: s.email ? `mailto:${s.email}` : null,
  }
}

/** The three steps of a price-list import, from what exists so far. */
export type ImportStep = 0 | 1 | 2
export const importStep = (hasPreview: boolean, done: boolean): ImportStep => (done ? 2 : hasPreview ? 1 : 0)
