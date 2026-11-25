import { useMutation, useQueryClient } from '@tanstack/react-query'
import { App, Button, Card, Descriptions, Form, Modal, Space, Tag } from 'antd'
import { useState } from 'react'
import { api, errorMessage } from '../api/client'
import type { Supplier } from '../api/types'
import { useAuth } from '../auth/AuthContext'
import { useT } from '../i18n'
import { BankFields, DetailFields, clean } from './SupplierFields'

const dash = (v: string | null | undefined) => v || '—'

/** The supplier's business details (everyone) and bank details (owner and accountant). */
export default function SupplierDetails({ supplier }: { supplier: Supplier }) {
  const { can } = useAuth()
  const { t } = useT()
  const [editing, setEditing] = useState<'details' | 'bank' | null>(null)
  const canBank = can('suppliers.bank')
  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <Card title={t('sd.details')} extra={can('suppliers.write') && (
        <Button onClick={() => setEditing('details')}>{t('sd.edit')}</Button>)}>
        <Descriptions size="small" column={{ xs: 1, md: 2 }} items={[
          { key: 'code', label: t('sd.code'), children: supplier.code },
          { key: 'name', label: t('sd.name'), children: supplier.name },
          { key: 'contact', label: t('sd.contact'), children: dash(supplier.contact_name) },
          { key: 'phone', label: t('sd.phone'), children: dash(supplier.phone) },
          { key: 'email', label: t('sd.email'), children: dash(supplier.email) },
          { key: 'credit', label: t('sd.creditDays'),
            children: supplier.credit_days === 0 ? t('sup.cash') : supplier.credit_days },
          { key: 'rel', label: t('sd.related'),
            children: supplier.is_related_party ? <Tag color="orange">{t('sd.yes')}</Tag> : t('sd.no') },
          { key: 'addr', label: t('sd.address'), span: 2, children: dash(supplier.address) },
          { key: 'notes', label: t('sd.notes'), span: 2, children: dash(supplier.notes) },
        ]} />
      </Card>
      {canBank && (
        <Card title={t('sd.bank')} extra={<Button onClick={() => setEditing('bank')}>{t('sd.edit')}</Button>}>
          <Descriptions size="small" column={{ xs: 1, md: 2 }} items={[
            { key: 'bank', label: t('sd.bankName'), children: dash(supplier.bank_name) },
            { key: 'branch', label: t('sd.bankBranch'), children: dash(supplier.bank_branch) },
            { key: 'an', label: t('sd.accName'), children: dash(supplier.bank_account_name) },
            { key: 'no', label: t('sd.accNo'), children: dash(supplier.bank_account_no) },
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
  const { t } = useT()
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
      message.success(t('sd.saved'))
      onClose()
    },
    onError: (e) => message.error(errorMessage(e)),
  })
  return (
    <Modal open title={kind === 'bank' ? t('sd.editBank') : t('sd.editDetails')} okText={t('sd.save')}
      onCancel={onClose} confirmLoading={save.isPending} onOk={() => form.submit()} width={560}
      styles={{ body: { maxHeight: '70vh', overflowY: 'auto' } }}>
      <Form form={form} layout="vertical" initialValues={supplier}
        onFinish={(v) => save.mutate(v)}>
        {kind === 'bank' ? <BankFields /> : <DetailFields withName />}
      </Form>
    </Modal>
  )
}
