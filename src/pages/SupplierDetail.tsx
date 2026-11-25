import { CopyOutlined, MailOutlined, PhoneOutlined, WhatsAppOutlined } from '@ant-design/icons'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Alert, App, Button, Card, Checkbox, Descriptions, Empty, Form, Input, InputNumber, Modal,
  Select, Space, Statistic, Steps, Switch, Table, Tabs, Tag, Typography,
} from 'antd'
import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { api, errorMessage } from '../api/client'
import { FLAG_LABEL, HELD_LABEL, when } from '../api/lookups'
import { formatMoney } from '../api/money'
import type { Catalog, ImportPreview, ImportResult, Supplier, SupplierUser } from '../api/types'
import { useAuth } from '../auth/AuthContext'
import PageHeader from '../components/PageHeader'
import { StatusPill } from '../components/ui'
import { useT } from '../i18n'
import MatchingPanel from './MatchingPanel'
import { fmt } from './matchingLogic'
import { catalogStats, contactLinks, importStep } from './supplierLogic'
import SupplierDetails from './SupplierDetails'
import { PasswordBox, clean } from './SupplierFields'

export default function SupplierDetail() {
  const { id = '' } = useParams()
  const { can } = useAuth()
  const { t } = useT()
  const supplier = useQuery({
    queryKey: ['supplier', id],
    queryFn: async () => (await api.get<Supplier>(`/suppliers/${id}`)).data,
  })
  // One catalogue load feeds the header facts, the tab counts and the price list tab.
  const catalog = useQuery({
    queryKey: ['catalog', id],
    queryFn: async () => (await api.get<Catalog>(`/suppliers/${id}/catalog`)).data,
  })
  const s = supplier.data
  const stats = catalogStats(catalog.data)
  const links = s ? contactLinks(s) : null
  const count = (n: number) => (n > 0 ? ` (${n})` : '')
  return (
    <>
      <PageHeader back="/suppliers" title={s?.name ?? '…'} subtitle={s ? `${s.code}${s.notes ? ` · ${s.notes}` : ''}` : undefined}
        status={s && <StatusPill tone={s.is_active ? 'success' : 'neutral'}>{s.is_active ? t('sup.active') : t('sup.inactive')}</StatusPill>} />
      {s && (
        <Card size="small" className="sup-head">
          <dl className="sup-facts">
            <div><dt>{t('sup.fact.terms')}</dt><dd>{s.credit_days === 0 ? t('sup.cash') : fmt(t('sup.creditDays'), { n: s.credit_days })}</dd></div>
            <div><dt>{t('sup.fact.lines')}</dt><dd className="num">{stats.lines}</dd></div>
            <div><dt>{t('sup.fact.held')}</dt><dd className="num">{stats.held > 0
              ? <StatusPill tone="warning">{stats.held}</StatusPill> : 0}</dd></div>
            <div><dt>{t('sup.fact.phones')}</dt><dd className="num">{s.users.length}</dd></div>
            {s.is_related_party && <div><dt>&nbsp;</dt><dd><StatusPill tone="info">{t('sup.related')}</StatusPill></dd></div>}
          </dl>
          <Space wrap className="sup-contact">
            {links?.call && <Button icon={<PhoneOutlined />} href={links.call}>{t('sup.call')} {s.phone}</Button>}
            {links?.whatsapp && <Button icon={<WhatsAppOutlined />} href={links.whatsapp} target="_blank" rel="noreferrer">{t('sup.whatsapp')}</Button>}
            {links?.email && <Button icon={<MailOutlined />} href={links.email}>{t('sup.mail')}</Button>}
          </Space>
        </Card>
      )}
      <Tabs items={[
        { key: 'details', label: t('sup.tab.details'), children: s ? <SupplierDetails supplier={s} /> : null },
        { key: 'prices', label: `${t('sup.tab.prices')}${count(stats.lines)}`, children: <CatalogView supplierId={id} /> },
        ...(can('suppliers.write')
          ? [{ key: 'import', label: t('sup.tab.import'), children: <ImportPanel supplierId={id} /> }]
          : []),
        { key: 'matching', label: t('sup.tab.matching'), children: <MatchingPanel supplierId={id} /> },
        { key: 'phones', label: `${t('sup.tab.phones')}${count(s?.users.length ?? 0)}`, children: s ? <PhonesPanel supplier={s} /> : null },
        { key: 'message', label: t('sup.tab.message'), children: <MessagePanel supplierId={id} /> },
      ]} />
    </>
  )
}

