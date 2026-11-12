import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Alert, App, Button, Card, Descriptions, Form, Input, InputNumber, Modal, Select, Space, Table, Tag,
} from 'antd'
import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { api, errorMessage } from '../api/client'
import { HELD_LABEL, ORDER_STATUS, when } from '../api/lookups'
import { formatMoney } from '../api/money'
import type { Catalog, Order } from '../api/types'
import { useAuth } from '../auth/AuthContext'
import PageHeader from '../components/PageHeader'

export default function OrderDetail() {
  const { id = '' } = useParams()
  const { can } = useAuth()
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
  if (!o) return <Card loading />
  const draft = o.status === 'draft'
  const canEdit = draft && (can('orders.create') || can('orders.request'))
  const st = ORDER_STATUS[o.status]
  return (
    <>
      <PageHeader back="/orders" title={`${o.order_no} · ${o.supplier_name}`}
        subtitle={`Deliver to ${o.branch_name}`}
        extra={<Space>
          <Tag color={st.color}>{st.label}</Tag>
          {draft && can('orders.create') && <Button type="primary" loading={act.isPending}
            disabled={!o.lines.length} onClick={() => act.mutate({ path: '/submit' })}>Submit</Button>}
          {o.status === 'submitted' && can('orders.approve') && <Button type="primary" loading={act.isPending}
            onClick={() => act.mutate({ path: '/approve' })}>Approve and send</Button>}
          {['draft', 'submitted', 'approved', 'accepted'].includes(o.status) && (can('orders.create') || o.status === 'draft') &&
            <Button danger onClick={() => setCancelling(true)}>Cancel order</Button>}
        </Space>} />
      {o.status === 'submitted' && !can('orders.approve') &&
        <Alert showIcon type="info" style={{ marginBottom: 12 }} message="Waiting for approval. The supplier sees the order only after it is approved." />}
      <Descriptions size="small" bordered column={{ xs: 1, md: 3 }} style={{ marginBottom: 16 }} items={[
        { key: 'c', label: 'Created', children: when(o.created_at) },
        { key: 's', label: 'Submitted', children: when(o.submitted_at) },
        { key: 'a', label: 'Sent to supplier', children: when(o.approved_at) },
        { key: 'seen', label: 'Supplier opened it', children: o.approved_at ? when(o.supplier_seen_at) : '—' },
        { key: 'ans', label: 'Supplier answered', children: when(o.answered_at) },
        { key: 'sn', label: 'Supplier note', children: o.supplier_note ?? '—' },
        ...(o.note ? [{ key: 'n', label: 'Our note', children: o.note }] : []),
        ...(o.cancel_reason ? [{ key: 'cr', label: 'Cancel reason (supplier sees)', children: o.cancel_reason }] : []),
        ...(o.cancel_note ? [{ key: 'cn', label: 'Cancel note (staff only)', children: o.cancel_note }] : []),
      ]} />
      <Table rowKey="line_id" dataSource={o.lines} pagination={false}
        columns={[
          { title: 'Item', render: (_, l) => <>{l.heading} {l.label && <Tag>{l.label}</Tag>}
            {!l.online_product_id && <Tag color="orange">not matched</Tag>}</> },
          { title: 'Boxes', dataIndex: 'boxes', align: 'right', render: (v, l) => canEdit
            ? <InputNumber min={0} max={100000} defaultValue={v} style={{ width: 90 }}
                onBlur={(e) => {
                  const n = Number(e.target.value)
                  if (Number.isInteger(n) && n !== v) act.mutate({ path: `/lines/${l.line_id}`, method: 'patch', body: { boxes: n } })
                }} />
            : v },
          { title: 'Per box', dataIndex: 'units_per_box', align: 'right' },
          { title: 'Units', dataIndex: 'units', align: 'right' },
          { title: 'Unit price', dataIndex: 'unit_price', align: 'right', render: formatMoney },
          { title: 'Line total', dataIndex: 'line_total', align: 'right', render: formatMoney },
        ]}
        summary={() => (
          <>
            <Table.Summary.Row>
              <Table.Summary.Cell index={0} colSpan={5}>Goods</Table.Summary.Cell>
              <Table.Summary.Cell index={1} align="right">{formatMoney(o.goods_total)}</Table.Summary.Cell>
            </Table.Summary.Row>
            {o.delivery_charge && <Table.Summary.Row>
              <Table.Summary.Cell index={0} colSpan={5}>Supplier delivery charge</Table.Summary.Cell>
              <Table.Summary.Cell index={1} align="right">{formatMoney(o.delivery_charge)}</Table.Summary.Cell>
            </Table.Summary.Row>}
            <Table.Summary.Row>
              <Table.Summary.Cell index={0} colSpan={5}><b>Total (Rs)</b></Table.Summary.Cell>
              <Table.Summary.Cell index={1} align="right"><b>{formatMoney(o.total)}</b></Table.Summary.Cell>
            </Table.Summary.Row>
          </>
        )} />
      {canEdit && <Button style={{ marginTop: 12 }} onClick={() => setAdding(true)}>Add line</Button>}
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
  const [reason, setReason] = useState('')
  const [note, setNote] = useState('')
  return (
    <Modal open title="Cancel order" okText="Cancel order" onCancel={props.onClose}
      okButtonProps={{ danger: true, disabled: reason.trim().length < 3, loading: props.loading }}
      onOk={() => props.onOk(reason.trim(), note.trim())}>
      <Form layout="vertical">
        <Form.Item label="Reason (the supplier sees this)">
          <Input.TextArea rows={2} maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} />
        </Form.Item>
        <Form.Item label="Note for staff only">
          <Input.TextArea rows={2} maxLength={2000} value={note} onChange={(e) => setNote(e.target.value)} />
        </Form.Item>
      </Form>
    </Modal>
  )
}
