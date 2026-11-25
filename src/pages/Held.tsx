import { CopyOutlined } from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import { Alert, App, Button, Card, Space, Typography } from 'antd'
import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import { when } from '../api/lookups'
import { formatMoney } from '../api/money'
import type { HeldOffer } from '../api/types'
import PageHeader from '../components/PageHeader'
import { EmptyState, ErrorState, Money, PageSkeleton, StatusPill } from '../components/ui'
import { ResponsiveTable } from '../components/ui/ResponsiveTable'
import { useT } from '../i18n'
import type { TextKey } from '../i18n/en'
import { fmt } from './matchingLogic'
import { groupHeld, heldMessage } from './priceLogic'

/** Price lines held back: not shared, not orderable, until the supplier fixes them. */
export default function Held() {
  const { t } = useT()
  const { message } = App.useApp()
  const navigate = useNavigate()
  const rows = useQuery({
    queryKey: ['held'],
    queryFn: async () => (await api.get<HeldOffer[]>('/held-offers')).data,
  })
  const groups = useMemo(() => groupHeld(rows.data ?? []), [rows.data])
  const reason = (r: string) => (`held.reason.${r}` in TEXT_KEYS ? t(`held.reason.${r}` as TextKey) : r)
  const fix = (r: string) => (`held.fix.${r}` in TEXT_KEYS ? t(`held.fix.${r}` as TextKey) : '')
  const copy = async (g: ReturnType<typeof groupHeld>[number]) => {
    const text = heldMessage(g,
      { hello: t('held.msg.hello'), line: t('held.msg.line'), closing: t('held.msg.closing') },
      fmt, (v) => (v === null ? '—' : formatMoney(v)))
    try {
      await navigator.clipboard.writeText(text)
      message.success(t('held.copied'))
    } catch {
      message.error(text) // no clipboard permission: show it so it can be copied by hand
    }
  }
  return (
    <>
      <PageHeader title={t('held.title')} subtitle={t('held.subtitle')} />
      <Alert showIcon type="info" style={{ marginBottom: 16 }} message={t('held.intro')} />
      {rows.isLoading ? <PageSkeleton rows={5} />
        : rows.isError ? <ErrorState onRetry={() => void rows.refetch()} />
        : groups.length === 0 ? <EmptyState title={t('held.empty')} />
        : groups.map((g) => (
          <Card key={g.supplier_id} size="small" style={{ marginBottom: 16 }}
            title={<Space wrap><b>{g.supplier_name}</b>
              <StatusPill tone="warning">{fmt(t('held.lines'), { n: g.rows.length })}</StatusPill></Space>}
            extra={<Space wrap>
              <Button size="small" onClick={() => navigate(`/suppliers/${g.supplier_id}`)}>{t('held.open')}</Button>
              <Button size="small" type="primary" icon={<CopyOutlined />} onClick={() => void copy(g)}>{t('held.copy')}</Button>
            </Space>}>
            {[...new Set(g.rows.map((r) => r.held_reason))].map((r) => (
              <Typography.Paragraph key={r} type="secondary" style={{ marginBottom: 8 }}>
                <b>{reason(r)}.</b> {fix(r)}
              </Typography.Paragraph>
            ))}
            <ResponsiveTable rowKey="offer_id" dataSource={g.rows} pagination={false}
              onCardClick={() => navigate(`/suppliers/${g.supplier_id}`)}
              cardFields={[
                { label: t('held.col.item'), render: (r) => `${r.heading} ${r.label}` },
                { label: t('held.col.ours'), render: (r) => <Money value={r.price} /> },
                { label: t('held.col.sell'), render: (r) => <Money value={r.mrp} /> },
                { label: t('held.col.since'), render: (r) => when(r.updated_at) },
              ]}
              columns={[
                { title: t('held.col.item'), render: (_, r) => `${r.heading} ${r.label}` },
                { title: t('held.col.ours'), dataIndex: 'price', align: 'right', render: (v: string) => <Money value={v} /> },
                { title: t('held.col.sell'), dataIndex: 'mrp', align: 'right', render: (v: string | null) => <Money value={v} /> },
                { title: t('held.col.why'), dataIndex: 'held_reason', render: (v: string) => <StatusPill tone="danger">{reason(v)}</StatusPill> },
                { title: t('held.col.since'), dataIndex: 'updated_at', render: when },
              ]} />
          </Card>
        ))}
    </>
  )
}

/** Which reasons have their own words (the rest show the code as it is). */
const TEXT_KEYS: Record<string, true> = { 'held.reason.price_above_mrp': true, 'held.fix.price_above_mrp': true }
