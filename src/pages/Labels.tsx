import { DownloadOutlined, PrinterOutlined, SearchOutlined } from '@ant-design/icons'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { App, Button, Card, Descriptions, Form, Input, InputNumber, Modal, Select, Space } from 'antd'
import { useState } from 'react'
import { api, errorMessage } from '../api/client'
import type { Branch } from '../api/types'
import { useAuth } from '../auth/AuthContext'
import PageHeader from '../components/PageHeader'
import { EmptyState, StatusPill } from '../components/ui'
import { ResponsiveTable } from '../components/ui/ResponsiveTable'
import { useT } from '../i18n'
import { labelLooksValid, prettyLabel } from './labelLogic'

interface LabelRange {
  range_id: string; range_no: string; count: number; first: string; last: string
  branch_id: string | null; cols: number; rows: number; sheets: number; linked: number; created_at: string
}
interface LabelInfo {
  number: string; status: string; range_no: string; linked_at: string | null; used_at: string | null
  used_ref: string | null
  batch: null | { batch_no: string; product_name: string; unit: string; received_date: string
    expiry_date: string | null; qty_on_hand: string; status: string; branch_id: string }
}

const TONE: Record<string, 'neutral' | 'success' | 'warning' | 'danger'> = {
  printed: 'neutral', linked: 'success', used: 'warning', void: 'danger',
}

