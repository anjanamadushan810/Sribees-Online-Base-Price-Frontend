import { DeleteOutlined, PlusOutlined, ShoppingOutlined } from '@ant-design/icons'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Alert, App, AutoComplete, Button, Card, DatePicker, Form, Input, InputNumber, Result, Select, Space, Table } from 'antd'
import dayjs, { type Dayjs } from 'dayjs'
import { useState } from 'react'
import { api, errorMessage } from '../api/client'
import { formatMoney, fromCents, isValidAmount, toCents } from '../api/money'
import type { Branch, Supplier } from '../api/types'
import PageHeader from '../components/PageHeader'
import { useT } from '../i18n'
import { labelLooksValid } from './labelLogic'

interface Item { online_variant_id: string; name: string; name_si: string | null; variant: string; weight_grams: number | null }
interface Line {
  key: string; item?: Item; units: number; free_units: number; unit_price: string
  expiry?: Dayjs | null; labels: string
}
interface Done { order_no: string; receipt: { receipt_no: string; total: string } }

const newLine = (): Line => ({ key: crypto.randomUUID(), units: 1, free_units: 0, unit_price: '', labels: '' })

function ItemPicker({ value, onChange }: { value?: Item; onChange: (i: Item) => void }) {
  const { t } = useT()
  const [q, setQ] = useState('')
  const found = useQuery({
    queryKey: ['qb-items', q], enabled: q.trim().length >= 2,
    queryFn: async () => (await api.get<Item[]>('/quick-buys/items', { params: { q } })).data,
  })
  const label = (i: Item) => `${i.name}${i.variant ? ` · ${i.variant}` : ''}`
  return (
    <AutoComplete style={{ width: 280 }} value={value ? label(value) : q} placeholder={t('qb.searchItem')}
      onSearch={setQ} onChange={(v) => setQ(v)}
      options={(found.data ?? []).map((i) => ({ value: i.online_variant_id, label: `${label(i)}${i.name_si ? ` (${i.name_si})` : ''}` }))}
      onSelect={(id: string) => { const i = found.data?.find((x) => x.online_variant_id === id); if (i) onChange(i) }} />
  )
}

