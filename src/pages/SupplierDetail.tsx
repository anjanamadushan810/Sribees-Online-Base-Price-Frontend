import { CopyOutlined } from '@ant-design/icons'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Alert, App, Button, Card, Checkbox, Descriptions, Empty, Form, Input, InputNumber, Modal,
  Select, Space, Statistic, Switch, Table, Tabs, Tag, Typography,
} from 'antd'
import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { api, errorMessage } from '../api/client'
import { FLAG_LABEL, HELD_LABEL, when } from '../api/lookups'
import { formatMoney } from '../api/money'
import type { Catalog, ImportPreview, ImportResult, Supplier, SupplierUser } from '../api/types'
import { useAuth } from '../auth/AuthContext'
import PageHeader from '../components/PageHeader'
import MatchingPanel from './MatchingPanel'

export default function SupplierDetail() {
  const { id = '' } = useParams()
  const { can } = useAuth()
  const supplier = useQuery({
    queryKey: ['supplier', id],
    queryFn: async () => (await api.get<Supplier>(`/suppliers/${id}`)).data,
  })
  const s = supplier.data
  return (
    <>
      <PageHeader back="/suppliers" title={s?.name ?? '…'}
        subtitle={s?.notes ?? undefined}
        extra={s && !s.is_active && <Tag>Inactive</Tag>} />
      <Tabs items={[
        { key: 'prices', label: 'Price list', children: <CatalogView supplierId={id} /> },
        ...(can('suppliers.write')
          ? [{ key: 'import', label: 'Import WhatsApp list', children: <ImportPanel supplierId={id} /> }]
          : []),
        { key: 'matching', label: 'Matching', children: <MatchingPanel supplierId={id} /> },
        { key: 'phones', label: 'App phones', children: s ? <PhonesPanel supplier={s} /> : null },
        { key: 'message', label: 'WhatsApp message', children: <MessagePanel supplierId={id} /> },
      ]} />
    </>
  )
}

function CatalogView({ supplierId }: { supplierId: string }) {
  const catalog = useQuery({
    queryKey: ['catalog', supplierId],
    queryFn: async () => (await api.get<Catalog>(`/suppliers/${supplierId}/catalog`)).data,
  })
  const [q, setQ] = useState('')
  if (!catalog.data) return <Card loading />
  const rows = catalog.data.sections.flatMap((s) => s.products.flatMap((p) => p.offers.map((o) => ({
    key: o.offer_id, section: s.title, heading: p.heading, productActive: p.is_active, ...o,
  })))).filter((r) => !q || `${r.section} ${r.heading} ${r.label}`.toLowerCase().includes(q.toLowerCase()))
  return (
    <>
      <Input.Search placeholder="Search item" allowClear style={{ maxWidth: 320, marginBottom: 12 }}
        onChange={(e) => setQ(e.target.value)} />
      <Table size="small" dataSource={rows} pagination={{ pageSize: 50 }} columns={[
        { title: 'Section', dataIndex: 'section', width: 160 },
        { title: 'Item', render: (_, r) => <>{r.heading} {r.label && <Tag>{r.label}</Tag>}</> },
        { title: 'Our price', dataIndex: 'price', align: 'right', render: formatMoney },
        { title: 'Selling price', dataIndex: 'mrp', align: 'right', render: formatMoney },
        { title: 'Per box', dataIndex: 'units_per_box', align: 'right', render: (v) => v ?? '?' },
        { title: '', width: 220, render: (_, r) => (
          <Space wrap>
            {r.held_reason && <Tag color="red">{HELD_LABEL[r.held_reason] ?? r.held_reason}</Tag>}
            {(!r.is_active || !r.productActive) && <Tag>Not for sale</Tag>}
          </Space>
        ) },
      ]} />
    </>
  )
}

