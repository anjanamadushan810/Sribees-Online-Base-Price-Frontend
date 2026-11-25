import { useQuery } from '@tanstack/react-query'
import { Drawer, Input, Table, Typography } from 'antd'
import { useState } from 'react'
import { api } from '../api/client'
import { when } from '../api/lookups'
import type { BasePriceRow, ProductBasePrice } from '../api/types'
import PageHeader from '../components/PageHeader'
import Sparkline from '../components/Sparkline'
import { EmptyState, Money, PriceChange, StatusPill } from '../components/ui'
import { ResponsiveTable } from '../components/ui/ResponsiveTable'
import { useT } from '../i18n'
import { fmt } from './matchingLogic'
import { ago, cheapestPrice, currentBase } from './priceLogic'

/** Base price = what we actually agreed to pay (written when a supplier accepts an order). */
export default function BasePrices() {
  const { t } = useT()
  const [q, setQ] = useState('')
  const [open, setOpen] = useState<string>()
  const rows = useQuery({
    queryKey: ['base-prices'],
    queryFn: async () => (await api.get<BasePriceRow[]>('/base-prices')).data,
  })
  const data = rows.data?.filter((r) => !q || `${r.product_name} ${r.supplier_name}`.toLowerCase().includes(q.toLowerCase()))
  const since = (iso: string) => {
    const a = ago(iso)
    return <span title={when(iso)}>{a.unit === 'now' ? t('ago.now') : fmt(t(`ago.${a.unit}`), { n: a.n })}</span>
  }
  return (
    <>
      <PageHeader title={t('bp.title')} subtitle={t('bp.subtitle')} />
      <Input.Search allowClear placeholder={t('bp.search')} aria-label={t('bp.search')}
        style={{ maxWidth: 320, marginBottom: 12 }} onChange={(e) => setQ(e.target.value)} />
      <ResponsiveTable rowKey={(r) => `${r.online_product_id}:${r.online_variant_id ?? ''}`} loading={rows.isLoading}
        dataSource={data} locale={{ emptyText: <EmptyState title={t('bp.empty')} /> }}
        onCardClick={(r) => setOpen(r.online_product_id)}
        cardFields={[
          { label: t('bp.col.product'), render: (r) => r.product_name },
          { label: t('bp.col.base'), render: (r) => <Money value={r.unit_price} /> },
          { label: t('bp.col.sell'), render: (r) => <Money value={r.mrp} /> },
          { label: t('bp.col.supplier'), render: (r) => r.supplier_name },
          { label: t('bp.col.since'), render: (r) => since(r.recorded_at) },
        ]}
        onRow={(r) => ({ onClick: () => setOpen(r.online_product_id), style: { cursor: 'pointer' } })}
        columns={[
          { title: t('bp.col.product'), dataIndex: 'product_name' },
          { title: t('bp.col.base'), dataIndex: 'unit_price', align: 'right', render: (v: string) => <Money value={v} /> },
          { title: t('bp.col.sell'), dataIndex: 'mrp', align: 'right', render: (v: string | null) => <Money value={v} /> },
          { title: t('bp.col.supplier'), dataIndex: 'supplier_name', render: (v: string) => <StatusPill tone="neutral">{v}</StatusPill> },
          { title: t('bp.col.since'), dataIndex: 'recorded_at', render: since },
        ]} />
      {open && <ProductDrawer productId={open} onClose={() => setOpen(undefined)} />}
    </>
  )
}

function ProductDrawer({ productId, onClose }: { productId: string; onClose: () => void }) {
  const { t } = useT()
  const d = useQuery({
    queryKey: ['base-price', productId],
    queryFn: async () => (await api.get<ProductBasePrice>(`/base-prices/${productId}`)).data,
  })
  const base = d.data ? currentBase(d.data.history) : undefined
  const low = cheapestPrice(d.data?.offers ?? [])
  const offers = [...(d.data?.offers ?? [])].sort((a, b) => Number(a.price) - Number(b.price))
  const live = (d.data?.history ?? []).filter((h) => !h.voided_at)
    .sort((a, b) => a.recorded_at.localeCompare(b.recorded_at))
  const trend = live.map((h) => Number(h.unit_price))
  return (
    <Drawer open width={680} title={d.data?.name ?? '…'} onClose={onClose}>
      <Typography.Title level={5}>{t('bp.offers')}</Typography.Title>
      <Table size="small" rowKey="offer_id" pagination={false} dataSource={offers}
        locale={{ emptyText: t('bp.noOffers') }}
        columns={[
          { title: t('bp.col.supplier'), dataIndex: 'supplier_name' },
          { title: t('bp.line'), render: (_, o) => `${o.heading} ${o.label}` },
          { title: t('bp.price'), dataIndex: 'price', align: 'right', render: (v: string) => <Money value={v} /> },
          { title: t('bp.vsBase'), render: (_, o) => base
            ? <><PriceChange from={base.unit_price} to={o.price} />{' '}
              {low !== null && Number(o.price) === low && <StatusPill tone="success">{t('bp.cheapest')}</StatusPill>}</>
            : (low !== null && Number(o.price) === low ? <StatusPill tone="success">{t('bp.cheapest')}</StatusPill> : '—') },
          { title: t('bp.perBox'), dataIndex: 'units_per_box', align: 'right', render: (v) => v ?? '?' },
        ]} />
      <Typography.Title level={5} style={{ marginTop: 24 }}>{t('bp.paid')}</Typography.Title>
      {trend.length > 1 && (
        <div className="spark-row">
          <Sparkline values={trend} label={`${t('bp.trend')}: ${trend.join(', ')}`} />
          <span className="muted">{t('bp.trend')}</span>
        </div>
      )}
      <Table size="small" rowKey={(r) => `${r.order_id}:${r.recorded_at}`} pagination={false} dataSource={d.data?.history}
        columns={[
          { title: t('bp.when'), dataIndex: 'recorded_at', render: when },
          { title: t('bp.price'), dataIndex: 'unit_price', align: 'right', render: (v: string) => <Money value={v} /> },
          { title: '', render: (_, r) => r.voided_at && <StatusPill tone="neutral">{t('bp.cancelled')}</StatusPill> },
        ]} />
    </Drawer>
  )
}
