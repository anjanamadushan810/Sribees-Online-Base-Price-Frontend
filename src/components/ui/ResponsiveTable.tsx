import { Card, Grid, Space, Table } from 'antd'
import type { TableProps } from 'antd'
import type { ReactNode } from 'react'
import { EmptyState, PageSkeleton } from './index'

// Kept out of ./index so the app shell does not carry antd's Table before a page needs it.
/** ---- ResponsiveTable: a table on a wide screen, cards on a phone. ----------------- */
export interface CardField<T> { label: string; render: (row: T) => ReactNode }

export function ResponsiveTable<T extends object>(props: TableProps<T> & {
  /** What a phone card shows: the first field is its title. */
  cardFields: CardField<T>[]
  onCardClick?: (row: T) => void
}) {
  const { cardFields, onCardClick, ...table } = props
  const screens = Grid.useBreakpoint()
  const rows = (table.dataSource ?? []) as readonly T[]
  const key = table.rowKey
  const rowKey = (r: T, i: number) =>
    typeof key === 'function' ? String(key(r)) : key ? String((r as Record<string, unknown>)[key as string]) : String(i)

  if (screens.md === false) {
    if (table.loading) return <PageSkeleton rows={4} />
    if (!rows.length) return table.locale?.emptyText ? <>{table.locale.emptyText}</> : <EmptyState />
    return (
      <Space direction="vertical" size={8} style={{ width: '100%' }}>
        {rows.map((r, i) => (
          <Card key={rowKey(r, i)} size="small" hoverable={!!onCardClick}
            onClick={onCardClick ? () => onCardClick(r) : undefined}>
            {cardFields.map((f, n) => (
              <div key={f.label} className={n === 0 ? 'card-title' : 'card-row'}>
                {n === 0 ? f.render(r) : (<><span className="card-label">{f.label}</span><span>{f.render(r)}</span></>)}
              </div>
            ))}
          </Card>
        ))}
      </Space>
    )
  }
  return <Table<T> {...(table as TableProps<T>)} scroll={{ x: 'max-content', ...table.scroll }} />
}
