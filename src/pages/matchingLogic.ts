import type { QueueItem } from '../api/types'

export type Filter = 'todo' | 'matched' | 'all'
export type Confidence = 'high' | 'medium' | 'low'

/** How sure we are, in words. The percent is shown too, but a word is what a person reads. */
export function confidence(score: number | null | undefined): Confidence | null {
  if (score === null || score === undefined || Number.isNaN(Number(score))) return null
  const s = Number(score)
  return s >= 0.85 ? 'high' : s >= 0.6 ? 'medium' : 'low'
}

export function counts(items: QueueItem[]) {
  const matched = items.filter((i) => i.confirmed).length
  return { total: items.length, matched, todo: items.length - matched }
}

/** Lines to show: the filter first, then the typed search over heading and label. */
export function visible(items: QueueItem[], filter: Filter, q: string): QueueItem[] {
  const needle = q.trim().toLowerCase()
  return items.filter((i) => {
    if (filter === 'todo' && i.confirmed) return false
    if (filter === 'matched' && !i.confirmed) return false
    return !needle || `${i.heading} ${i.label}`.toLowerCase().includes(needle)
  })
}

/** The line to move to after `offerId` is done: the next one still to match (looking
 *  forward, then wrapping to the top), or the neighbour when nothing is left to match. */
export function nextAfter(list: QueueItem[], offerId: string): string | undefined {
  const at = list.findIndex((i) => i.offer_id === offerId)
  const order = at < 0 ? list : [...list.slice(at + 1), ...list.slice(0, at)]
  const todo = order.find((i) => !i.confirmed && i.offer_id !== offerId)
  if (todo) return todo.offer_id
  return (list[at + 1] ?? list[at - 1])?.offer_id
}

/** "{done} of {total}" style texts: the order of words differs per language. */
export function fmt(text: string, values: Record<string, string | number>): string {
  return text.replace(/\{(\w+)\}/g, (m, k: string) => (k in values ? String(values[k]) : m))
}
