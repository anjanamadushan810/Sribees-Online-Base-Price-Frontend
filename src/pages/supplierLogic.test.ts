import { describe, expect, it } from 'vitest'
import type { Catalog } from '../api/types'
import { catalogStats, contactLinks, importStep, waNumber } from './supplierLogic'

const offer = (id: string, extra: object = {}) => ({ offer_id: id, label: '1kg', price: '1', mrp: '2',
  units_per_box: 1, extra: [], is_active: true, held_reason: null, ...extra })
const CAT = { supplier_id: 's', supplier_name: 'S', header: '', footer: '', sections: [
  { section_id: 'a', title: 'Dry', notes: [], is_active: true, products: [
    { product_id: 'p1', heading: 'Rice', notes_before: [], notes_after: [], is_active: true,
      offers: [offer('1'), offer('2', { held_reason: 'price_above_mrp' })] },
    { product_id: 'p2', heading: 'Dhal', notes_before: [], notes_after: [], is_active: false,
      offers: [offer('3')] }] },
  { section_id: 'b', title: 'Wet', notes: [], is_active: true, products: [] }] } as unknown as Catalog

describe('supplier logic', () => {
  it('counts lines, held lines and lines not for sale', () => {
    expect(catalogStats(CAT)).toEqual({ sections: 2, lines: 3, held: 1, notForSale: 1 })
    expect(catalogStats(undefined).lines).toBe(0)
  })
  it('turns a Sri Lankan number into a WhatsApp number', () => {
    expect(waNumber('071 234 5678')).toBe('94712345678')
    expect(waNumber('+94712345678')).toBe('94712345678')
    expect(waNumber('0112345')).toBeNull()
    expect(waNumber(null)).toBeNull()
  })
  it('makes call, WhatsApp and email links only for what exists', () => {
    expect(contactLinks({ phone: '0712345678', email: null })).toEqual({
      call: 'tel:0712345678', whatsapp: 'https://wa.me/94712345678', email: null })
    expect(contactLinks({ phone: null, email: 'a@b.lk' }).email).toBe('mailto:a@b.lk')
  })
  it('import steps follow what the person has done', () => {
    expect([importStep(false, false), importStep(true, false), importStep(true, true)]).toEqual([0, 1, 2])
  })
})