function CatalogView({ supplierId }: { supplierId: string }) {
  const { t } = useT()
  const catalog = useQuery({
    queryKey: ['catalog', supplierId],
    queryFn: async () => (await api.get<Catalog>(`/suppliers/${supplierId}/catalog`)).data,
  })
  const [q, setQ] = useState('')
  const [heldOnly, setHeldOnly] = useState(false)
  if (!catalog.data) return <Card loading />
  const all = catalog.data.sections.flatMap((s) => s.products.flatMap((p) => p.offers.map((o) => ({
    key: o.offer_id, section: s.title, heading: p.heading, productActive: p.is_active, ...o,
  }))))
  const needle = q.trim().toLowerCase()
  const rows = all.filter((r) => (!heldOnly || r.held_reason)
    && (!needle || `${r.section} ${r.heading} ${r.label}`.toLowerCase().includes(needle)))
  return (
    <>
      <div className="ord-filters">
        <Input.Search placeholder={t('sup.search')} aria-label={t('sup.search')} allowClear
          style={{ maxWidth: 320 }} onChange={(e) => setQ(e.target.value)} />
        <Checkbox checked={heldOnly} onChange={(e) => setHeldOnly(e.target.checked)}>{t('sup.heldOnly')}</Checkbox>
        <span className="ord-summary" aria-live="polite">{fmt(t('sup.linesShown'), { n: rows.length, total: all.length })}</span>
      </div>
      <Table size="small" dataSource={rows} pagination={{ pageSize: 50, hideOnSinglePage: true }}
        locale={{ emptyText: <Empty description={t('sup.priceEmpty')} /> }} columns={[
        { title: t('sup.section'), dataIndex: 'section', width: 160 },
        { title: t('sup.item'), render: (_, r) => <>{r.heading} {r.label && <Tag>{r.label}</Tag>}</> },
        { title: t('sup.ourPrice'), dataIndex: 'price', align: 'right', render: formatMoney },
        { title: t('sup.sellPrice'), dataIndex: 'mrp', align: 'right', render: formatMoney },
        { title: t('sup.perBox'), dataIndex: 'units_per_box', align: 'right', render: (v) => v ?? '?' },
        { title: '', width: 240, render: (_, r) => (
          <Space wrap>
            {r.held_reason && <StatusPill tone="danger">{HELD_LABEL[r.held_reason] ?? r.held_reason}</StatusPill>}
            {(!r.is_active || !r.productActive) && <StatusPill tone="neutral">{t('sup.notForSale')}</StatusPill>}
          </Space>
        ) },
      ]} />
    </>
  )
}

