import { PlusOutlined } from '@ant-design/icons'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Alert, App, Button, Form, Modal, Typography } from 'antd'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, errorMessage } from '../api/client'
import type { Supplier } from '../api/types'
import { useAuth } from '../auth/AuthContext'
import PageHeader from '../components/PageHeader'
import { EmptyState, StatusPill } from '../components/ui'
import { ResponsiveTable } from '../components/ui/ResponsiveTable'
import { useT } from '../i18n'
import { AppLoginFields, BankFields, DetailFields, clean } from './SupplierFields'

export default function Suppliers() {
  const { can } = useAuth()
  const { t } = useT()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { message } = App.useApp()
  const [open, setOpen] = useState(false)
  const [form] = Form.useForm()
  const list = useQuery({
    queryKey: ['suppliers'],
    queryFn: async () => (await api.get<Supplier[]>('/suppliers')).data,
  })
  const create = useMutation({
    mutationFn: async (body: Record<string, unknown>) =>
      (await api.post<Supplier>('/suppliers', clean(body))).data,
    onSuccess: (s) => {
      qc.invalidateQueries({ queryKey: ['suppliers'] })
      setOpen(false)
      form.resetFields()
      navigate(`/suppliers/${s.supplier_id}`)
    },
    onError: (e) => message.error(errorMessage(e)),
  })

  const pill = (on: boolean) => <StatusPill tone={on ? 'success' : 'neutral'}>{on ? t('sup.active') : t('sup.inactive')}</StatusPill>
  return (
    <>
      <PageHeader title={t('sl.title')} subtitle={t('sl.subtitle')}
        extra={can('suppliers.write') && (
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setOpen(true)}>
            {t('sl.new')}
          </Button>
        )} />
      <ResponsiveTable rowKey="supplier_id" loading={list.isLoading} dataSource={list.data}
        locale={{ emptyText: <EmptyState title={t('sl.empty')} /> }}
        onCardClick={(r) => navigate(`/suppliers/${r.supplier_id}`)}
        cardFields={[
          { label: t('sd.name'), render: (r) => <>{r.name} <span className="muted">{r.code}</span></> },
          { label: t('sl.contact'), render: (r) => r.contact_name ?? r.phone ?? '—' },
          { label: t('sd.creditDays'), render: (r) => (r.credit_days === 0 ? t('sup.cash') : r.credit_days) },
          { label: t('br.col.status'), render: (r) => pill(r.is_active) },
        ]}
        onRow={(r) => ({ onClick: () => navigate(`/suppliers/${r.supplier_id}`), style: { cursor: 'pointer' } })}
        columns={[
          { title: t('sd.code'), dataIndex: 'code', width: 110 },
          { title: t('sd.name'), dataIndex: 'name' },
          { title: t('sl.contact'), render: (_, r) => r.contact_name ?? r.phone ?? '—' },
          { title: t('sd.creditDays'), dataIndex: 'credit_days', align: 'right',
            render: (v: number) => (v === 0 ? t('sup.cash') : v) },
          { title: t('sl.appPhones'), render: (_, r) => r.users.filter((u) => u.is_active).length },
          { title: t('sd.notes'), dataIndex: 'notes', ellipsis: true },
          { title: t('br.col.status'), render: (_, r) => pill(r.is_active) },
        ]} />
      <Modal open={open} title={t('sl.new')} okText={t('sl.create')} onCancel={() => setOpen(false)}
        confirmLoading={create.isPending} onOk={() => form.submit()} width={560}
        styles={{ body: { maxHeight: '70vh', overflowY: 'auto' } }}>
        <Form form={form} layout="vertical" onFinish={(v) => create.mutate(v)}>
          <Alert type="info" showIcon style={{ marginBottom: 16 }}
            title={t('sl.codeInfo')} />
          <DetailFields withName />
          <AppLoginFields />
          {can('suppliers.bank') && (
            <>
              <Typography.Title level={5}>{t('sd.bank')}</Typography.Title>
              <BankFields />
            </>
          )}
        </Form>
      </Modal>
    </>
  )
}
