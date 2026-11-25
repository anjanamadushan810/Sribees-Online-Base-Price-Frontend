import { ArrowDownOutlined, ArrowUpOutlined, InboxOutlined, MinusOutlined,
  ReloadOutlined, WarningOutlined } from '@ant-design/icons'
import { Button, Card, Skeleton, Space, Table, Typography, Grid } from 'antd'
import type { TableProps } from 'antd'
import type { ReactNode } from 'react'
import { useT } from '../../i18n'
import { formatMoney } from '../../api/money'

/** ---- StatusPill: icon + word, tinted background. Never colour alone. -------------- */
export type Tone = 'success' | 'warning' | 'danger' | 'info' | 'neutral'

export function StatusPill({ tone, icon, children }: {
  tone: Tone; icon?: ReactNode; children: ReactNode
}) {
  return <span className={`pill pill-${tone}`}>{icon}{children}</span>
}

/** ---- Money: tabular, right-aligned by the caller's column, "Rs" prefix. ----------- */
/** `value` is the API's money string ("125.00"), never a number: formatMoney reads numbers as cents. */
export function Money({ value, muted }: { value: string | null | undefined; muted?: boolean }) {
  if (value === null || value === undefined || value === '') {
    return <span className="num" style={{ color: 'var(--sb-muted)' }}>—</span>
  }
  return (
    <span className="num" style={muted ? { color: 'var(--sb-muted)' } : undefined}>
      {formatMoney(value)}
    </span>
  )
}

/** ---- PriceChange: arrow + percent + a word for screen readers. -------------------- */
export function PriceChange({ from, to }: { from: string | number; to: string | number }) {
  const { t } = useT()
  const a = Number(from), b = Number(to)
  if (!a || Number.isNaN(a) || Number.isNaN(b)) return null
  const pct = ((b - a) / a) * 100
  if (Math.abs(pct) < 0.005) {
    return <StatusPill tone="neutral" icon={<MinusOutlined aria-hidden />}>{t('common.unchanged')}</StatusPill>
  }
  const up = pct > 0
  return (
    <StatusPill tone={up ? 'danger' : 'success'}
      icon={up ? <ArrowUpOutlined aria-hidden /> : <ArrowDownOutlined aria-hidden />}>
      <span className="sr-only">{up ? t('common.increase') : t('common.decrease')} </span>
      {Math.abs(pct).toFixed(1)}%
    </StatusPill>
  )
}

/** ---- StatCard: a number that leads somewhere. ------------------------------------- */
export function StatCard({ label, value, hint, tone = 'neutral', onClick }: {
  label: string; value: ReactNode; hint?: ReactNode; tone?: Tone; onClick?: () => void
}) {
  const body = (
    <>
      <Typography.Text type="secondary" className="stat-label">{label}</Typography.Text>
      <div className={`stat-value stat-${tone}`}>{value}</div>
      {hint && <Typography.Text type="secondary" className="stat-hint">{hint}</Typography.Text>}
    </>
  )
  return (
    <Card size="small" className={onClick ? 'stat-card stat-link' : 'stat-card'}
      styles={{ body: { padding: 16 } }}>
      {onClick
        ? <button type="button" className="stat-button" onClick={onClick}>{body}</button>
        : body}
    </Card>
  )
}

/** ---- EmptyState / ErrorState / LoadingBlock --------------------------------------- */
export function EmptyState({ title, action, icon }: {
  title?: string; action?: ReactNode; icon?: ReactNode
}) {
  const { t } = useT()
  return (
    <div className="state-block" role="status">
      <div className="state-icon" aria-hidden>{icon ?? <InboxOutlined />}</div>
      <Typography.Text>{title ?? t('common.empty')}</Typography.Text>
      {action && <div style={{ marginTop: 12 }}>{action}</div>}
    </div>
  )
}

export function ErrorState({ message, onRetry }: { message?: string; onRetry?: () => void }) {
  const { t } = useT()
  return (
    <div className="state-block" role="alert">
      <div className="state-icon state-icon-danger" aria-hidden><WarningOutlined /></div>
      <Typography.Text>{message ?? t('common.error')}</Typography.Text>
      {onRetry && (
        <div style={{ marginTop: 12 }}>
          <Button icon={<ReloadOutlined />} onClick={onRetry}>{t('common.retry')}</Button>
        </div>
      )}
    </div>
  )
}

/** A skeleton shaped like a page: a header line, then cards or rows. */
export function PageSkeleton({ rows = 6 }: { rows?: number }) {
  const { t } = useT()
  return (
    <div aria-busy="true" aria-label={t('common.loading')}>
      <Skeleton.Input active style={{ width: 240, height: 32, marginBottom: 20 }} />
      <Skeleton active paragraph={{ rows }} />
    </div>
  )
}

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
