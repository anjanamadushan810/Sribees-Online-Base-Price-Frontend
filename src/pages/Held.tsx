import { useQuery } from '@tanstack/react-query'
import { Alert, Table, Tag } from 'antd'
import { useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import { HELD_LABEL, when } from '../api/lookups'
import { formatMoney } from '../api/money'
import type { HeldOffer } from '../api/types'
import PageHeader from '../components/PageHeader'

/** Price lines held back: not shared, not orderable, until the supplier fixes them. */
export default function Held() {
  const navigate = useNavigate()
  const rows = useQuery({
    queryKey: ['held'],
    queryFn: async () => (await api.get<HeldOffer[]>('/held-offers')).data,
  })
  return (
    <>
      <PageHeader title="Held prices" subtitle="Lines a supplier must fix before they count" />
      <Alert showIcon type="info" style={{ marginBottom: 12 }}
        message="A line is held when our price is above the selling price - almost always a typing slip. It leaves this list by itself when the supplier corrects it." />
      <Table rowKey="offer_id" loading={rows.isLoading} dataSource={rows.data}
        onRow={(r) => ({ onClick: () => navigate(`/suppliers/${r.supplier_id}`), style: { cursor: 'pointer' } })}
        columns={[
          { title: 'Supplier', dataIndex: 'supplier_name' },
          { title: 'Item', render: (_, r) => `${r.heading} ${r.label}` },
          { title: 'Our price', dataIndex: 'price', align: 'right', render: formatMoney },
          { title: 'Selling price', dataIndex: 'mrp', align: 'right', render: formatMoney },
          { title: 'Why', dataIndex: 'held_reason', render: (v) => <Tag color="red">{HELD_LABEL[v] ?? v}</Tag> },
          { title: 'Since', dataIndex: 'updated_at', render: when },
        ]} />
    </>
  )
}
