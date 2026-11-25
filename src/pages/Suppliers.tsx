import { PlusOutlined } from '@ant-design/icons'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Alert, App, Button, Form, Modal, Table, Tag, Typography } from 'antd'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, errorMessage } from '../api/client'
import type { Supplier } from '../api/types'
import { useAuth } from '../auth/AuthContext'
import PageHeader from '../components/PageHeader'
import { AppLoginFields, BankFields, DetailFields, clean } from './SupplierFields'

export default function Suppliers() {
  const { can } = useAuth()
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
          { title: 'Code', dataIndex: 'code', width: 110 },
          { title: 'Name', dataIndex: 'name' },
          { title: 'Contact', render: (_, r) => r.contact_name ?? r.phone ?? '—' },
          { title: 'Credit days', dataIndex: 'credit_days', align: 'right',
            render: (v: number) => (v === 0 ? 'Cash' : v) },
          { title: 'App phones', render: (_, r) => r.users.filter((u) => u.is_active).length },
          { title: 'Notes', dataIndex: 'notes', ellipsis: true },
          { title: '', render: (_, r) => (r.is_active ? <Tag color="green">Active</Tag> : <Tag>Inactive</Tag>) },
        ]} />
      <Modal open={open} title="New supplier" okText="Create" onCancel={() => setOpen(false)}
        confirmLoading={create.isPending} onOk={() => form.submit()} width={560}
        styles={{ body: { maxHeight: '70vh', overflowY: 'auto' } }}>
        <Form form={form} layout="vertical" onFinish={(v) => create.mutate(v)}>
          <Alert type="info" showIcon style={{ marginBottom: 16 }}
            title="The supplier code is given automatically. These details go to Finance, so they are typed only here." />
          <DetailFields withName />
          <AppLoginFields />
          {can('suppliers.bank') && (
            <>
              <Typography.Title level={5}>Bank details</Typography.Title>
              <BankFields />
            </>
          )}
        </Form>
      </Modal>
    </>
  )
}