function ImportPanel({ supplierId }: { supplierId: string }) {
  const { message } = App.useApp()
  const { t } = useT()
  const qc = useQueryClient()
  const [text, setText] = useState('')
  const [preview, setPreview] = useState<ImportPreview | null>(null)
  const [result, setResult] = useState<ImportResult | null>(null)
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
      setResult(r)
      setPreview(null)
      setText('')
      qc.invalidateQueries({ queryKey: ['catalog', supplierId] })
      qc.invalidateQueries({ queryKey: ['matching', supplierId] })
    },
    onError: (e) => message.error(errorMessage(e)),
  })
  const step = importStep(!!preview, !!result)
  if (result) {
    return (
      <Space direction="vertical" style={{ width: '100%' }} size="middle">
        <Steps current={2} items={[{ title: t('sup.step.paste') }, { title: t('sup.step.check') }, { title: t('sup.step.done') }]} />
        <Alert type="success" showIcon message={t('sup.import.doneTitle')}
          description={fmt(t('sup.import.doneText'), { new: result.offers_new, changed: result.offers_changed, skipped: result.offers_skipped })} />
        <Space>
          <Button type="primary" onClick={() => setResult(null)}>{t('sup.import.another')}</Button>
        </Space>
      </Space>
    )
  }
  return (
    <Space direction="vertical" style={{ width: '100%' }} size="middle">
      <Steps current={step} items={[{ title: t('sup.step.paste') }, { title: t('sup.step.check') }, { title: t('sup.step.done') }]} />
      {!preview && <Alert type="info" showIcon message={t('sup.import.hint')} />}
      {!preview && <Input.TextArea rows={10} value={text} aria-label={t('sup.step.paste')}
        onChange={(e) => { setText(e.target.value); setPreview(null) }} />}
      {!preview && <Button type="primary" disabled={!text.trim()} loading={check.isPending}
        onClick={() => check.mutate()}>{t('sup.import.check')}</Button>}
      {preview && (
        <>
          <Space wrap size="large">
            <Statistic title={t('sup.import.new')} value={preview.new_products} />
            <Statistic title={t('sup.import.newLines')} value={preview.new_offers} />
            <Statistic title={t('sup.import.changed')} value={preview.changed_offers.length} />
            <Statistic title={t('sup.import.same')} value={preview.same_offers} />
            <Statistic title={t('sup.import.toCheck')} value={preview.flagged.length} />
          </Space>
          {preview.changed_offers.length > 0 && (
            <Table size="small" pagination={false} rowKey="line_no" dataSource={preview.changed_offers}
              columns={[
                { title: 'Item', render: (_, c) => `${c.heading} ${c.label}` },
                { title: t('sup.import.old'), dataIndex: 'old_price', align: 'right', render: formatMoney },
                { title: t('sup.import.newPrice'), dataIndex: 'new_price', align: 'right', render: formatMoney },
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
            <Button type="primary" loading={run.isPending} onClick={() => run.mutate()}>{t('sup.import.run')}</Button>
            <Button onClick={() => setPreview(null)}>{t('sup.import.back')}</Button>
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
    mutationFn: async (v: { phone: string; full_name: string; language: string;
      email?: string; password?: string }) =>
      api.post(`/suppliers/${supplier.supplier_id}/users`, clean(v)),
    onSuccess: () => { done(); setOpen(false); form.resetFields() },
    onError: (e) => message.error(errorMessage(e)),
  })
  const [pwUser, setPwUser] = useState<SupplierUser | null>(null)
  const [pwForm] = Form.useForm()
  const setPw = useMutation({
    mutationFn: async (v: { password: string }) =>
      api.post(`/suppliers/${supplier.supplier_id}/users/${pwUser!.supplier_user_id}/password`, v),
    onSuccess: () => {
      done(); setPwUser(null); pwForm.resetFields()
      message.success('Saved. Tell the supplier the new password: they change it at the next sign-in.')
    },
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
        message="These people can sign in to the supplier app: with an SMS code to the phone, and with email + password when a login is set. Turning one off signs it out at once." />
      <Table rowKey="supplier_user_id" dataSource={supplier.users} pagination={false}
        locale={{ emptyText: <Empty description="No phones yet" /> }}
        columns={[
          { title: 'Phone', dataIndex: 'phone' },
          { title: 'Name', dataIndex: 'full_name' },
          { title: 'Login email', dataIndex: 'email', render: (v: string | null, u: SupplierUser) =>
            v ? <>{v} {u.must_change_password && <Tag color="orange">Temporary password</Tag>}</> : '—' },
          { title: 'Language', dataIndex: 'language', render: (v) => (v === 'si' ? 'සිංහල' : 'English') },
          { title: 'Last sign-in', dataIndex: 'last_login_at', render: when },
          { title: 'Active', render: (_, u) => (
            <Switch checked={u.is_active} disabled={!can('suppliers.write')} loading={toggle.isPending}
              onChange={() => toggle.mutate(u)} />
          ) },
          { title: '', render: (_, u: SupplierUser) => can('suppliers.write') && u.email && (
            <Button size="small" onClick={() => setPwUser(u)}>Set new password</Button>
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
          <Form.Item name="email" label="Login email (optional)" rules={[{ type: 'email' }]}><Input /></Form.Item>
          <PasswordBox name="password" label="Temporary password (with an email)" />
        </Form>
      </Modal>
      <Modal open={!!pwUser} title={`New password for ${pwUser?.full_name ?? ''}`} okText="Save"
        onCancel={() => setPwUser(null)} confirmLoading={setPw.isPending} onOk={() => pwForm.submit()}>
        <Form form={pwForm} layout="vertical" onFinish={(v) => setPw.mutate(v)}>
          <Alert type="warning" showIcon style={{ marginBottom: 12 }}
            message="Signs the supplier out everywhere. They must change this password at the next sign-in." />
          <PasswordBox name="password" label="Temporary password" required />
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
