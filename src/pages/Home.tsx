import { ArrowRightOutlined, CheckCircleFilled } from '@ant-design/icons'
import { useQuery, type UseQueryResult } from '@tanstack/react-query'
import { Button, Card, Col, Row, Space, Switch, Typography } from 'antd'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import { when } from '../api/lookups'
import type { BasePriceInsight, OrdersSummary, PriceChanges, TodayOut, TodayRow } from '../api/types'
import { useAuth } from '../auth/AuthContext'
import PageHeader from '../components/PageHeader'
import { ErrorState, Money, PageSkeleton, PriceChange, StatCard, StatusPill } from '../components/ui'
import { ResponsiveTable } from '../components/ui/ResponsiveTable'
import { useT } from '../i18n'
import type { TextKey } from '../i18n/en'

const REFRESH_MS = 60_000

function useDash<T>(path: string, enabled: boolean, params?: Record<string, unknown>) {
  return useQuery({
    queryKey: ['dashboard', path, params], enabled, refetchInterval: REFRESH_MS,
    queryFn: async () => (await api.get<T>(`/dashboard/${path}`, { params })).data,
  })
}

export default function Home() {
  const { me, can } = useAuth()
  const { t } = useT()
  const today = useDash<TodayOut>('today', can('suppliers.read'))
  const summary = useDash<OrdersSummary>('orders-summary', can('orders.read'))
  const changes = useDash<PriceChanges>('price-changes', can('suppliers.read'), { days: 7 })
  const insight = useDash<BasePriceInsight>('base-price-insight', can('base_prices.read'))

  return (
    <>
      <PageHeader title={t('home.title')}
        subtitle={`${t('home.hello')}, ${me?.full_name.split(' ')[0] ?? ''}`} />
      <Space direction="vertical" size={16} style={{ width: '100%' }}>
        <TodayCard q={today} />
        {can('orders.read') && <OrdersCard q={summary} />}
        <Row gutter={[16, 16]}>
          <Col xs={24} xl={12}><ChangesCard q={changes} /></Col>
          <Col xs={24} xl={12}><InsightCard q={insight} /></Col>
        </Row>
      </Space>
    </>
  )
}

type Q<T> = UseQueryResult<T>

function Section<T>({ q, title, extra, children }: {
  q: Q<T>; title: string; extra?: React.ReactNode; children: (data: T) => React.ReactNode
}) {
  const { t } = useT()
  return (
    <Card title={title} extra={extra} styles={{ body: { padding: 16 } }}>
      {q.isLoading ? <PageSkeleton rows={3} />
        : q.isError || !q.data
          ? <ErrorState message={t('home.loadError')} onRetry={() => void q.refetch()} />
          : children(q.data)}
    </Card>
  )
}

// ---- 1. Do today ------------------------------------------------------------------
function TodayCard({ q }: { q: Q<TodayOut> }) {
  const { t } = useT()
  const navigate = useNavigate()
  return (
    <Section q={q} title={t('home.today')}>
      {(d) => {
        const rows = d.rows.filter((r) => r.count > 0)
        if (!rows.length) {
          return (
            <Space>
              <CheckCircleFilled style={{ color: 'var(--sb-success)', fontSize: 20 }} aria-hidden />
              <Typography.Text>{t('home.todayDone')}</Typography.Text>
            </Space>
          )
        }
        return (
          <ul className="todo-list">
            {rows.map((r: TodayRow) => (
              <li key={r.key}>
                <StatusPill tone={r.key === 'declined' || r.key === 'held' ? 'danger' : 'warning'}>
                  <span className="num">{r.count}</span>
                </StatusPill>
                <span className="todo-text">
                  {t((r.key === 'approve' && r.in_finance ? 'home.row.approveFinance'
                    : `home.row.${r.key}`) as TextKey)}
                </span>
                <Button size="small" icon={<ArrowRightOutlined />} onClick={() => navigate(r.route)}>
                  {t('home.open')}
                </Button>
              </li>
            ))}
          </ul>
        )
      }}
    </Section>
  )
}

// ---- 2. Orders summary --------------------------------------------------------------
const STAGE_ROUTE: Record<string, string> = {
  draft: '/orders?status=draft', waiting_approval: '/orders?status=submitted',
  sent: '/orders?status=approved', opened: '/orders?status=approved',
  accepted: '/orders?status=accepted', declined: '/orders?status=declined',
  rejected: '/orders?status=rejected', received: '/orders?status=received',
}
const STAGE_TONE: Record<string, 'neutral' | 'warning' | 'danger' | 'success'> = {
  waiting_approval: 'warning', declined: 'danger', rejected: 'danger', accepted: 'success',
  received: 'success',
}

