import type { Order, OrderStatus } from '../api/types'
import type { Tone } from '../components/ui'

export const STATUS_TONE: Record<OrderStatus, Tone> = {
  draft: 'neutral', submitted: 'warning', approved: 'info', accepted: 'success',
  declined: 'danger', cancelled: 'neutral', received: 'success',
}

export type StepKey = 'created' | 'submitted' | 'sent' | 'opened' | 'answered' | 'received' | 'cancelled'
export interface Step { key: StepKey; at: string | null; state: 'done' | 'current' | 'todo' | 'bad' }

/** The order's road in order. A step is done when its time is known; the first one that is
 *  not done is the current one. A cancelled or declined order ends in a red step. */
export function timeline(o: Order): Step[] {
  const base: [StepKey, string | null][] = [
    ['created', o.created_at], ['submitted', o.submitted_at], ['sent', o.approved_at],
    ['opened', o.supplier_seen_at], ['answered', o.answered_at],
    ['received', o.status === 'received' ? (o.answered_at ?? o.created_at) : null],
  ]
  const steps: Step[] = base.map(([key, at]) => ({ key, at, state: at ? 'done' : 'todo' }))
  if (o.status === 'cancelled') {
    return [...steps.filter((s) => s.state === 'done'), { key: 'cancelled', at: null, state: 'bad' }]
  }
  if (o.status === 'declined') {
    return steps.filter((s) => s.key !== 'received').map((s) =>
      s.key === 'answered' ? { ...s, state: 'bad' as const } : s)
  }
  const firstTodo = steps.findIndex((s) => s.state === 'todo')
  if (firstTodo >= 0) steps[firstTodo] = { ...steps[firstTodo], state: 'current' }
  return steps
}

export interface OrderFilter { status?: OrderStatus; supplier?: string; branch?: string
  from?: string; to?: string; q?: string }

/** Dates are YYYY-MM-DD in Colombo time, both ends included. */
const colomboDay = (iso: string) =>
  new Date(iso).toLocaleDateString('en-CA', { timeZone: 'Asia/Colombo' })

export function filterOrders(rows: Order[], f: OrderFilter): Order[] {
  const needle = (f.q ?? '').trim().toLowerCase()
  return rows.filter((o) => {
    if (f.status && o.status !== f.status) return false
    if (f.supplier && o.supplier_id !== f.supplier) return false
    if (f.branch && o.branch_id !== f.branch) return false
    const day = colomboDay(o.created_at)
    if (f.from && day < f.from) return false
    if (f.to && day > f.to) return false
    return !needle || `${o.order_no} ${o.supplier_name} ${o.branch_name}`.toLowerCase().includes(needle)
  })
}

export function totals(rows: Order[]): { count: number; total: number } {
  return { count: rows.length, total: rows.reduce((a, o) => a + Math.round(Number(o.total) * 100), 0) / 100 }
}

/** What the main button will cause: the order is sent for approval, or approved and sent. */
export function consequence(status: OrderStatus): 'submit' | 'approve' | null {
  return status === 'draft' ? 'submit' : status === 'submitted' ? 'approve' : null
}
