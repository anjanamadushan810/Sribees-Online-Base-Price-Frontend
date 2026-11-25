import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CheckOutlined, CloseOutlined, PrinterOutlined } from '@ant-design/icons'
import { Alert, App, Button, Descriptions, Form, Input, InputNumber, Modal, Select, Table, Tag } from 'antd'
import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { api, errorMessage } from '../api/client'
import { HELD_LABEL, when } from '../api/lookups'
import { formatMoney } from '../api/money'
import type { Catalog, Order } from '../api/types'
import { useAuth } from '../auth/AuthContext'
import PageHeader from '../components/PageHeader'
import { ErrorState, Money, PageSkeleton, StatusPill } from '../components/ui'
import { ResponsiveTable } from '../components/ui/ResponsiveTable'
import { useT } from '../i18n'
import { fmt } from './matchingLogic'
import { consequence, STATUS_TONE, timeline } from './orderLogic'

export default function OrderDetail() {
  const { id = '' } = useParams()
  const { can } = useAuth()
  const { t } = useT()
  const { message } = App.useApp()
  const qc = useQueryClient()
  const [adding, setAdding] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const order = useQuery({
    queryKey: ['order', id],
    queryFn: async () => (await api.get<Order>(`/orders/${id}`)).data,
  })
  const o = order.data
  const act = useMutation({
    mutationFn: async (v: { path: string; body?: unknown; method?: 'post' | 'patch' }) =>
      (await api[v.method ?? 'post']<Order>(`/orders/${id}${v.path}`, v.body)).data,
    onSuccess: (data) => {
      qc.setQueryData(['order', id], data)
      qc.invalidateQueries({ queryKey: ['orders'] })
      setAdding(false)
      setCancelling(false)
    },
    onError: (e) => message.error(errorMessage(e)),
  })
  if (order.isError) return <ErrorState message={t('ord.loadError')} onRetry={() => void order.refetch()} />
  if (!o) return <PageSkeleton rows={8} />
  const draft = o.status === 'draft'
  const canEdit = draft && (can('orders.create') || can('orders.request'))
  const will = consequence(o.status)
  const canMain = (will === 'submit' && can('orders.create')) || (will === 'approve' && can('orders.approve'))
  const canCancel = ['draft', 'submitted', 'approved', 'accepted'].includes(o.status)
    && (can('orders.create') || o.status === 'draft')
  const steps = timeline(o)
  const money = (v: string) => <Money value={v} />
  return (
    <>
      <PageHeader back="/orders" title={`${o.order_no} · ${o.supplier_name}`}
        status={<StatusPill tone={STATUS_TONE[o.status]}>{t(`ord.status.${o.status}`)}</StatusPill>}
        subtitle={fmt(t('ord.deliverTo'), { branch: o.branch_name })}
        extra={<Button icon={<PrinterOutlined />} className="no-print" onClick={() => window.print()}>{t('ord.print')}</Button>} />

      <ol className="ord-timeline" aria-label={t('ord.title')}>
        {steps.map((st) => (
          <li key={st.key} className={`ord-step ord-${st.state}`} aria-current={st.state === 'current' ? 'step' : undefined}>
            <span className="ord-dot" aria-hidden>{st.state === 'done' ? <CheckOutlined />
              : st.state === 'bad' ? <CloseOutlined /> : null}</span>
            <span className="ord-step-name">{t(o.status === 'declined' && st.key === 'answered'
              ? 'ord.step.declined' : `ord.step.${st.key}`)}</span>
            <span className="ord-step-at">{st.at ? when(st.at) : ''}</span>
          </li>
        ))}
      </ol>

      {o.status === 'submitted' && !can('orders.approve') &&
        <Alert showIcon type="info" style={{ marginBottom: 12 }} message={t('ord.wait')} />}
      {(o.supplier_note || o.note || o.cancel_reason || o.cancel_note) && (
        <Descriptions size="small" bordered column={{ xs: 1, md: 2 }} style={{ marginBottom: 16 }} items={[
          ...(o.supplier_note ? [{ key: 'sn', label: t('ord.supplierNote'), children: o.supplier_note }] : []),
          ...(o.note ? [{ key: 'n', label: t('ord.ourNote'), children: o.note }] : []),
          ...(o.cancel_reason ? [{ key: 'cr', label: t('ord.cancelReason'), children: o.cancel_reason }] : []),
          ...(o.cancel_note ? [{ key: 'cn', label: t('ord.cancelNote'), children: o.cancel_note }] : []),
        ]} />
      )}

      <ResponsiveTable rowKey="line_id" dataSource={o.lines} pagination={false}
        cardFields={[
          { label: t('ord.line.item'), render: (l) => <>{l.heading} {l.label && <Tag>{l.label}</Tag>}</> },
          { label: t('ord.line.boxes'), render: (l) => <>{l.boxes} × {l.units_per_box}</> },
          { label: t('ord.line.unitPrice'), render: (l) => money(l.unit_price) },
          { label: t('ord.line.total'), render: (l) => money(l.line_total) },
        ]}
        columns={[
          { title: t('ord.line.item'), render: (_, l) => <>{l.heading} {l.label && <Tag>{l.label}</Tag>}
            {!l.online_product_id && <StatusPill tone="warning">{t('ord.line.unmatched')}</StatusPill>}</> },
          { title: t('ord.line.boxes'), dataIndex: 'boxes', align: 'right', render: (v, l) => canEdit
            ? <InputNumber min={0} max={100000} defaultValue={v} style={{ width: 90 }} aria-label={t('ord.line.boxes')}
                onBlur={(e) => {
                  const n = Number(e.target.value)
                  if (Number.isInteger(n) && n !== v) act.mutate({ path: `/lines/${l.line_id}`, method: 'patch', body: { boxes: n } })
                }} />
            : v },
          { title: t('ord.line.perBox'), dataIndex: 'units_per_box', align: 'right' },
          { title: t('ord.line.units'), dataIndex: 'units', align: 'right' },
          { title: t('ord.line.unitPrice'), dataIndex: 'unit_price', align: 'right', render: money },
          { title: t('ord.line.total'), dataIndex: 'line_total', align: 'right', render: money },
        ]}
        summary={() => (
          <>
            <Table.Summary.Row>
              <Table.Summary.Cell index={0} colSpan={5}>{t('ord.goods')}</Table.Summary.Cell>
              <Table.Summary.Cell index={1} align="right">{money(o.goods_total)}</Table.Summary.Cell>
            </Table.Summary.Row>
            {o.delivery_charge && <Table.Summary.Row>
              <Table.Summary.Cell index={0} colSpan={5}>{t('ord.delivery')}</Table.Summary.Cell>
              <Table.Summary.Cell index={1} align="right">{money(o.delivery_charge)}</Table.Summary.Cell>
            </Table.Summary.Row>}
            <Table.Summary.Row>
              <Table.Summary.Cell index={0} colSpan={5}><b>{t('ord.total')}</b></Table.Summary.Cell>
              <Table.Summary.Cell index={1} align="right"><b>{money(o.total)}</b></Table.Summary.Cell>
            </Table.Summary.Row>
          </>
        )} />
      {canEdit && <Button className="no-print" style={{ marginTop: 12 }} onClick={() => setAdding(true)}>{t('ord.addLine')}</Button>}

      {(canMain || canCancel) && (
        <div className="ord-actions no-print">
          <div className="ord-actions-text">
            {will && canMain && <span>{t(`ord.will.${will}`)}</span>}
            {will === 'submit' && !o.lines.length && <b> {t('ord.noLines')}</b>}
          </div>
          <div className="ord-actions-buttons">
            {canCancel && <Button danger onClick={() => setCancelling(true)}>{t('ord.cancel')}</Button>}
            {canMain && <Button type="primary" loading={act.isPending}
              disabled={will === 'submit' && !o.lines.length}
              onClick={() => act.mutate({ path: will === 'submit' ? '/submit' : '/approve' })}>
              {will === 'submit' ? t('ord.submit') : t('ord.approve')}</Button>}
          </div>
        </div>
      )}
      {adding && <AddLine supplierId={o.supplier_id} taken={o.lines.map((l) => l.offer_id)}
        loading={act.isPending} onClose={() => setAdding(false)}
        onAdd={(offer_id, boxes) => act.mutate({ path: '/lines', body: { offer_id, boxes } })} />}
      {cancelling && <CancelModal loading={act.isPending} onClose={() => setCancelling(false)}
        onOk={(reason, note) => act.mutate({ path: '/cancel', body: { reason, note } })} />}
    </>
  )
}

