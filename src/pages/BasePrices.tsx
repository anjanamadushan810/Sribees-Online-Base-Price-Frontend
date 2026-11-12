import { useQuery } from '@tanstack/react-query'
import { Drawer, Input, Table, Tag, Typography } from 'antd'
import { useState } from 'react'
import { api } from '../api/client'
import { when } from '../api/lookups'
import { formatMoney } from '../api/money'
import type { BasePriceRow, ProductBasePrice } from '../api/types'
import PageHeader from '../components/PageHeader'

/** Base price = what we actually agreed to pay (written when a supplier accepts an order). */
export default function BasePrices() {
  const [q, setQ] = useState('')
  const [open, setOpen] = useState<string>()
  const rows = useQuery({
    queryKey: ['base-prices'],
    queryFn: async () => (await api.get<BasePriceRow[]>('/base-prices')).data,
  })
  const data = rows.data?.filter((r) => !q || `${r.product_name} ${r.supplier_name}`.toLowerCase().includes(q.toLowerCase()))
  return (
    <>
      <PageHeader title="Base prices" subtitle="The price we last agreed with a supplier, per product" />
      <Input.Search allowClear placeholder="Search product or supplier" style={{ maxWidth: 320, marginBottom: 12 }}
        onChange={(e) => setQ(e.target.value)} />
      <Table rowKey={(r) => `${r.online_product_id}:${r.online_variant_id ?? ''}`} loading={rows.isLoading} dataSource={data}
        onRow={(r) => ({ onClick: () => setOpen(r.online_product_id), style: { cursor: 'pointer' } })}
        columns={[
          { title: 'Product', dataIndex: 'product_name' },
          { title: 'Base price (Rs)', dataIndex: 'unit_price', align: 'right', render: formatMoney },
          { title: 'Selling price', dataIndex: 'mrp', align: 'right', render: formatMoney },
          { title: 'Supplier', dataIndex: 'supplier_name' },
          { title: 'Since', dataIndex: 'recorded_at', render: when },
        ]} />
      {open && <ProductDrawer productId={open} onClose={() => setOpen(undefined)} />}
    </>
  )
}

function ProductDrawer({ productId, onClose }: { productId: string; onClose: () => void }) {
  const d = useQuery({
    queryKey: ['base-price', productId],
    queryFn: async () => (await api.get<ProductBasePrice>(`/base-prices/${productId}`)).data,
  })
  return (
    <Drawer open width={640} title={d.data?.name ?? '…'} onClose={onClose}>
      <Typography.Title level={5}>What suppliers offer today</Typography.Title>
      <Table size="small" rowKey="offer_id" pagination={false} dataSource={d.data?.offers}
        columns={[
          { title: 'Supplier', dataIndex: 'supplier_name' },
          { title: 'Line', render: (_, o) => `${o.heading} ${o.label}` },
          { title: 'Price', dataIndex: 'price', align: 'right', render: formatMoney },
          { title: 'Per box', dataIndex: 'units_per_box', align: 'right', render: (v) => v ?? '?' },
        ]} />
      <Typography.Title level={5} style={{ marginTop: 24 }}>What we paid</Typography.Title>
      <Table size="small" rowKey={(r) => `${r.order_id}:${r.recorded_at}`} pagination={false} dataSource={d.data?.history}
        columns={[
          { title: 'When', dataIndex: 'recorded_at', render: when },
          { title: 'Price', dataIndex: 'unit_price', align: 'right', render: formatMoney },
          { title: '', render: (_, r) => r.voided_at && <Tag>Order cancelled</Tag> },
        ]} />
    </Drawer>
  )
}
