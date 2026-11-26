import { describe, expect, it } from 'vitest'
import { extraLine, goodsCents, problem, receiptLines, shortUnits, startEntry, type Entry, type FormLine } from './receiveLogic'

const line = (id: string, over: Partial<FormLine> = {}): FormLine => ({
  order_line_id: id, name: id, name_si: null, image_url: null, online_variant_id: `v-${id}`,
  pack_sizes: [], due_units: 100, unit_price: '200.00', mrp: null, by_weight: false,
  unit_weight_grams: 100,
  shop: { stock_mode: 'unit', stock_quantity: 5, stock_grams: 0, has_batches: false,
    listed_price: '250.00', selling_price: '240.00', visible: true },
  ...over,
})
const lines = [line('a'), line('b', { due_units: 60, unit_price: '400.00' })]
const entries = (a: Partial<Entry> = {}, b: Partial<Entry> = {}) => ({
  a: { ...startEntry(lines[0]), ...a }, b: { ...startEntry(lines[1]), ...b },
})

describe('receiving', () => {
  it('starts with nothing counted', () => {
    expect(problem(lines, entries(), '')).toEqual({ kind: 'nothing' })
    expect(receiptLines(lines, entries())).toEqual([])
  })

  it('sends only what came, and no shop price unless it was changed', () => {
    const e = entries({ units: 60 })
    expect(problem(lines, e, '4000')).toBeNull()
    expect(receiptLines(lines, e)).toEqual([expect.objectContaining({
      order_line_id: 'a', units: 60, unit_price: '200.00', listed_price: null, selling_price: null,
      weight_kg: null, product_id: 'v-a',
    })])
    expect(shortUnits(lines, e)).toBe(100)
    expect(goodsCents(lines, e)).toBe(1_200_000)
  })

  it('sends a changed shop price', () => {
    expect(receiptLines(lines, entries({ units: 1, selling_price: '230' }))[0])
      .toMatchObject({ listed_price: null, selling_price: '230' })
    expect(receiptLines(lines, entries({ units: 1, listed_price: '300' }))[0])
      .toMatchObject({ listed_price: '300', selling_price: '240.00' })
  })

  it.each([
    [{ units: 101 }, 'units'],
    [{ units: 1, unit_price: 'x' }, 'price'],
    [{ units: 1, selling_price: '260' }, 'sell'],
    [{ units: 1, product_id: null }, 'size'],
    [{ units: 1, labels: '123' }, 'label'],
  ] as const)('refuses %o', (a, kind) => {
    expect(problem(lines, entries(a), '')?.kind).toBe(kind)
  })

  it('wants kilograms for weighed goods and money for transport', () => {
    const rice = [line('a', { by_weight: true })]
    expect(problem(rice, entries({ units: 2 }), '')?.kind).toBe('weight')
    expect(problem(rice, entries({ units: 2, weight_kg: '50.2' }), '')).toBeNull()
    expect(problem(lines, entries({ units: 1 }), '-5')?.kind).toBe('transport')
  })
})

describe('a product that came without being ordered', () => {
  it('is sent by its pack size, never makes the order short, and keeps its bill price', () => {
    const extra = extraLine({ online_variant_id: 'v9', name: 'Honey', variant: '500g', name_si: null,
      image_url: null, weight_grams: 520, last_price: '450.00' })
    const entries = { v9: { ...startEntry(extra), units: 3 } }
    expect(receiptLines([extra], entries)).toMatchObject([
      { order_line_id: null, online_variant_id: 'v9', units: 3, unit_price: '450.00', product_id: null }])
    expect(shortUnits([extra], {})).toBe(0)
  })
})
