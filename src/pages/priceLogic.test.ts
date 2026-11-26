import { describe, expect, it } from 'vitest'
import type { HeldOffer } from '../api/types'
import { ago, cheapestPrice, currentBase, groupHeld, heldMessage, sparkline } from './priceLogic'
import { fmt } from './textFormat'

const NOW = new Date('2026-11-25T12:00:00Z').getTime()
const held = (id: string, sup: string, name: string, heading: string): HeldOffer => ({
  offer_id: id, supplier_id: sup, supplier_name: name, heading, label: '1kg', price: '330.00', mrp: '320.00',
  held_reason: 'price_above_mrp', updated_at: '2026-11-25T01:00:00Z' })

describe('price logic', () => {
  it('says how long ago in a number and a unit', () => {
    expect(ago('2026-11-25T11:59:30Z', NOW)).toEqual({ n: 0, unit: 'now' })
    expect(ago('2026-11-25T11:20:00Z', NOW)).toEqual({ n: 40, unit: 'minutes' })
    expect(ago('2026-11-25T07:00:00Z', NOW)).toEqual({ n: 5, unit: 'hours' })
    expect(ago('2026-11-22T12:00:00Z', NOW)).toEqual({ n: 3, unit: 'days' })
    expect(ago('2026-08-25T12:00:00Z', NOW)).toEqual({ n: 3, unit: 'months' })
  })
  it('finds the lowest offer price', () => {
    expect(cheapestPrice([{ price: '120.00' }, { price: '99.50' }, { price: '101' }])).toBe(99.5)
    expect(cheapestPrice([])).toBeNull()
  })
  it('the base price is the newest one that was not cancelled', () => {
    const h = [
      { unit_price: '100', recorded_at: '2026-11-01T00:00:00Z', voided_at: null },
      { unit_price: '90', recorded_at: '2026-11-20T00:00:00Z', voided_at: '2026-11-21T00:00:00Z' },
      { unit_price: '95', recorded_at: '2026-11-10T00:00:00Z', voided_at: null },
    ]
    expect(currentBase(h)?.unit_price).toBe('95')
  })
  it('a sparkline needs two points and puts the lowest value at the bottom', () => {
    expect(sparkline([5])).toBeNull()
    const s = sparkline([10, 20], 100, 40, 0)!
    expect(s.path).toBe('M0.0 40.0 L100.0 0.0')
  })
  it('groups held lines by supplier, the longest group first', () => {
    const g = groupHeld([held('1', 's1', 'A', 'Rice'), held('2', 's2', 'B', 'Dhal'), held('3', 's2', 'B', 'Salt')])
    expect(g.map((x) => [x.supplier_name, x.rows.length])).toEqual([['B', 2], ['A', 1]])
  })
  it('builds the message to the supplier', () => {
    const [g] = groupHeld([held('1', 's1', 'Nishi', 'Rice')])
    const m = heldMessage(g, { hello: 'Hello {name},', line: '- {item}: {price} (selling {mrp})', closing: 'Thanks' },
      fmt, (v) => v ?? '-')
    expect(m).toBe('Hello Nishi,\n- Rice 1kg: 330.00 (selling 320.00)\nThanks')
  })
})
