import { SyncOutlined } from '@ant-design/icons'
import { useMutation, useQuery } from '@tanstack/react-query'
import { App, Button, Select } from 'antd'
import { useState } from 'react'
import { api, errorMessage } from '../api/client'
import type { Supplier } from '../api/types'
import { useAuth } from '../auth/AuthContext'
import PageHeader from '../components/PageHeader'
import { EmptyState } from '../components/ui'
import { useT } from '../i18n'
import MatchingPanel from './MatchingPanel'

export default function Matching() {
  const { can } = useAuth()
  const { t } = useT()
  const { message } = App.useApp()
  const suppliers = useQuery({
    queryKey: ['suppliers'],
    queryFn: async () => (await api.get<Supplier[]>('/suppliers')).data,
  })
  const [chosen, setChosen] = useState<string>()
  const supplierId = chosen ?? suppliers.data?.[0]?.supplier_id
  const sync = useMutation({
    mutationFn: async () => (await api.post<{ products: number; deactivated: number }>('/online-catalog/sync')).data,
    onSuccess: (r) => message.success(
      `${t('match.refreshed')}: ${r.products} (${r.deactivated} ${t('match.removed')})`),
    onError: (e) => message.error(errorMessage(e)),
  })
  return (
    <>
      <PageHeader title={t('match.title')} subtitle={t('match.subtitle')}
        extra={can('online.sync') && (
          <Button icon={<SyncOutlined />} loading={sync.isPending} onClick={() => sync.mutate()}>
            {t('match.refreshOnline')}
          </Button>
        )} />
      <div className="match-supplier">
        <label htmlFor="match-supplier">{t('match.supplier')}</label>
        <Select id="match-supplier" style={{ minWidth: 260 }} value={supplierId} onChange={setChosen}
          loading={suppliers.isLoading} options={suppliers.data?.map((s) => ({ value: s.supplier_id, label: s.name }))} />
      </div>
      {supplierId
        ? <MatchingPanel key={supplierId} supplierId={supplierId} />
        : <EmptyState title={t('match.noSuppliers')} />}
    </>
  )
}
