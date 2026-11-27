import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { App, Button, Card, Image, Input, Space, Typography } from 'antd'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, errorMessage } from '../api/client'
import { ErrorState, Money, PageSkeleton, StatusPill } from '../components/ui'
import { ResponsiveTable } from '../components/ui/ResponsiveTable'
import { useT } from '../i18n'

const REFRESH_MS = 60_000

interface Review {
  receipt_line_id: string; branch_name: string; name: string; name_si: string | null
  variant: string; image_url: string | null; base_price: string | null
  old_listed_price: string | null; old_selling_price: string | null
  listed_price: string; selling_price: string; below_cost: boolean
}

interface Expiring {
  today: string; expired: number; near: number
  items: {
    batch_id: string; batch_no: string; branch_name: string; name: string; name_si: string | null
    image_url: string | null; expiry_date: string; days_left: number; qty_on_hand: string
    labels_on_shelf: number; state: 'near' | 'expired'
  }[]
}

const thumb = (url: string | null) => url
  ? <Image src={url} width={40} height={40} style={{ objectFit: 'contain' }} preview={false} />
  : null

/** New shop prices of delivered batches, for the branch manager (owner 2026-11-27). */
export function PriceReviewsCard() {
  const { t, lang } = useT()
  const { message } = App.useApp()
  const qc = useQueryClient()
  const [typed, setTyped] = useState<Record<string, string>>({})
  const q = useQuery({
    queryKey: ['price-reviews'], refetchInterval: REFRESH_MS,
    queryFn: async () => (await api.get<Review[]>('/price-reviews')).data,
  })
  const save = useMutation({
    mutationFn: async (v: { id: string; price: string }) =>
      (await api.post(`/price-reviews/${v.id}`, { selling_price: v.price })).data,
    onSuccess: () => { message.success(t('pr.saved')); void qc.invalidateQueries({ queryKey: ['price-reviews'] }) },
    onError: (e) => message.error(errorMessage(e)),
  })
  if (q.isLoading) return <Card title={t('pr.title')}><PageSkeleton rows={2} /></Card>
  if (q.isError || !q.data) return <Card title={t('pr.title')}><ErrorState message={t('home.loadError')} onRetry={() => void q.refetch()} /></Card>
  if (!q.data.length) return null
  const name = (r: Review) => `${lang === 'si' && r.name_si ? r.name_si : r.name} ${r.variant}`.trim()
  const price = (r: Review) => typed[r.receipt_line_id] ?? r.selling_price
  const submit = (r: Review) => save.mutate({ id: r.receipt_line_id, price: price(r).replace(/,/g, '') })
  const box = (r: Review) => (
    <Space.Compact>
      <Input style={{ width: 110 }} value={price(r)} inputMode="decimal" aria-label={t('pr.selling')}
        onChange={(e) => setTyped((s) => ({ ...s, [r.receipt_line_id]: e.target.value }))} />
      <Button type="primary" loading={save.isPending} onClick={() => submit(r)}>{t('pr.submit')}</Button>
    </Space.Compact>
  )
  return (
    <Card title={`${t('pr.title')} (${q.data.length})`} styles={{ body: { padding: 16 } }}>
      <Typography.Paragraph type="secondary">{t('pr.hint')}</Typography.Paragraph>
      <ResponsiveTable rowKey="receipt_line_id" dataSource={q.data} size="small"
        pagination={{ pageSize: 8, hideOnSinglePage: true }}
        cardFields={[
          { label: t('home.product'), render: (r) => name(r) },
          { label: t('pr.paid'), render: (r) => <Money value={r.base_price} /> },
          { label: 'MRP', render: (r) => <><Money value={r.old_listed_price} muted /> → <Money value={r.listed_price} /></> },
          { label: t('pr.selling'), render: (r) => box(r) },
        ]}
        columns={[
          { title: '', width: 56, render: (_, r) => thumb(r.image_url) },
          { title: t('home.product'), render: (_, r) => (
            <div>{name(r)}<div className="muted-line">{r.branch_name}</div></div>) },
          { title: t('pr.paid'), align: 'right', render: (_, r) => <Money value={r.base_price} /> },
          { title: 'MRP', align: 'right', render: (_, r) => (
            <Space size={6}><Money value={r.old_listed_price} muted /><span aria-hidden>→</span><Money value={r.listed_price} /></Space>) },
          { title: t('pr.oldSelling'), align: 'right', render: (_, r) => <Money value={r.old_selling_price} muted /> },
          { title: t('pr.selling'), render: (_, r) => (
            <Space>{box(r)}{r.below_cost && <StatusPill tone="danger">{t('pr.belowCost')}</StatusPill>}</Space>) },
        ]} />
    </Card>
  )
}

