import { PlusOutlined } from '@ant-design/icons'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { App, Button, Checkbox, Form, Input, Modal, Select, Table, Tag } from 'antd'
import { useState } from 'react'
import { api, errorMessage } from '../api/client'
import { ROLE_LABEL, when } from '../api/lookups'
import type { Branch, User } from '../api/types'
import { useAuth } from '../auth/AuthContext'
import PageHeader from '../components/PageHeader'

export default function Users() {
  const { can } = useAuth()
  const { message } = App.useApp()
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)
  const [form] = Form.useForm()
  const rows = useQuery({ queryKey: ['users'], queryFn: async () => (await api.get<User[]>('/users')).data })
  const branches = useQuery({ queryKey: ['branches'], enabled: open, queryFn: async () => (await api.get<Branch[]>('/branches')).data })
  const create = useMutation({
    mutationFn: async (v: unknown) => api.post('/users', v),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); setOpen(false); form.resetFields() },
    onError: (e) => message.error(errorMessage(e)),
  })
  return (
    <>
      <PageHeader title="Users" subtitle="Staff who sign in to this web app"
        extra={can('users.write') && <Button type="primary" icon={<PlusOutlined />} onClick={() => setOpen(true)}>New user</Button>} />
      <Table rowKey="user_id" loading={rows.isLoading} dataSource={rows.data} pagination={false}
        columns={[
          { title: 'Name', dataIndex: 'full_name' },
          { title: 'Email', dataIndex: 'email' },
          { title: 'Role', dataIndex: 'role', render: (r: User['role']) => ROLE_LABEL[r] },
          { title: 'Branches', render: (_, u) => (u.all_branches ? 'All' : u.branches.map((b) => b.name).join(', ') || '—') },
          { title: 'Last sign-in', dataIndex: 'last_login_at', render: when },
          { title: '', render: (_, u) => (u.is_active ? <Tag color="green">Active</Tag> : <Tag>Inactive</Tag>) },
        ]} />
      <Modal open={open} title="New user" okText="Create" onCancel={() => setOpen(false)}
        confirmLoading={create.isPending} onOk={() => form.submit()}>
        <Form form={form} layout="vertical" initialValues={{ role: 'purchasing', branch_ids: [] }}
          onFinish={(v) => create.mutate(v)}>
          <Form.Item name="full_name" label="Name" rules={[{ required: true, min: 2 }]}><Input /></Form.Item>
          <Form.Item name="email" label="Email" rules={[{ required: true, type: 'email' }]}><Input /></Form.Item>
          <Form.Item name="role" label="Role">
            <Select options={Object.entries(ROLE_LABEL).map(([value, label]) => ({ value, label }))} />
          </Form.Item>
          <Form.Item name="branch_ids" label="Branches (branch managers)">
            <Select mode="multiple" loading={branches.isLoading}
              options={branches.data?.map((b) => ({ value: b.branch_id, label: b.name }))} />
          </Form.Item>
          <Form.Item name="all_branches" valuePropName="checked"><Checkbox>All branches</Checkbox></Form.Item>
          <Form.Item name="password" label="First password (12+ characters)" rules={[{ required: true, min: 12 }]}>
            <Input.Password autoComplete="new-password" />
          </Form.Item>
        </Form>
      </Modal>
    </>
  )
}