function OrdersCard({ q }: { q: Q<OrdersSummary> }) {
  const { t } = useT()
  const navigate = useNavigate()
  return (
    <Section q={q} title={t('home.orders')} extra={
      q.data && (
        <Typography.Text type="secondary">
          {t('home.week')}: <b className="num">{q.data.week_orders}</b> {t('home.weekOrders')} · Rs{' '}
          <Money value={q.data.week_value} />
        </Typography.Text>
      )}>
      {(d) => (
        <div className="stage-grid">
          {Object.entries(d.stages).map(([k, n]) => (
            <StatCard key={k} label={t(`home.stage.${k}` as TextKey)} value={n}
              tone={n > 0 ? (STAGE_TONE[k] ?? 'neutral') : 'neutral'}
              onClick={() => navigate(STAGE_ROUTE[k])} />
          ))}
        </div>
      )}
    </Section>
  )
}

// ---- 3. Price changes ----------------------------------------------------------------
function ChangesCard({ q }: { q: Q<PriceChanges> }) {
  const { t } = useT()
  const [onlyUp, setOnlyUp] = useState(false)
  const items = useMemo(
    () => (q.data?.items ?? []).filter((i) => !onlyUp || Number(i.new_price) > Number(i.old_price)),
    [q.data, onlyUp])
  return (
    <Section q={q} title={`${t('home.prices')} ${t('home.pricesDays')}`} extra={
      <Space size={6}>
        <Switch size="small" checked={onlyUp} onChange={setOnlyUp} aria-label={t('home.onlyIncreases')} />
        <Typography.Text type="secondary">{t('home.onlyIncreases')}</Typography.Text>
      </Space>}>
      {() => (
        <ResponsiveTable rowKey={(r) => `${r.offer_id}:${r.changed_at}`} dataSource={items}
          pagination={{ pageSize: 6, hideOnSinglePage: true }} size="small"
          locale={{ emptyText: <Typography.Text type="secondary">{t('home.noChanges')}</Typography.Text> }}
          cardFields={[
            { label: t('home.item'), render: (r) => `${r.heading} ${r.label}` },
            { label: t('home.supplier'), render: (r) => r.supplier_name },
            { label: t('home.change'), render: (r) => <><Money value={r.old_price} /> → <Money value={r.new_price} /></> },
            { label: t('home.when'), render: (r) => when(r.changed_at) },
          ]}
          columns={[
            { title: t('home.item'), render: (_, r) => `${r.heading} ${r.label}`.trim() },
            { title: t('home.supplier'), dataIndex: 'supplier_name' },
            { title: t('home.change'), align: 'right', render: (_, r) => (
              <Space size={8}>
                <Money value={r.old_price} muted /><span aria-hidden>→</span><Money value={r.new_price} />
                <PriceChange from={r.old_price} to={r.new_price} />
              </Space>) },
            { title: t('home.when'), dataIndex: 'changed_at', render: (v: string) => when(v) },
          ]} />
      )}
    </Section>
  )
}

// ---- 4. Base price insight -------------------------------------------------------------
function InsightCard({ q }: { q: Q<BasePriceInsight> }) {
  const { t } = useT()
  const navigate = useNavigate()
  return (
    <Section q={q} title={t('home.insight')}>
      {(d) => (
        <>
          <Typography.Paragraph type="secondary">{t('home.insightHint')}</Typography.Paragraph>
          <ResponsiveTable rowKey="online_product_id" dataSource={d.can_save} size="small"
            pagination={{ pageSize: 6, hideOnSinglePage: true }}
            onCardClick={() => navigate('/base-prices')}
            locale={{ emptyText: <Typography.Text type="secondary">{t('home.noSaving')}</Typography.Text> }}
            cardFields={[
              { label: t('home.product'), render: (r) => r.product_name },
              { label: t('home.paid'), render: (r) => <><Money value={r.base_price} /> · {r.base_supplier}</> },
              { label: t('home.cheapest'), render: (r) => <><Money value={r.best_price} /> · {r.best_supplier}</> },
              { label: t('home.saving'), render: (r) => <><Money value={r.saving} /> ({r.saving_pct}%)</> },
            ]}
            columns={[
              { title: t('home.product'), dataIndex: 'product_name' },
              { title: t('home.paid'), align: 'right', render: (_, r) => (
                <div><Money value={r.base_price} /><div className="muted-line">{r.base_supplier}</div></div>) },
              { title: t('home.cheapest'), align: 'right', render: (_, r) => (
                <div><Money value={r.best_price} /><div className="muted-line">{r.best_supplier}</div></div>) },
              { title: t('home.saving'), align: 'right', render: (_, r) => (
                <StatusPill tone="success"><Money value={r.saving} /> · {r.saving_pct}%</StatusPill>) },
            ]} />
          {d.never_ordered_count > 0 && (
            <Typography.Paragraph type="secondary" style={{ marginTop: 12, marginBottom: 0 }}>
              {t('home.neverOrdered')}: <b className="num">{d.never_ordered_count}</b>
            </Typography.Paragraph>
          )}
        </>
      )}
    </Section>
  )
}