export default function QuickBuy() {
  const { t } = useT()
  const { message } = App.useApp()
  const [form] = Form.useForm()
  const [lines, setLines] = useState<Line[]>([newLine()])
  const [done, setDone] = useState<Done | null>(null)
  const suppliers = useQuery({ queryKey: ['suppliers'], queryFn: async () => (await api.get<Supplier[]>('/suppliers')).data })
  const branches = useQuery({ queryKey: ['branches'], queryFn: async () => (await api.get<Branch[]>('/branches')).data })
  // a supplier on the app (Nishi Palace) may be paid at their counter too (owner 2026-11-26)
  const shops = (suppliers.data ?? []).filter((s) => s.is_active)

  const set = (key: string, patch: Partial<Line>) => setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...patch } : l)))
  const totalCents = lines.reduce((sum, l) => sum + toCents(l.unit_price || '0') * (l.units || 0), 0)
  const billCents = toCents(Form.useWatch('bill_total', form) ?? '')
  const transport: string = Form.useWatch('transport_charge', form) ?? ''
  const transportCents = isValidAmount(transport) ? toCents(transport) : 0

  const save = useMutation({
    mutationFn: async (v: { supplier_id: string; branch_id: string; received_date: Dayjs; bill_no?: string; bill_total?: string; transport_charge?: string; notes?: string }) =>
      (await api.post<Done>('/quick-buys', {
        ...v, received_date: v.received_date.format('YYYY-MM-DD'),
        bill_total: v.bill_total || null, bill_no: v.bill_no || null,
        transport_charge: v.transport_charge || null,
        lines: lines.map((l) => ({
          online_variant_id: l.item!.online_variant_id, units: l.units, free_units: l.free_units,
          unit_price: l.unit_price, expiry_date: l.expiry ? l.expiry.format('YYYY-MM-DD') : null,
          labels: l.labels.split(/[\s,]+/).filter(Boolean),
        })),
      })).data,
    onSuccess: (d) => setDone(d),
    onError: (e) => message.error(errorMessage(e)),
  })

  const submit = (v: Parameters<typeof save.mutate>[0]) => {
    const bad = lines.find((l) => !l.item || !l.units || !/^\d+(\.\d{1,2})?$/.test(l.unit_price))
    if (bad) { message.warning(t('qb.fillLines')); return }
    const badLabel = lines.flatMap((l) => l.labels.split(/[\s,]+/).filter(Boolean)).find((n) => !labelLooksValid(n))
    if (badLabel) { message.warning(`${t('lb.badNumber')} (${badLabel})`); return }
    save.mutate(v)
  }

  if (done) {
    return <Result status="success" title={t('qb.done')}
      subTitle={`${done.order_no} · ${done.receipt.receipt_no} · Rs ${formatMoney(done.receipt.total)}`}
      extra={<Button type="primary" onClick={() => { setDone(null); setLines([newLine()]); form.resetFields() }}>{t('qb.another')}</Button>} />
  }

  return (
    <>
      <PageHeader title={t('qb.title')} subtitle={t('qb.subtitle')} />
      <Form form={form} layout="vertical" onFinish={submit} initialValues={{ received_date: dayjs() }}>
        <Card size="small" style={{ marginBottom: 16 }}>
          <Space wrap size="large" align="start">
            <Form.Item name="supplier_id" label={t('qb.shop')} rules={[{ required: true }]} extra={t('qb.shopHint')}>
              <Select showSearch optionFilterProp="label" style={{ width: 260 }}
                options={shops.map((s) => ({ value: s.supplier_id, label: `${s.name} (${s.code})` }))} />
            </Form.Item>
            <Form.Item name="branch_id" label={t('lb.branch')} rules={[{ required: true }]}>
              <Select style={{ width: 200 }} options={(branches.data ?? []).filter((b) => b.is_active).map((b) => ({ value: b.branch_id, label: b.name }))} />
            </Form.Item>
            <Form.Item name="received_date" label={t('qb.date')} rules={[{ required: true }]}>
              <DatePicker disabledDate={(d) => d.isAfter(dayjs(), 'day') || d.isBefore(dayjs().subtract(89, 'day'), 'day')} />
            </Form.Item>
            <Form.Item name="bill_no" label={t('qb.billNo')}><Input style={{ width: 160 }} maxLength={60} /></Form.Item>
            <Form.Item name="bill_total" label={t('qb.billTotal')} rules={[{ pattern: /^\d+(\.\d{1,2})?$/, message: t('qb.money') }]}>
              <Input style={{ width: 160 }} prefix="Rs" inputMode="decimal" />
            </Form.Item>
            <Form.Item name="transport_charge" label={t('rcv.transport')} extra={t('rcv.transportHint')}
              rules={[{ pattern: /^\d+(\.\d{1,2})?$/, message: t('qb.money') }]}>
              <Input style={{ width: 160 }} prefix="Rs" inputMode="decimal" />
            </Form.Item>
          </Space>
        </Card>
        <Table rowKey="key" size="small" pagination={false} dataSource={lines} scroll={{ x: 900 }}
          columns={[
            { title: t('lb.product'), render: (_, l) => <ItemPicker value={l.item} onChange={(i) => set(l.key, { item: i })} /> },
            { title: t('qb.units'), render: (_, l) => <InputNumber min={1} value={l.units} onChange={(v) => set(l.key, { units: Number(v) || 0 })} /> },
            { title: t('qb.free'), render: (_, l) => <InputNumber min={0} value={l.free_units} onChange={(v) => set(l.key, { free_units: Number(v) || 0 })} /> },
            { title: t('qb.price'), render: (_, l) => <Input style={{ width: 110 }} prefix="Rs" inputMode="decimal" value={l.unit_price} onChange={(e) => set(l.key, { unit_price: e.target.value.trim() })} /> },
            { title: t('lb.expiry'), render: (_, l) => <DatePicker value={l.expiry ?? null} onChange={(d) => set(l.key, { expiry: d })} /> },
            { title: t('qb.labels'), render: (_, l) => <Input.TextArea autoSize={{ minRows: 1, maxRows: 4 }} style={{ width: 200 }} placeholder={t('qb.labelsHint')} value={l.labels} onChange={(e) => set(l.key, { labels: e.target.value })} /> },
            { title: '', render: (_, l) => lines.length > 1 && <Button type="text" danger icon={<DeleteOutlined />} onClick={() => setLines((ls) => ls.filter((x) => x.key !== l.key))} /> },
          ]} />
        <Space style={{ marginTop: 12 }} wrap>
          <Button icon={<PlusOutlined />} onClick={() => setLines((ls) => [...ls, newLine()])}>{t('qb.addItem')}</Button>
          <span>{t('qb.itemsTotal')}: <b>Rs {formatMoney(fromCents(totalCents))}</b></span>
          {transportCents > 0 && <span>{t('rcv.total')}: <b>Rs {formatMoney(fromCents(totalCents + transportCents))}</b></span>}
        </Space>
        {billCents > 0 && billCents !== totalCents + transportCents && (
          <Alert style={{ marginTop: 12 }} type="warning" showIcon message={t('rcv.billDiffers')} />
        )}
        <div style={{ marginTop: 16 }}>
          <Button type="primary" size="large" htmlType="submit" icon={<ShoppingOutlined />} loading={save.isPending}>{t('qb.save')}</Button>
        </div>
      </Form>
    </>
  )
}
