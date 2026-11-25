import { describe, expect, it } from 'vitest'
import type { Order } from '../api/types'
import { filterOrders, timeline, totals } from './orderLogic'

const O = (p: Partial<Order>): Order => ({
  order_id: 'o', order_no: 'SPO-000001', status: 'draft', branch_name: 'Matugama', goods_total: '100.00',
  delivery_charge: null, total: '100.00', supplier_note: null, approved_at: null, answered_at: null,
  cancel_reason: null, cancel_note: null, supplier_id: 's1', supplier_name: 'Nishi', branch_id: 'b1',
  note: null, created_at: '2026-11-20T04:00:00Z', submitted_at: null, supplier_seen_at: null, lines: [], ...p,
})

describe('timeline', () => {
  it('a new draft is at "created"... then "submitted" is the current step', () => {
    const t = timeline(O({}))
    expect(t.map((s) => s.state)).toEqual(['done', 'current', 'todo', 'todo', 'todo', 'todo'])
  })
  it('a sent order waits for the supplier to open it', () => {
    const t = timeline(O({ status: 'approved', submitted_at: 'x', approved_at: 'y' }))
    expect(t.find((s) => s.state === 'current')?.key).toBe('opened')
  })
  it('a declined order ends red at "answered" with no receiving step', () => {
    const t = timeline(O({ status: 'declined', submitted_at: 'x', approved_at: 'y', supplier_seen_at: 'z' }))
    expect(t.some((s) => s.key === 'received')).toBe(false)
    expect(t.find((s) => s.key === 'answered')?.state).toBe('bad')
  })
  it('a cancelled order keeps what happened and ends red', () => {
    const t = timeline(O({ status: 'cancelled', submitted_at: 'x' }))
    expect(t.map((s) => s.key)).toEqual(['created', 'submitted', 'cancelled'])
    expect(t[t.length - 1].state).toBe('bad')
  })
})

describe('filterOrders', () => {
  const rows = [
    O({ order_id: '1', order_no: 'SPO-000001', status: 'draft', created_at: '2026-11-20T04:00:00Z' }),
    O({ order_id: '2', order_no: 'SPO-000002', status: 'approved', supplier_id: 's2', supplier_name: 'Lanka',
      created_at: '2026-11-24T20:00:00Z' }), // 25 Nov 01:30 in Colombo
  ]
  it('filters by status, supplier and text', () => {
    expect(filterOrders(rows, { status: 'approved' }).map((o) => o.order_id)).toEqual(['2'])
    expect(filterOrders(rows, { supplier: 's1' }).map((o) => o.order_id)).toEqual(['1'])
    expect(filterOrders(rows, { q: 'lanka' }).map((o) => o.order_id)).toEqual(['2'])
  })
  it('dates are Colombo days, both ends included', () => {
    expect(filterOrders(rows, { from: '2026-11-25' }).map((o) => o.order_id)).toEqual(['2'])
    expect(filterOrders(rows, { to: '2026-11-20' }).map((o) => o.order_id)).toEqual(['1'])
  })
  it('totals add in cents', () => {
    expect(totals([O({ total: '0.10' }), O({ total: '0.20' })])).toEqual({ count: 2, total: 0.3 })
  })
})
