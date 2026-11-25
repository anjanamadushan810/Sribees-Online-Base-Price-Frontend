import { PlusOutlined } from '@ant-design/icons'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { App, Button, Form, Input, Modal, Space } from 'antd'
import { useState } from 'react'
import { api, errorMessage } from '../api/client'
import type { Branch } from '../api/types'
import { useAuth } from '../auth/AuthContext'
import PageHeader from '../components/PageHeader'
import { SyncOnlineButton } from '../components/SyncOnline'
import { EmptyState, StatusPill } from '../components/ui'
import { useT } from '../i18n'
import { ResponsiveTable } from '../components/ui/ResponsiveTable'

export default function Branches() {
  const { can } = useAuth()
  const { t } = useT()
  const { message } = App.useApp()
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)
  const [form] = Form.useForm()
  const rows = useQuery({ queryKey: ['branches'], queryFn: async () => (await api.get<Branch[]>('/branches')).data })
  const create = useMutation({
    mutationFn: async (v: { code: string; name: string; online_branch_id?: string }) => api.post('/branches', v),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['branches'] }); setOpen(false); form.resetFields() },
    onError: (e) => message.error(errorMessage(e)),
  })
  const pill = (on: boolean) => <StatusPill tone={on ? 'success' : 'neutral'}>{on ? t('sup.active') : t('sup.inactive')}</StatusPill>
  return (
    <>
      <PageHeader title={t('br.title')} subtitle={t('br.subtitle')}
        extra={<Space wrap>
          <SyncOnlineButton type="primary" />
          {can('branches.write') && <Button icon={<PlusOutlined />} onClick={() => setOpen(true)}>{t('br.new')}</Button>}
        </Space>} />
      <ResponsiveTable rowKey="branch_id" loading={rows.isLoading} dataSource={rows.data} pagination={false}
        locale={{ emptyText: <EmptyState title={t('br.empty')} /> }}
        cardFields={[
          { label: t('br.col.name'), render: (b) => <>{b.name} <span className="muted">{b.code}</span></> },
          { label: t('br.col.status'), render: (b) => pill(b.is_active) },
          { label: t('br.col.online'), render: (b) => b.online_branch_id ?? '—' },
        ]}
        columns={[
          { title: t('br.col.code'), dataIndex: 'code' },
          { title: t('br.col.name'), dataIndex: 'name' },
          { title: t('br.col.online'), dataIndex: 'online_branch_id', render: (v) => v ?? '—' },
          { title: t('br.col.status'), render: (_, b) => pill(b.is_active) },
        ]} />
      <Modal open={open} title="New branch" okText="Create" onCancel={() => setOpen(false)}
        confirmLoading={create.isPending} onOk={() => form.submit()}>
        <Form form={form} layout="vertical" onFinish={(v) => create.mutate(v)}>
          <Form.Item name="code" label="Code" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="name" label="Name" rules={[{ required: true, min: 2 }]}><Input /></Form.Item>
          <Form.Item name="online_branch_id" label="SRIBEESonline branch id (needed before orders go to Finance)" rules={[{ pattern: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, message: 'Online branch id (uuid)' }]}><Input placeholder="uuid from Online admin" /></Form.Item>
        </Form>
      </Modal>
    </>
  )
}
