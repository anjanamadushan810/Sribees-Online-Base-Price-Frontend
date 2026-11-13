import { PlusOutlined } from '@ant-design/icons'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { App, Button, Form, Input, Modal, Table, Tag } from 'antd'
import { useState } from 'react'
import { api, errorMessage } from '../api/client'
import type { Branch } from '../api/types'
import { useAuth } from '../auth/AuthContext'
import PageHeader from '../components/PageHeader'

export default function Branches() {
  const { can } = useAuth()
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
  return (
    <>
      <PageHeader title="Branches" subtitle="Where supplier orders are delivered"
        extra={can('branches.write') && <Button type="primary" icon={<PlusOutlined />} onClick={() => setOpen(true)}>New branch</Button>} />
      <Table rowKey="branch_id" loading={rows.isLoading} dataSource={rows.data} pagination={false}
        columns={[
          { title: 'Code', dataIndex: 'code' },
          { title: 'Name', dataIndex: 'name' },
          { title: 'Online branch id', dataIndex: 'online_branch_id', render: (v) => v ?? '—' },
          { title: '', render: (_, b) => (b.is_active ? <Tag color="green">Active</Tag> : <Tag>Inactive</Tag>) },
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