export default function Labels() {
  const { can } = useAuth()
  const { t } = useT()
  const { message } = App.useApp()
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)
  const [form] = Form.useForm()
  const [query, setQuery] = useState('')
  const [found, setFound] = useState<LabelInfo | null>(null)
  const ranges = useQuery({ queryKey: ['label-ranges'], queryFn: async () => (await api.get<LabelRange[]>('/labels/ranges')).data })
  const branches = useQuery({ queryKey: ['branches'], queryFn: async () => (await api.get<Branch[]>('/branches')).data })

  const download = async (r: LabelRange) => {
    try {
      const res = await api.get(`/labels/ranges/${r.range_id}/pdf`, { responseType: 'blob' })
      const url = URL.createObjectURL(res.data as Blob)
      const a = document.createElement('a')
      a.href = url; a.download = `${r.range_no}.pdf`; a.click()
      setTimeout(() => URL.revokeObjectURL(url), 10_000)
    } catch (e) { message.error(errorMessage(e)) }
  }
  const print = useMutation({
    mutationFn: async (v: { count: number; branch_id?: string }) => (await api.post<LabelRange>('/labels/ranges', v)).data,
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ['label-ranges'] }); setOpen(false); form.resetFields()
      message.success(t('lb.printed').replace('{n}', String(r.count)))
      void download(r)
    },
    onError: (e) => message.error(errorMessage(e)),
  })
  const lookup = useMutation({
    mutationFn: async (n: string) => (await api.get<LabelInfo>(`/labels/${encodeURIComponent(n)}`)).data,
    onSuccess: setFound,
    onError: (e) => { setFound(null); message.error(errorMessage(e)) },
  })
  const search = (raw: string) => {
    if (!labelLooksValid(raw)) { message.warning(t('lb.badNumber')); return }
    lookup.mutate(raw.replace(/[\s-]/g, ''))
  }
  const perSheet = (ranges.data?.[0]?.cols ?? 8) * (ranges.data?.[0]?.rows ?? 12)
  const branchName = (id: string | null) => branches.data?.find((b) => b.branch_id === id)?.name ?? t('lb.anyBranch')

  return (
    <>
      <PageHeader title={t('lb.title')} subtitle={t('lb.subtitle')}
        extra={can('labels.print') && <Button type="primary" icon={<PrinterOutlined />} onClick={() => setOpen(true)}>{t('lb.print')}</Button>} />

      <Card size="small" style={{ marginBottom: 16 }} title={t('lb.lookup')}>
        <Input.Search autoFocus allowClear enterButton={<SearchOutlined />} placeholder={t('lb.lookupHint')}
          value={query} onChange={(e) => setQuery(e.target.value)} onSearch={search} loading={lookup.isPending}
          inputMode="numeric" style={{ maxWidth: 420 }} />
        {found && (
          <Descriptions size="small" column={{ xs: 1, md: 2 }} style={{ marginTop: 12 }}>
            <Descriptions.Item label={t('lb.number')}>{prettyLabel(found.number)}</Descriptions.Item>
            <Descriptions.Item label={t('lb.status')}><StatusPill tone={TONE[found.status] ?? 'neutral'}>{t(`lb.st.${found.status}` as 'lb.st.printed')}</StatusPill></Descriptions.Item>
            <Descriptions.Item label={t('lb.run')}>{found.range_no}</Descriptions.Item>
            {found.batch ? <>
              <Descriptions.Item label={t('lb.product')}>{found.batch.product_name}</Descriptions.Item>
              <Descriptions.Item label={t('lb.batch')}>{found.batch.batch_no}</Descriptions.Item>
              <Descriptions.Item label={t('lb.branch')}>{branchName(found.batch.branch_id)}</Descriptions.Item>
              <Descriptions.Item label={t('lb.received')}>{found.batch.received_date}</Descriptions.Item>
              <Descriptions.Item label={t('lb.expiry')}>{found.batch.expiry_date ?? '—'}</Descriptions.Item>
              <Descriptions.Item label={t('lb.onHand')}>{found.batch.qty_on_hand} {found.batch.unit}</Descriptions.Item>
            </> : <Descriptions.Item label={t('lb.batch')}>{t('lb.notLinked')}</Descriptions.Item>}
          </Descriptions>
        )}
      </Card>

      <ResponsiveTable rowKey="range_id" loading={ranges.isLoading} dataSource={ranges.data} pagination={false}
        locale={{ emptyText: <EmptyState title={t('lb.empty')} /> }}
        cardFields={[
          { label: t('lb.run'), render: (r) => <>{r.range_no} <span className="muted">{r.count}</span></> },
          { label: t('lb.numbers'), render: (r) => `${prettyLabel(r.first)} – ${prettyLabel(r.last)}` },
          { label: t('lb.used'), render: (r) => `${r.linked} / ${r.count}` },
        ]}
        columns={[
          { title: t('lb.run'), dataIndex: 'range_no' },
          { title: t('lb.when'), dataIndex: 'created_at', render: (v: string) => new Date(v).toLocaleString('en-GB', { timeZone: 'Asia/Colombo' }) },
          { title: t('lb.count'), render: (_, r) => `${r.count} (${r.sheets} ${t('lb.sheets')})` },
          { title: t('lb.numbers'), render: (_, r) => `${prettyLabel(r.first)} – ${prettyLabel(r.last)}` },
          { title: t('lb.branch'), render: (_, r) => branchName(r.branch_id) },
          { title: t('lb.used'), render: (_, r) => `${r.linked} / ${r.count}` },
          { title: '', render: (_, r) => can('labels.print') && <Button size="small" icon={<DownloadOutlined />} onClick={() => void download(r)}>PDF</Button> },
        ]} />

      <Modal open={open} title={t('lb.print')} okText={t('lb.printOk')} onCancel={() => setOpen(false)}
        confirmLoading={print.isPending} onOk={() => form.submit()}>
        <Form form={form} layout="vertical" initialValues={{ sheets: 1 }}
          onFinish={(v: { sheets: number; branch_id?: string }) => print.mutate({ count: v.sheets * perSheet, branch_id: v.branch_id })}>
          <Form.Item name="sheets" label={t('lb.howManySheets').replace('{n}', String(perSheet))} rules={[{ required: true }]}>
            <InputNumber min={1} max={Math.floor(10000 / perSheet)} style={{ width: 160 }} />
          </Form.Item>
          <Form.Item name="branch_id" label={t('lb.forBranch')}>
            <Select allowClear placeholder={t('lb.anyBranch')}
              options={(branches.data ?? []).filter((b) => b.is_active).map((b) => ({ value: b.branch_id, label: b.name }))} />
          </Form.Item>
          <Space direction="vertical" size={2}><span className="muted">{t('lb.printNote')}</span></Space>
        </Form>
      </Modal>
    </>
  )
}
