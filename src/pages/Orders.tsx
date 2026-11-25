import { PlusOutlined } from '@ant-design/icons'
import { useMutation, useQuery } from '@tanstack/react-query'
import dayjs from 'dayjs'
import { App, Button, DatePicker, Form, Input, Modal, Select } from 'antd'
import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { api, errorMessage } from '../api/client'
import { ORDER_STATUS, when } from '../api/lookups'
import { formatMoney } from '../api/money'
import type { Branch, Order, OrderStatus, Supplier } from '../api/types'
import { useAuth } from '../auth/AuthContext'
import PageHeader from '../components/PageHeader'
import { SyncOnlineButton } from '../components/SyncOnline'
import { EmptyState, Money, StatusPill } from '../components/ui'
import { ResponsiveTable } from '../components/ui/ResponsiveTable'
import { useT } from '../i18n'
import { fmt } from './matchingLogic'
import { filterOrders, STATUS_TONE, totals, type OrderFilter } from './orderLogic'

export default function Orders() {
  const { can } = useAuth()
  const { t } = useT()
  const navigate = useNavigate()
  const { message } = App.useApp()
  const [params, setParams] = useSearchParams()
  // The address keeps the filters, so a Home card or a shared link opens the same list.
  const filter: OrderFilter = {
    status: (params.get('status') ?? undefined) as OrderStatus | undefined,
    supplier: params.get('supplier') ?? undefined, branch: params.get('branch') ?? undefined,
    from: params.get('from') ?? undefined, to: params.get('to') ?? undefined, q: params.get('q') ?? undefined,
  }
  const setFilter = (patch: Partial<OrderFilter>) => {
    const next = new URLSearchParams(params)
    for (const [k, v] of Object.entries(patch)) { if (v) next.set(k, v); else next.delete(k) }
    setParams(next, { replace: true })
  }
  const [open, setOpen] = useState(false)
  const [form] = Form.useForm()
  const orders = useQuery({
    queryKey: ['orders'],
    queryFn: async () => (await api.get<Order[]>('/orders')).data,
  })
  const suppliers = useQuery({
    queryKey: ['suppliers'],
    queryFn: async () => (await api.get<Supplier[]>('/suppliers')).data,
  })
  const branches = useQuery({
    queryKey: ['branches'],
    queryFn: async () => (await api.get<Branch[]>('/branches')).data,
  })
  const rows = useMemo(() => filterOrders(orders.data ?? [], filter),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [orders.data, params])
  const sum = totals(rows)
  const filtered = Object.values(filter).some(Boolean)
  const create = useMutation({
    mutationFn: async (v: { supplier_id: string; branch_id: string; note?: string }) =>
      (await api.post<Order>('/orders', v)).data,
    onSuccess: (o) => navigate(`/orders/${o.order_id}`),
    onError: (e) => message.error(errorMessage(e)),
  })
  const canCreate = can('orders.create') || can('orders.request')
  const pill = (s: OrderStatus) => <StatusPill tone={STATUS_TONE[s]}>{t(`ord.status.${s}`)}</StatusPill>
  return (
    <>
      <PageHeader title={t('ord.title')} subtitle={t('ord.subtitle')}
        extra={canCreate && <Button type="primary" icon={<PlusOutlined />} onClick={() => setOpen(true)}>{t('ord.new')}</Button>} />
      <div className="ord-filters" role="search">
        <Input.Search allowClear defaultValue={filter.q} placeholder={t('ord.search')} aria-label={t('ord.search')}
          onSearch={(v) => setFilter({ q: v })} style={{ maxWidth: 280 }} />
        <Select allowClear placeholder={t('ord.anyStatus')} aria-label={t('ord.anyStatus')} style={{ width: 190 }}
          value={filter.status} onChange={(v) => setFilter({ status: v })}
          options={(Object.keys(ORDER_STATUS) as OrderStatus[]).map((value) => ({ value, label: t(`ord.status.${value}`) }))} />
        <Select allowClear showSearch optionFilterProp="label" placeholder={t('ord.anySupplier')}
          aria-label={t('ord.anySupplier')} style={{ width: 210 }} value={filter.supplier}
          onChange={(v) => setFilter({ supplier: v })}
          options={suppliers.data?.map((x) => ({ value: x.supplier_id, label: x.name }))} />
        <Select allowClear placeholder={t('ord.anyBranch')} aria-label={t('ord.anyBranch')} style={{ width: 170 }}
          value={filter.branch} onChange={(v) => setFilter({ branch: v })}
          options={branches.data?.map((x) => ({ value: x.branch_id, label: x.name }))} />
        <DatePicker.RangePicker allowEmpty={[true, true]} placeholder={[t('ord.from'), t('ord.to')]}
          value={[filter.from ? dayjs(filter.from) : null, filter.to ? dayjs(filter.to) : null]}
          onChange={(_, d) => setFilter({ from: d[0] || undefined, to: d[1] || undefined })} />
        {filtered && <Button type="link" onClick={() => setParams({}, { replace: true })}>{t('ord.clear')}</Button>}
      </div>
      <div className="ord-summary" aria-live="polite">
        {fmt(t('ord.summary'), { n: sum.count, total: formatMoney(sum.total.toFixed(2)) })}
      </div>
      <ResponsiveTable rowKey="order_id" loading={orders.isLoading} dataSource={rows}
        locale={{ emptyText: <EmptyState title={t('ord.empty')} /> }}
        onCardClick={(r) => navigate(`/orders/${r.order_id}`)}
        cardFields={[
          { label: t('ord.col.order'), render: (r) => <>{r.order_no} <span className="muted">{r.supplier_name}</span></> },
          { label: t('ord.col.status'), render: (r) => pill(r.status) },
          { label: t('ord.col.branch'), render: (r) => r.branch_name },
          { label: t('ord.col.total'), render: (r) => <Money value={r.total} /> },
          { label: t('ord.col.created'), render: (r) => when(r.created_at) },
        ]}
        onRow={(r) => ({ onClick: () => navigate(`/orders/${r.order_id}`), style: { cursor: 'pointer' } })}
        columns={[
          { title: t('ord.col.order'), dataIndex: 'order_no' },
          { title: t('ord.col.supplier'), dataIndex: 'supplier_name' },
          { title: t('ord.col.branch'), dataIndex: 'branch_name' },
          { title: t('ord.col.status'), dataIndex: 'status', render: pill },
          { title: t('ord.col.total'), dataIndex: 'total', align: 'right', render: (v: string) => <Money value={v} /> },
          { title: t('ord.col.created'), dataIndex: 'created_at', render: when },
        ]} />
      <Modal open={open} title="New order" okText="Create draft" onCancel={() => setOpen(false)}
        confirmLoading={create.isPending} onOk={() => form.submit()}>
        <Form form={form} layout="vertical" onFinish={(v) => create.mutate(v)}>
          <Form.Item name="supplier_id" label="Supplier" rules={[{ required: true }]}>
            <Select showSearch optionFilterProp="label" loading={suppliers.isLoading}
              options={suppliers.data?.filter((s) => s.is_active).map((s) => ({ value: s.supplier_id, label: s.name }))} />
          </Form.Item>
          <Form.Item name="branch_id" label="Deliver to branch" rules={[{ required: true }]}>
            <Select loading={branches.isLoading}
              notFoundContent={<div style={{ padding: 8 }}>
                <div style={{ marginBottom: 8 }}>No branches yet. Bring them in from SRIBEESonline:</div>
                <SyncOnlineButton type="primary" />
              </div>}
              options={branches.data?.filter((b) => b.is_active).map((b) => ({ value: b.branch_id, label: b.name }))} />
          </Form.Item>
          <Form.Item name="note" label="Note"><Input.TextArea rows={2} /></Form.Item>
        </Form>
      </Modal>
    </>
  )
}
