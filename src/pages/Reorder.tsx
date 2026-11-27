import { SyncOutlined } from '@ant-design/icons'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Alert, App, Button, Card, List, Select, Space, Table, Tag } from 'antd'
import { Link } from 'react-router-dom'
import { api, errorMessage } from '../api/client'
import { when } from '../api/lookups'
import type { Supplier } from '../api/types'
import { useAuth } from '../auth/AuthContext'
import PageHeader from '../components/PageHeader'
import { EmptyState, ErrorState, PageSkeleton } from '../components/ui'
import { useT } from '../i18n'
import type { TextKey } from '../i18n/en'
import { fmt } from './textFormat'

interface Draft { order_id: string; order_no: string; supplier_name: string; added: number; lines: number }
interface LeftOut {
  online_product_id: string; online_variant_id?: string; name: string; reason: string
  available: number; minimum: number; maximum: number | null; need?: number
}
interface Run {
  branch_id: string; branch_name: string; ran_at: string | null
  result: null | { drafts: Draft[]; left_out: LeftOut[]; below_minimum: number; added: number; checked: number }
}

export const REASONS = ['no_maximum', 'no_supplier', 'by_weight', 'pack_size', 'not_sold', 'supplier_inactive'] as const

function ChooseSupplier({ row, suppliers }: { row: LeftOut; suppliers: Supplier[] }) {
  const { t } = useT()
  const { message } = App.useApp()
  const set = useMutation({
    mutationFn: async (supplier_id: string) =>
      api.put('/reorder/main-supplier', { online_variant_id: row.online_variant_id, supplier_id }),
    onSuccess: () => message.success(t('ro.supplierSet')),
    onError: (e) => message.error(errorMessage(e)),
  })
  return <Select style={{ width: 220 }} placeholder={t('ro.chooseSupplier')} loading={set.isPending}
    showSearch optionFilterProp="label" onChange={(v: string) => set.mutate(v)}
    options={suppliers.filter((s) => s.is_active).map((s) => ({ value: s.supplier_id, label: s.name }))} />
}

export default function Reorder() {
  const { t } = useT()
  const { can } = useAuth()
  const { message } = App.useApp()
  const qc = useQueryClient()
  const runs = useQuery({ queryKey: ['reorder'], queryFn: async () => (await api.get<Run[]>('/reorder')).data })
  const suppliers = useQuery({
    queryKey: ['suppliers'], enabled: can('orders.create'),
    queryFn: async () => (await api.get<Supplier[]>('/suppliers')).data,
  })
  const run = useMutation({
    mutationFn: async (branch_id: string) => (await api.post('/reorder/run', { branch_id })).data,
    onSuccess: () => {
      message.success(t('ro.done'))
      void qc.invalidateQueries({ queryKey: ['reorder'] })
      void qc.invalidateQueries({ queryKey: ['orders'] })
    },
    onError: (e) => message.error(errorMessage(e)),
  })
  if (runs.isError) return <ErrorState message={errorMessage(runs.error)} onRetry={() => void runs.refetch()} />
  if (!runs.data) return <PageSkeleton rows={6} />
  return (
    <>
      <PageHeader title={t('ro.title')} subtitle={t('ro.subtitle')} />
      {!runs.data.length && <EmptyState title={t('ro.noBranch')} />}
      {runs.data.map((b) => (
        <Card key={b.branch_id} style={{ marginBottom: 16 }} title={b.branch_name}
          extra={can('orders.create') && <Button icon={<SyncOutlined />} loading={run.isPending && run.variables === b.branch_id}
            onClick={() => run.mutate(b.branch_id)}>{t('ro.runNow')}</Button>}>
          <p>{b.ran_at ? fmt(t('ro.lastRun'), { at: when(b.ran_at) }) : t('ro.never')}</p>
          {b.result && <>
            <Space wrap style={{ marginBottom: 12 }}>
              <Tag>{fmt(t('ro.checked'), { n: b.result.checked })}</Tag>
              <Tag color="orange">{fmt(t('ro.below'), { n: b.result.below_minimum })}</Tag>
              <Tag color="green">{fmt(t('ro.added'), { n: b.result.added })}</Tag>
            </Space>
            {b.result.drafts.length > 0 && <List size="small" header={<b>{t('ro.drafts')}</b>} dataSource={b.result.drafts}
              renderItem={(d) => <List.Item><Link to={`/orders/${d.order_id}`}>{d.order_no}</Link> · {d.supplier_name}
                · {fmt(t('ro.lines'), { n: d.lines, added: d.added })}</List.Item>} />}
            {b.result.left_out.length > 0 && <>
              <Alert style={{ margin: '12px 0' }} type="warning" showIcon message={t('ro.leftOut')} />
              <Table rowKey={(r) => `${r.online_product_id}-${r.reason}`} size="small" pagination={{ pageSize: 20, hideOnSinglePage: true }}
                dataSource={b.result.left_out} scroll={{ x: 700 }}
                columns={[
                  { title: t('ro.col.item'), dataIndex: 'name' },
                  { title: t('ro.col.stock'), render: (_, r) => `${r.available} / ${r.minimum} / ${r.maximum ?? '—'}` },
                  { title: t('ro.col.why'), dataIndex: 'reason', render: (v: string) => t(`ro.why.${v}` as TextKey) },
                  { title: '', render: (_, r) => r.reason === 'no_supplier' && r.online_variant_id && can('orders.create')
                    ? <ChooseSupplier row={r} suppliers={suppliers.data ?? []} /> : null },
                ]} />
            </>}
          </>}
        </Card>
      ))}
    </>
  )
}
