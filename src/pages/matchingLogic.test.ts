import { describe, expect, it } from 'vitest'
import type { QueueItem } from '../api/types'
import { confidence, counts, fmt, nextAfter, visible } from './matchingLogic'

const item = (id: string, heading: string, matched = false): QueueItem => ({
  offer_id: id, heading, label: '1 kg', price: '100.00', mrp: null, units_per_box: null,
  confirmed: matched ? { online_product_id: 'p', online_variant_id: null, name: 'x', name_si: null,
    sku: null, size: null, score: null } : null,
  suggestions: [],
})
const LIST = [item('a', 'Sugar'), item('b', 'Rice', true), item('c', 'Dhal'), item('d', 'Salt')]

describe('matching logic', () => {
  it('confidence is a word with fixed edges', () => {
    expect(confidence(0.85)).toBe('high')
    expect(confidence(0.84)).toBe('medium')
    expect(confidence(0.6)).toBe('medium')
    expect(confidence(0.59)).toBe('low')
    expect(confidence(null)).toBeNull()
  })
  it('counts matched and to-match lines', () => {
    expect(counts(LIST)).toEqual({ total: 4, matched: 1, todo: 3 })
  })
  it('filters by state and by the typed text', () => {
    expect(visible(LIST, 'todo', '').map((i) => i.offer_id)).toEqual(['a', 'c', 'd'])
    expect(visible(LIST, 'matched', '').map((i) => i.offer_id)).toEqual(['b'])
    expect(visible(LIST, 'all', ' SA').map((i) => i.offer_id)).toEqual(['d'])
    expect(visible(LIST, 'all', 'kg').length).toBe(4) // the size label is searched too
  })
  it('moves on to the next line still to match, wrapping round', () => {
    expect(nextAfter(LIST, 'a')).toBe('c')
    expect(nextAfter(LIST, 'd')).toBe('a')
  })
  it('with nothing left to match it picks a neighbour, or nothing', () => {
    const done = [item('a', 'Sugar', true), item('b', 'Rice', true)]
    expect(nextAfter(done, 'a')).toBe('b')
    expect(nextAfter([item('a', 'Sugar')], 'a')).toBeUndefined()
  })
  it('fills the placeholders of a text', () => {
    expect(fmt('{done} of {total} matched', { done: 3, total: 9 })).toBe('3 of 9 matched')
  })
})