/** Goods close to expiry, expired ones first (owner 2026-11-27). */
export function ExpiringCard() {
  const { t, lang } = useT()
  const q = useQuery({
    queryKey: ['stock-expiring'], refetchInterval: REFRESH_MS,
    queryFn: async () => (await api.get<Expiring>('/stock/expiring')).data,
  })
  if (q.isLoading) return <Card title={t('ex.title')}><PageSkeleton rows={2} /></Card>
  if (q.isError || !q.data) return <Card title={t('ex.title')}><ErrorState message={t('home.loadError')} onRetry={() => void q.refetch()} /></Card>
  const d = q.data
  const rows = [...d.items].sort((a, b) => a.days_left - b.days_left)
  const name = (r: Expiring['items'][number]) => lang === 'si' && r.name_si ? r.name_si : r.name
  const left = (r: Expiring['items'][number]) => r.state === 'expired'
    ? <StatusPill tone="danger">{t('ex.expired')}</StatusPill>
    : <StatusPill tone={r.days_left <= 7 ? 'danger' : 'warning'}>{t('ex.daysLeft').replace('{n}', String(r.days_left))}</StatusPill>
  return (
    <Card title={t('ex.title')} styles={{ body: { padding: 16 } }}
      extra={<Space><StatusPill tone="danger">{t('ex.expired')}: {d.expired}</StatusPill><StatusPill tone="warning">{t('ex.near')}: {d.near}</StatusPill></Space>}>
      <ResponsiveTable rowKey="batch_id" dataSource={rows} size="small"
        pagination={{ pageSize: 8, hideOnSinglePage: true }}
        locale={{ emptyText: <Typography.Text type="secondary">{t('ex.none')}</Typography.Text> }}
        cardFields={[
          { label: t('home.product'), render: (r) => name(r) },
          { label: t('ex.expiry'), render: (r) => <>{r.expiry_date} {left(r)}</> },
          { label: t('ex.qty'), render: (r) => r.qty_on_hand },
        ]}
        columns={[
          { title: '', width: 56, render: (_, r) => thumb(r.image_url) },
          { title: t('home.product'), render: (_, r) => (
            <div>{name(r)}<div className="muted-line">{r.batch_no} · {r.branch_name}</div></div>) },
          { title: t('ex.expiry'), render: (_, r) => <Space>{r.expiry_date}{left(r)}</Space> },
          { title: t('ex.qty'), align: 'right', dataIndex: 'qty_on_hand' },
          { title: t('ex.labels'), align: 'right', dataIndex: 'labels_on_shelf' },
        ]} />
      {d.expired > 0 && <Typography.Paragraph type="secondary" style={{ marginTop: 12, marginBottom: 0 }}>{t('ex.writeOff')}</Typography.Paragraph>}
    </Card>
  )
}

/** Goods kept aside without QR labels, waiting to be taken in (owner 2026-11-27). */
export function HeldCard() {
  const { t } = useT()
  const navigate = useNavigate()
  const q = useQuery({
    queryKey: ['held-summary'], refetchInterval: REFRESH_MS,
    queryFn: async () => (await api.get<{ lines: number; units: number; oldest_days: number }>('/stock/held/summary')).data,
  })
  if (!q.data || q.data.units <= 0) return null
  const d = q.data
  return (
    <Card title={t('hs.title')} styles={{ body: { padding: 16 } }}
      extra={<Button onClick={() => navigate('/held-stock')}>{t('hs.open')}</Button>}>
      <Space wrap size="large">
        <span>{t('hs.units')}: <b>{d.units}</b></span>
        <span>{t('hs.lines')}: <b>{d.lines}</b></span>
        <StatusPill tone={d.oldest_days >= 7 ? 'danger' : d.oldest_days >= 3 ? 'warning' : 'info'}>
          {t('hs.oldest')}: {t('hs.days').replace('{n}', String(d.oldest_days))}</StatusPill>
      </Space>
    </Card>
  )
}