function AddLine(props: {
  supplierId: string; taken: string[]; loading: boolean
  onClose: () => void; onAdd: (offerId: string, boxes: number) => void
}) {
  const [offer, setOffer] = useState<string>()
  const [boxes, setBoxes] = useState<number>(1)
  const catalog = useQuery({
    queryKey: ['catalog', props.supplierId],
    queryFn: async () => (await api.get<Catalog>(`/suppliers/${props.supplierId}/catalog`)).data,
  })
  const options = catalog.data?.sections.flatMap((s) => s.products.filter((p) => p.is_active).flatMap((p) =>
    p.offers.filter((o) => o.is_active && !props.taken.includes(o.offer_id)).map((o) => ({
      value: o.offer_id,
      disabled: !!o.held_reason || o.units_per_box === null,
      label: `${p.heading} ${o.label} — Rs ${formatMoney(o.price)} × ${o.units_per_box ?? '?'} per box`
        + (o.held_reason ? ` (${HELD_LABEL[o.held_reason]})` : '')
        + (o.units_per_box === null ? ' (units per box unknown)' : ''),
    })))) ?? []
  return (
    <Modal open title="Add line" okText="Add" onCancel={props.onClose} confirmLoading={props.loading}
      okButtonProps={{ disabled: !offer || boxes < 1 }} onOk={() => offer && props.onAdd(offer, boxes)}>
      <Form layout="vertical">
        <Form.Item label="Item">
          <Select showSearch optionFilterProp="label" loading={catalog.isLoading} value={offer}
            onChange={setOffer} options={options} />
        </Form.Item>
        <Form.Item label="Boxes">
          <InputNumber min={1} max={100000} value={boxes} onChange={(v) => setBoxes(v ?? 1)} />
        </Form.Item>
      </Form>
    </Modal>
  )
}

function CancelModal(props: { loading: boolean; onClose: () => void; onOk: (reason: string, note: string) => void }) {
  const { t } = useT()
  const [reason, setReason] = useState('')
  const [note, setNote] = useState('')
  return (
    <Modal open title={t('ord.cancel')} okText={t('ord.cancel')} onCancel={props.onClose}
      okButtonProps={{ danger: true, disabled: reason.trim().length < 3, loading: props.loading }}
      onOk={() => props.onOk(reason.trim(), note.trim())}>
      <Form layout="vertical">
        <Form.Item label={t('ord.cancelReason')}>
          <Input.TextArea rows={2} maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} />
        </Form.Item>
        <Form.Item label={t('ord.cancelNote')}>
          <Input.TextArea rows={2} maxLength={2000} value={note} onChange={(e) => setNote(e.target.value)} />
        </Form.Item>
      </Form>
    </Modal>
  )
}
