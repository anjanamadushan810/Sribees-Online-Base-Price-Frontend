import { SyncOutlined } from '@ant-design/icons'
import { useMutation, useQuery } from '@tanstack/react-query'
import { App, Button, Empty, Select, Space } from 'antd'
import { useState } from 'react'
import { api, errorMessage } from '../api/client'
import type { Supplier } from '../api/types'
import { useAuth } from '../auth/AuthContext'
import PageHeader from '../components/PageHeader'
import MatchingPanel from './MatchingPanel'

export default function Matching() {
  const { can } = useAuth()
  const { message } = App.useApp()
  const suppliers = useQuery({
    queryKey: ['suppliers'],
    queryFn: async () => (await api.get<Supplier[]>('/suppliers')).data,
  })
  const [chosen, setChosen] = useState<string>()
  const supplierId = chosen ?? suppliers.data?.[0]?.supplier_id
  const sync = useMutation({
    mutationFn: async () => (await api.post<{ products: number; deactivated: number }>('/online-catalog/sync')).data,
    onSuccess: (r) => message.success(`Online products: ${r.products} (${r.deactivated} no longer on Online)`),
    onError: (e) => message.error(errorMessage(e)),
  })
  return (
    <>
      <PageHeader title="Matching" subtitle="Which of our products is each supplier price line"
        extra={can('online.sync') && (
          <Button icon={<SyncOutlined />} loading={sync.isPending} onClick={() => sync.mutate()}>
            Refresh Online products
          </Button>
        )} />
      <Space style={{ marginBottom: 12 }}>
        <Select style={{ minWidth: 260 }} value={supplierId} onChange={setChosen} loading={suppliers.isLoading}
          options={suppliers.data?.map((s) => ({ value: s.supplier_id, label: s.name }))} />
      </Space>
      {supplierId ? <MatchingPanel key={supplierId} supplierId={supplierId} /> : <Empty description="No suppliers yet" />}
    </>
  )
}