function ImportPanel({ supplierId }: { supplierId: string }) {
  const { message } = App.useApp()
  const qc = useQueryClient()
  const [text, setText] = useState('')
  const [preview, setPreview] = useState<ImportPreview | null>(null)
  const [answers, setAnswers] = useState<Record<number, { skip: boolean; price?: string; mrp?: string; units?: number }>>({})
  const check = useMutation({
    mutationFn: async () => (await api.post<ImportPreview>(`/suppliers/${supplierId}/catalog/import/preview`, { text })).data,
    onSuccess: (p) => {
      setPreview(p)
      setAnswers(Object.fromEntries(p.flagged.map((f) => [f.line_no, {
        skip: false, price: f.price, mrp: f.mrp ?? undefined, units: f.units_per_box ?? undefined,
      }])))
    },
    onError: (e) => message.error(errorMessage(e)),
  })
  const run = useMutation({
    mutationFn: async () => (await api.post<ImportResult>(`/suppliers/${supplierId}/catalog/import`, {
      text,
      resolutions: Object.entries(answers).map(([line, a]) => a.skip
        ? { line_no: Number(line), skip: true }
        : { line_no: Number(line), price: a.price, mrp: a.mrp || undefined, units_per_box: a.units }),
    })).data,
    onSuccess: (r) => {
      message.success(`Imported: ${r.offers_new} new, ${r.offers_changed} changed, ${r.offers_skipped} skipped`)
      setPreview(null)
      setText('')
      qc.invalidateQueries({ queryKey: ['catalog', supplierId] })
    },
    onError: (e) => message.error(errorMessage(e)),
  })
  return (
    <Space direction="vertical" style={{ width: '100%' }} size="middle">
      <Alert type="info" showIcon message="Paste the supplier's WhatsApp price list. Nothing changes until you press Import; items missing from the paste are left as they are." />
      <Input.TextArea rows={10} value={text} onChange={(e) => { setText(e.target.value); setPreview(null) }} />
      {!preview && <Button type="primary" disabled={!text.trim()} loading={check.isPending}
        onClick={() => check.mutate()}>Check</Button>}
      {preview && (
        <>
          <Space wrap size="large">
            <Statistic title="New items" value={preview.new_products} />
            <Statistic title="New price lines" value={preview.new_offers} />
            <Statistic title="Changed prices" value={preview.changed_offers.length} />
            <Statistic title="Unchanged" value={preview.same_offers} />
            <Statistic title="To check" value={preview.flagged.length} />
          </Space>
          {preview.changed_offers.length > 0 && (
            <Table size="small" pagination={false} rowKey="line_no" dataSource={preview.changed_offers}
              columns={[
                { title: 'Item', render: (_, c) => `${c.heading} ${c.label}` },
                { title: 'Old', dataIndex: 'old_price', align: 'right', render: formatMoney },
                { title: 'New', dataIndex: 'new_price', align: 'right', render: formatMoney },
              ]} />
          )}
          {preview.held.length > 0 && (
            <Alert type="warning" showIcon message="Will be held (our price above selling price)"
              description={preview.held.map((h) => `${h.heading} ${h.raw}`).join(' · ')} />
          )}
          {preview.reshaped.length > 0 && (
            <Alert type="warning" showIcon message="Check these prices after import (a group of same-note lines changed size)"
              description={preview.reshaped.map((r) => `${r.heading} ${r.label}`).join(' · ')} />
          )}
          {preview.flagged.map((f) => {
            const a = answers[f.line_no]
            const set = (p: Partial<typeof a>) => setAnswers({ ...answers, [f.line_no]: { ...a, ...p } })
            return (
              <Card key={f.line_no} size="small"
                title={`Line ${f.line_no}: ${f.heading}`}
                extra={f.flags.map((x) => <Tag key={x} color="orange">{FLAG_LABEL[x] ?? x}</Tag>)}>
                <Typography.Text code>{f.raw}</Typography.Text>
                <Space wrap style={{ marginTop: 8, display: 'flex' }}>
                  <Input addonBefore="Our price" style={{ width: 180 }} disabled={a.skip} value={a.price}
                    onChange={(e) => set({ price: e.target.value })} />
                  <Input addonBefore="Selling price" style={{ width: 200 }} disabled={a.skip} value={a.mrp}
                    onChange={(e) => set({ mrp: e.target.value })} />
                  <InputNumber addonBefore="Per box" min={1} style={{ width: 170 }} disabled={a.skip}
                    value={a.units} onChange={(v) => set({ units: v ?? undefined })} />
                  <Checkbox checked={a.skip} onChange={(e) => set({ skip: e.target.checked })}>Skip</Checkbox>
                </Space>
              </Card>
            )
          })}
          <Space>
            <Button type="primary" loading={run.isPending} onClick={() => run.mutate()}>Import</Button>
            <Button onClick={() => setPreview(null)}>Back</Button>
          </Space>
        </>
      )}
    </Space>
  )
}

