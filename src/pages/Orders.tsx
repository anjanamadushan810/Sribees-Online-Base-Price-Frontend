import { PlusOutlined } from '@ant-design/icons'
import { useMutation, useQuery } from '@tanstack/react-query'
import { App, Button, Form, Input, Modal, Select, Space, Table, Tag } from 'antd'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, errorMessage } from '../api/client'
import { ORDER_STATUS, when } from '../api/lookups'
import { formatMoney } from '../api/money'
import type { Branch, Order, OrderStatus, Supplier } from '../api/types'
import { useAuth } from '../auth/AuthContext'
import PageHeader from '../components/PageHeader'

export default function Orders() {
  const { can } = useAuth()
  const navigate = useNavigate()
  const { message } = App.useApp()
  const [status, setStatus] = useState<OrderStatus>()
  const [open, setOpen] = useState(false)
  const [form] = Form.useForm()
  const orders = useQuery({
    queryKey: ['orders', status],
    queryFn: async () => (await api.get<Order[]>('/orders', { params: { status } })).data,
  })
  const suppliers = useQuery({
    queryKey: ['suppliers'],
    enabled: open,
    queryFn: async () => (await api.get<Supplier[]>('/suppliers')).data,
  })
  const branches = useQuery({
    queryKey: ['branches'],
    enabled: open,
    queryFn: async () => (await api.get<Branch[]>('/branches')).data,
  })
  const create = useMutation({
    mutationFn: async (v: { supplier_id: string; branch_id: string; note?: string }) =>
      (await api.post<Order>('/orders', v)).data,
    onSuccess: (o) => navigate(`/orders/${o.order_id}`),
    onError: (e) => message.error(errorMessage(e)),
  })
  const canCreate = can('orders.create') || can('orders.request')
  return (
    <>
      <PageHeader title="Orders" subtitle="Buying from suppliers, in whole boxes"
        extra={canCreate && <Button type="primary" icon={<PlusOutlined />} onClick={() => setOpen(true)}>New order</Button>} />
      <Space style={{ marginBottom: 12 }}>
        <Select allowClear placeholder="Any status" style={{ width: 200 }} value={status} onChange={setStatus}
          options={Object.entries(ORDER_STATUS).map(([value, s]) => ({ value, label: s.label }))} />
      </Space>
      <Table rowKey="order_id" loading={orders.isLoading} dataSource={orders.data}
        onRow={(r) => ({ onClick: () => navigate(`/orders/${r.order_id}`), style: { cursor: 'pointer' } })}
        columns={[
          { title: 'Order', dataIndex: 'order_no' },
          { title: 'Supplier', dataIndex: 'supplier_name' },
          { title: 'Branch', dataIndex: 'branch_name' },
          { title: 'Status', dataIndex: 'status', render: (s: OrderStatus) => <Tag color={ORDER_STATUS[s].color}>{ORDER_STATUS[s].label}</Tag> },
          { title: 'Total (Rs)', dataIndex: 'total', align: 'right', render: formatMoney },
          { title: 'Created', dataIndex: 'created_at', render: when },
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
              options={branches.data?.filter((b) => b.is_active).map((b) => ({ value: b.branch_id, label: b.name }))} />
          </Form.Item>
          <Form.Item name="note" label="Note"><Input.TextArea rows={2} /></Form.Item>
        </Form>
      </Modal>
    </>
  )
}
