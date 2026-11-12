import type { OrderStatus, Role } from './types'

export const ROLE_LABEL: Record<Role, string> = {
  owner: 'Owner',
  purchasing: 'Purchasing',
  branch_manager: 'Branch manager',
  accountant: 'Accountant',
}

export const ORDER_STATUS: Record<OrderStatus, { label: string; color: string }> = {
  draft: { label: 'Draft', color: 'default' },
  submitted: { label: 'Waiting approval', color: 'gold' },
  approved: { label: 'Sent to supplier', color: 'blue' },
  accepted: { label: 'Accepted', color: 'green' },
  declined: { label: 'Declined', color: 'red' },
  cancelled: { label: 'Cancelled', color: 'default' },
  received: { label: 'Received', color: 'purple' },
}

export const HELD_LABEL: Record<string, string> = {
  price_above_mrp: 'Held: our price above selling price',
}

export const FLAG_LABEL: Record<string, string> = {
  no_mrp: 'no selling price',
  no_box: 'no units per box',
  box_unclear: 'units per box unclear',
  bad_format: 'unexpected format',
  price_above_mrp: 'price above selling price',
}

export function when(value: string | null | undefined): string {
  if (!value) return '—'
  // Stored in UTC, shown in Colombo time.
  return new Date(value).toLocaleString('en-GB', {
    timeZone: 'Asia/Colombo', day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}
