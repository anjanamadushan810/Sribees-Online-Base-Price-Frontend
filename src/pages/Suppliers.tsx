import { PlusOutlined } from '@ant-design/icons'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { App, Button, Form, Input, Modal, Table, Tag } from 'antd'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, errorMessage } from '../api/client'
import type { Supplier } from '../api/types'
import { useAuth } from '../auth/AuthContext'
import PageHeader from '../components/PageHeader'

export default function Suppliers() {
  const { can } = useAuth()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { message } = App.useApp()
  const [open, setOpen] = useState(false)
  const [form] = Form.useForm<{ name: string; notes?: string }>()
  const list = useQuery({
    queryKey: ['suppliers'],
    queryFn: async () => (await api.get<Supplier[]>('/suppliers')).data,
  })
  const create = useMutation({
    mutationFn: async (body: { name: string; notes?: string }) =>
      (await api.post<Supplier>('/suppliers', body)).data,
    onSuccess: (s) => {
      qc.invalidateQueries({ queryKey: ['suppliers'] })
      setOpen(false)
      form.resetFields()
      navigate(`/suppliers/${s.supplier_id}`)
    },
    onError: (e) => message.error(errorMessage(e)),
  })

  return (
    <>
      <PageHeader title="Suppliers" subtitle="Who sells to us, their price lists and app phones"
        extra={can('suppliers.write') && (
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setOpen(true)}>
            New supplier
          </Button>
        )} />
      <Table rowKey="supplier_id" loading={list.isLoading} dataSource={list.data}
        onRow={(r) => ({ onClick: () => navigate(`/suppliers/${r.supplier_id}`), style: { cursor: 'pointer' } })}
        columns={[
          { title: 'Name', dataIndex: 'name' },
          { title: 'App phones', render: (_, r) => r.users.filter((u) => u.is_active).length },
          { title: 'Notes', dataIndex: 'notes', ellipsis: true },
          { title: '', render: (_, r) => (r.is_active ? <Tag color="green">Active</Tag> : <Tag>Inactive</Tag>) },
        ]} />
      <Modal open={open} title="New supplier" okText="Create" onCancel={() => setOpen(false)}
        confirmLoading={create.isPending} onOk={() => form.submit()}>
        <Form form={form} layout="vertical" onFinish={(v) => create.mutate(v)}>
          <Form.Item name="name" label="Name" rules={[{ required: true, min: 2 }]}>
            <Input autoFocus />
          </Form.Item>
          <Form.Item name="notes" label="Notes">
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>
    </>
  )
}