function PhonesPanel({ supplier }: { supplier: Supplier }) {
  const { can } = useAuth()
  const { message } = App.useApp()
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)
  const [form] = Form.useForm()
  const done = () => qc.invalidateQueries({ queryKey: ['supplier', supplier.supplier_id] })
  const add = useMutation({
    mutationFn: async (v: { phone: string; full_name: string; language: string }) =>
      api.post(`/suppliers/${supplier.supplier_id}/users`, v),
    onSuccess: () => { done(); setOpen(false); form.resetFields() },
    onError: (e) => message.error(errorMessage(e)),
  })
  const toggle = useMutation({
    mutationFn: async (u: SupplierUser) =>
      api.patch(`/suppliers/${supplier.supplier_id}/users/${u.supplier_user_id}`, { is_active: !u.is_active }),
    onSuccess: done,
    onError: (e) => message.error(errorMessage(e)),
  })
  return (
    <>
      <Alert type="info" showIcon style={{ marginBottom: 12 }}
        message="These numbers can sign in to the supplier app with an SMS code. Turning one off signs it out at once." />
      <Table rowKey="supplier_user_id" dataSource={supplier.users} pagination={false}
        locale={{ emptyText: <Empty description="No phones yet" /> }}
        columns={[
          { title: 'Phone', dataIndex: 'phone' },
          { title: 'Name', dataIndex: 'full_name' },
          { title: 'Language', dataIndex: 'language', render: (v) => (v === 'si' ? 'සිංහල' : 'English') },
          { title: 'Last sign-in', dataIndex: 'last_login_at', render: when },
          { title: 'Active', render: (_, u) => (
            <Switch checked={u.is_active} disabled={!can('suppliers.write')} loading={toggle.isPending}
              onChange={() => toggle.mutate(u)} />
          ) },
        ]} />
      {can('suppliers.write') && <Button style={{ marginTop: 12 }} onClick={() => setOpen(true)}>Add phone</Button>}
      <Modal open={open} title="Add app phone" okText="Add" onCancel={() => setOpen(false)}
        confirmLoading={add.isPending} onOk={() => form.submit()}>
        <Form form={form} layout="vertical" initialValues={{ language: 'si' }} onFinish={(v) => add.mutate(v)}>
          <Form.Item name="phone" label="Mobile number" rules={[{ required: true }]}>
            <Input placeholder="07X XXX XXXX" />
          </Form.Item>
          <Form.Item name="full_name" label="Name" rules={[{ required: true, min: 2 }]}><Input /></Form.Item>
          <Form.Item name="language" label="App and SMS language">
            <Select options={[{ value: 'si', label: 'සිංහල' }, { value: 'en', label: 'English' }]} />
          </Form.Item>
        </Form>
      </Modal>
    </>
  )
}

function MessagePanel({ supplierId }: { supplierId: string }) {
  const { message } = App.useApp()
  const msg = useQuery({
    queryKey: ['message', supplierId],
    queryFn: async () => (await api.get<{ text: string }>(`/suppliers/${supplierId}/catalog/message`)).data.text,
  })
  return (
    <Card loading={msg.isLoading} extra={
      <Button icon={<CopyOutlined />} onClick={() => {
        void navigator.clipboard.writeText(msg.data ?? '')
        message.success('Copied')
      }}>Copy</Button>}>
      <Descriptions size="small" items={[{ key: 'n', label: 'Characters', children: msg.data?.length ?? 0 }]} />
      <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit', marginTop: 12 }}>{msg.data}</pre>
    </Card>
  )
}
