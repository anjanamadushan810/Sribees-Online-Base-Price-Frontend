import { useMutation, useQueryClient } from '@tanstack/react-query'
import { App, Button, Card, Descriptions, Form, Modal, Space, Tag } from 'antd'
import { useState } from 'react'
import { api, errorMessage } from '../api/client'
import type { Supplier } from '../api/types'
import { useAuth } from '../auth/AuthContext'
import { BankFields, DetailFields, clean } from './SupplierFields'

const dash = (v: string | null | undefined) => v || '—'

/** The supplier's business details (everyone) and bank details (owner and accountant). */
export default function SupplierDetails({ supplier }: { supplier: Supplier }) {
  const { can } = useAuth()
  const [editing, setEditing] = useState<'details' | 'bank' | null>(null)
  const canBank = can('suppliers.bank')
  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <Card title="Details" extra={can('suppliers.write') && (
        <Button onClick={() => setEditing('details')}>Edit</Button>)}>
        <Descriptions size="small" column={{ xs: 1, md: 2 }} items={[
          { key: 'code', label: 'Code', children: supplier.code },
          { key: 'name', label: 'Name', children: supplier.name },
          { key: 'contact', label: 'Contact person', children: dash(supplier.contact_name) },
          { key: 'phone', label: 'Phone', children: dash(supplier.phone) },
          { key: 'email', label: 'Email', children: dash(supplier.email) },
          { key: 'credit', label: 'Credit days',
            children: supplier.credit_days === 0 ? 'Cash' : supplier.credit_days },
          { key: 'rel', label: 'Related party',
            children: supplier.is_related_party ? <Tag color="orange">Yes</Tag> : 'No' },
          { key: 'addr', label: 'Address', span: 2, children: dash(supplier.address) },
          { key: 'notes', label: 'Notes', span: 2, children: dash(supplier.notes) },
        ]} />
      </Card>
      {canBank && (
        <Card title="Bank details" extra={<Button onClick={() => setEditing('bank')}>Edit</Button>}>
          <Descriptions size="small" column={{ xs: 1, md: 2 }} items={[
            { key: 'bank', label: 'Bank', children: dash(supplier.bank_name) },
            { key: 'branch', label: 'Branch', children: dash(supplier.bank_branch) },
            { key: 'an', label: 'Account name', children: dash(supplier.bank_account_name) },
            { key: 'no', label: 'Account number', children: dash(supplier.bank_account_no) },
          ]} />
        </Card>
      )}
      {editing && <EditModal supplier={supplier} kind={editing} onClose={() => setEditing(null)} />}
    </Space>
  )
}

function EditModal({ supplier, kind, onClose }: {
  supplier: Supplier; kind: 'details' | 'bank'; onClose: () => void
}) {
  const [form] = Form.useForm()
  const qc = useQueryClient()
  const { message } = App.useApp()
  const save = useMutation({
    mutationFn: async (v: Record<string, unknown>) => {
      const path = kind === 'bank' ? `/suppliers/${supplier.supplier_id}/bank`
        : `/suppliers/${supplier.supplier_id}`
      return (await api.patch<Supplier>(path, clean(v))).data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['supplier', supplier.supplier_id] })
      qc.invalidateQueries({ queryKey: ['suppliers'] })
      message.success('Saved. Finance gets the change automatically.')
      onClose()
    },
    onError: (e) => message.error(errorMessage(e)),
  })
  return (
    <Modal open title={kind === 'bank' ? 'Edit bank details' : 'Edit details'} okText="Save"
      onCancel={onClose} confirmLoading={save.isPending} onOk={() => form.submit()} width={560}
      styles={{ body: { maxHeight: '70vh', overflowY: 'auto' } }}>
      <Form form={form} layout="vertical" initialValues={supplier}
        onFinish={(v) => save.mutate(v)}>
        {kind === 'bank' ? <BankFields /> : <DetailFields withName />}
      </Form>
    </Modal>
  )
}
