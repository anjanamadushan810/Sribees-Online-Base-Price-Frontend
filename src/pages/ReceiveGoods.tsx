import { DeleteOutlined, InboxOutlined, PlusOutlined, ReloadOutlined, SplitCellsOutlined } from '@ant-design/icons'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Alert, App, Button, Card, DatePicker, Divider, Form, Input, InputNumber, List, Modal, Select, Space, Tag, Tooltip, Typography } from 'antd'
import dayjs, { type Dayjs } from 'dayjs'
import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { api, errorMessage } from '../api/client'
import { formatMoney, fromCents, isValidAmount, toCents } from '../api/money'
import { useAuth } from '../auth/AuthContext'
import PageHeader from '../components/PageHeader'
import ProductPhoto from '../components/ProductPhoto'
import { ErrorState, PageSkeleton } from '../components/ui'
import { useT } from '../i18n'
import {
  cameParts, canReceive, extraLine, goodsCents, nextPart, partUnits, problem, receiptLines, shortUnits,
  startEntry, type Entry, type FormLine, type Parts, type ReceivingForm,
} from './receiveLogic'
import { fmt } from './textFormat'

interface Preview {
  transport_charge: string; total: string; transport_cap: string; over_cap: boolean
  missing_weight: string[]
  lines: { order_line_id: string; transport: string | null; delivered_unit_price: string | null }[]
}

interface Receipt {
  receipt_id: string; receipt_no: string; received_date: string; total: string
  transport_charge: string; invoice_no: string | null
}

const MAX_PARTS = 10 // parts of one line: more looks like a mistake

interface Send { receipt_line_id: string; product_name: string; status: 'pending' | 'sent' | 'refused'; reason: string | null }

/** Whether the shop's stock has gone up for one receipt, and "send again" for refusals. */
function OnlineState({ receipt }: { receipt: Receipt }) {
  const { t } = useT()
  const { can } = useAuth()
  const { message } = App.useApp()
  const sends = useQuery({
    queryKey: ['online-stock', receipt.receipt_id],
    queryFn: async () => (await api.get<Send[]>(`/receipts/${receipt.receipt_id}/online-stock`)).data,
    // the worker sends within seconds: look again while something is waiting
    refetchInterval: (q) => (q.state.data?.some((s) => s.status === 'pending') ? 5000 : false),
  })
  const retry = useMutation({
    mutationFn: async () => api.post(`/receipts/${receipt.receipt_id}/online-stock/retry`),
    onSuccess: () => void sends.refetch(),
    onError: (e) => message.error(errorMessage(e)),
  })
  const rows = sends.data ?? []
  const count = (s: Send['status']) => rows.filter((r) => r.status === s).length
  const refused = rows.filter((r) => r.status === 'refused')
  return (
    <Card size="small" style={{ marginBottom: 12 }}
      title={`${receipt.receipt_no} · ${receipt.received_date} · Rs ${formatMoney(receipt.total)}`}>
      <p>{fmt(t('rcv.transportWas'), { amount: formatMoney(receipt.transport_charge) })}</p>
      {sends.isSuccess && !rows.length && <Alert type="info" showIcon message={t('rcv.online.off')} />}
      {rows.length > 0 && (
        <Space wrap>
          {count('sent') > 0 && <Tag color="green">{fmt(t('rcv.online.sent'), { n: count('sent') })}</Tag>}
          {count('pending') > 0 && <Tag color="gold">{fmt(t('rcv.online.pending'), { n: count('pending') })}</Tag>}
          {refused.length > 0 && <Tag color="red">{fmt(t('rcv.online.refused'), { n: refused.length })}</Tag>}
        </Space>
      )}
      {refused.length > 0 && (
        <Alert style={{ marginTop: 8 }} type="error" showIcon message={t('rcv.online.fix')}
          description={<ul>{refused.map((r) => <li key={r.receipt_line_id}>{r.product_name}: {r.reason}</li>)}</ul>}
          action={can('grn.create') && <Button icon={<ReloadOutlined />} loading={retry.isPending}
            onClick={() => retry.mutate()}>{t('rcv.online.again')}</Button>} />
      )}
    </Card>
  )
}

type Shown = Preview['lines'][number]

/** One part of a line (owner 2026-11-27): its own units, price, MRP, expiry and QR labels;
 *  it becomes its own batch. */
function PartForm({ line, entry, max, shown, labelsRequired, title, onChange, onRemove }: {
  line: FormLine; entry: Entry; max: number; shown?: Shown; labelsRequired: boolean
  title?: string; onChange: (patch: Partial<Entry>) => void; onRemove?: () => void
}) {
  const { t, lang } = useT()
  const name = `${lang === 'si' && line.name_si ? line.name_si : line.name}${title ? ` ${title}` : ''}`
  const came = !!entry.units
  const money = (key: 'unit_price' | 'listed_price' | 'selling_price' | 'mrp', label: string) => (
    <Form.Item label={label}>
      <Input style={{ width: 130 }} prefix="Rs" inputMode="decimal" aria-label={`${label} ${name}`}
        value={entry[key]} onChange={(e) => onChange({ [key]: e.target.value.trim() })} />
    </Form.Item>
  )
  return (
    <div>
      {title && <Divider dashed style={{ margin: '8px 0' }} />}
      {title && (
        <Space style={{ marginBottom: 4 }}>
          <Tag color="blue">{title}</Tag>
          {onRemove && <Button size="small" type="text" danger icon={<DeleteOutlined />}
            aria-label={`${t('rcv.removeBatch')} ${name}`} onClick={onRemove}>{t('rcv.removeBatch')}</Button>}
        </Space>
      )}
      <Space wrap align="start" size="middle">
        <Form layout="vertical" component="div">
          <Space wrap align="start">
            <Form.Item label={t('rcv.units')}>
              <Space.Compact>
                <InputNumber min={0} max={max} precision={0} style={{ width: 100 }}
                  aria-label={`${t('rcv.units')} ${name}`} value={entry.units}
                  onChange={(v) => onChange({ units: v === null ? null : Number(v) })} />
                <Button onClick={() => onChange({ units: max })}>{t('rcv.all')}</Button>
              </Space.Compact>
            </Form.Item>
            {came && <>
              {money('unit_price', t('rcv.billPrice'))}
              {money('mrp', t('rcv.mrp'))}
              <Form.Item label={t('qb.free')}>
                <InputNumber min={0} precision={0} style={{ width: 80 }} value={entry.free_units}
                  aria-label={`${t('qb.free')} ${name}`}
                  onChange={(v) => onChange({ free_units: Number(v) || 0 })} />
              </Form.Item>
              {line.by_weight && <Form.Item label={t('rcv.kg')}>
                <Input style={{ width: 100 }} inputMode="decimal" value={entry.weight_kg}
                  onChange={(e) => onChange({ weight_kg: e.target.value.trim() })} />
              </Form.Item>}
              {line.pack_sizes.length > 0 && <Form.Item label={t('rcv.packSize')}>
                <Select style={{ width: 160 }} value={entry.product_id ?? undefined}
                  onChange={(v) => onChange({ product_id: v })}
                  options={line.pack_sizes.map((s) => ({ value: s.online_variant_id, label: s.name }))} />
              </Form.Item>}
              <Form.Item label={t('lb.expiry')} required>
                <DatePicker value={entry.expiry ? dayjs(entry.expiry) : null} aria-label={`${t('lb.expiry')} ${name}`}
                  onChange={(d: Dayjs | null) => onChange({ expiry: d ? d.format('YYYY-MM-DD') : null })} />
              </Form.Item>
              {line.shop && line.shop.stock_mode === 'unit' && <>
                {money('selling_price', t('rcv.selling'))}
                {money('listed_price', t('rcv.listed'))}
              </>}
              <Form.Item label={t('qb.labels')} required={labelsRequired}>
                <Input.TextArea autoSize={{ minRows: 1, maxRows: 4 }} style={{ width: 200 }}
                  placeholder={t('qb.labelsHint')} value={entry.labels}
                  onChange={(e) => onChange({ labels: e.target.value })} />
              </Form.Item>
            </>}
          </Space>
        </Form>
        {came && shown?.delivered_unit_price && (
          <div>
            <div>{t('rcv.delivered')}</div>
            <b style={{ fontSize: 18 }}>Rs {formatMoney(shown.delivered_unit_price)}</b>
            <div>{fmt(t('rcv.share'), { amount: formatMoney(shown.transport) })}</div>
          </div>
        )}
      </Space>
    </div>
  )
}

function LineCard({ line, parts, shown, labelsRequired, onChange }: {
  line: FormLine; parts: Entry[]; shown: (part: number) => Shown | undefined; labelsRequired: boolean
  onChange: (parts: Entry[]) => void
}) {
  const { t, lang } = useT()
  const name = lang === 'si' && line.name_si ? line.name_si : line.name
  const taken = partUnits(parts)
  const split = parts.length > 1
  const set = (i: number, patch: Partial<Entry>) => onChange(parts.map((e, j) => (j === i ? { ...e, ...patch } : e)))
  return (
    <Card size="small" style={{ marginBottom: 12 }}>
      <Space align="start" wrap size="middle">
        <ProductPhoto url={line.image_url} />
        <div style={{ minWidth: 220 }}>
          <b>{name}</b>
          <div>{fmt(t('rcv.ordered'), { n: line.due_units, price: formatMoney(line.unit_price) })}</div>
          {split && !line.extra && <div>{fmt(t('rcv.partsTotal'), { n: taken, due: line.due_units })}</div>}
          {line.shop && <div>{fmt(t('rcv.shopStock'), { n: line.shop.stock_quantity ?? 0 })}</div>}
          {!line.by_weight && (line.unit_weight_grams
            ? <Tag>{fmt(t('rcv.weight'), { g: line.unit_weight_grams })}</Tag>
            : <Tag color="orange">{t('rcv.noWeight')}</Tag>)}
        </div>
      </Space>
      {parts.map((e, i) => (
        <PartForm key={i} line={line} entry={e} labelsRequired={labelsRequired} shown={shown(i)}
          max={Math.max(line.due_units - (taken - (e.units ?? 0)), 0)}
          title={split ? fmt(t('rcv.batchN'), { n: i + 1 }) : undefined}
          onChange={(patch) => set(i, patch)}
          onRemove={split ? () => onChange(parts.filter((_, j) => j !== i)) : undefined} />
      ))}
      {!!parts[0]?.units && parts.length < MAX_PARTS && (line.extra || taken < line.due_units) && (
        <Tooltip title={t('rcv.addBatchHint')}>
          <Button style={{ marginTop: 8 }} size="small" icon={<SplitCellsOutlined />}
            onClick={() => onChange([...parts, nextPart(line, parts)])}>{t('rcv.addBatch')}</Button>
        </Tooltip>
      )}
    </Card>
  )
}

export default function ReceiveGoods() {
  const { id = '' } = useParams()
  const { t } = useT()
  const { can } = useAuth()
  const { message, modal } = App.useApp()
  const qc = useQueryClient()
  const [typed, setTyped] = useState<Parts>({})
  const [transport, setTransport] = useState<string | null>(null)
  const [date, setDate] = useState<Dayjs>(dayjs())
  const [billNo, setBillNo] = useState('')
  const [billTotal, setBillTotal] = useState('')
  const [photo, setPhoto] = useState<File | null>(null)

  const page = useQuery({
    queryKey: ['receiving', id], enabled: can('grn.create'), refetchOnWindowFocus: false,
    queryFn: async () => (await api.get<ReceivingForm>(`/orders/${id}/receiving`)).data,
  })
  const receipts = useQuery({
    queryKey: ['receipts', id],
    queryFn: async () => (await api.get<Receipt[]>(`/orders/${id}/receipts`)).data,
  })
  const f = page.data
  const [extras, setExtras] = useState<FormLine[]>([])
  const [adding, setAdding] = useState(false)
  const lines = [...(f?.lines ?? []), ...extras]
  const partsOf = (l: FormLine): Entry[] => typed[l.order_line_id] ?? [startEntry(l)]
  const all: Parts = Object.fromEntries(lines.map((l) => [l.order_line_id, partsOf(l)]))
  // the preview answers row by row in the order the parts were sent
  const came = cameParts(lines, all)
  const shownFor = (l: FormLine, part: number) => {
    const at = came.findIndex((x) => x.line.order_line_id === l.order_line_id && x.part === part)
    return at < 0 ? undefined : preview.data?.lines[at]
  }
  const charge = transport ?? f?.transport_charge ?? ''

  const asked = receiptLines(lines, all).map((l) => ({
    order_line_id: l.order_line_id, online_variant_id: l.online_variant_id,
    units: l.units, free_units: l.free_units,
    unit_price: isValidAmount(l.unit_price) ? l.unit_price : null,
    weight_kg: Number(l.weight_kg) > 0 ? l.weight_kg : null, product_id: l.product_id,
  }))
  const body = JSON.stringify({ transport_charge: isValidAmount(charge) ? charge : '0', lines: asked })
  const [settled, setSettled] = useState(body)
  useEffect(() => { const timer = setTimeout(() => setSettled(body), 400); return () => clearTimeout(timer) }, [body])
  const preview = useQuery({
    queryKey: ['receipt-preview', id, settled],
    enabled: !!f && canReceive(f.status) && asked.length > 0,
    queryFn: async () => (await api.post<Preview>(`/orders/${id}/receipts/preview`, JSON.parse(settled))).data,
    placeholderData: (old) => old,
    retry: false,
  })

  const save = useMutation({
    mutationFn: async () => (await api.post<Receipt>(`/orders/${id}/receipts`, {
      received_date: date.format('YYYY-MM-DD'), invoice_no: billNo.trim() || null,
      invoice_total: billTotal.trim() || null, transport_charge: charge.trim() || '0',
      lines: receiptLines(lines, all),
    })).data,
    onSuccess: async (r) => {
      message.success(fmt(t('rcv.done'), { no: r.receipt_no }))
      if (photo) {  // the bill's photo goes with the receipt (plan P3)
        try {
          await api.put(`/receipts/${r.receipt_id}/photo`, photo, { headers: { 'Content-Type': photo.type } })
        } catch (e) { message.warning(`${t('rcv.photoFailed')} ${errorMessage(e)}`) }
        setPhoto(null)
      }
      setExtras([])
      setTyped({})
      for (const key of ['receiving', 'receipts', 'order']) void qc.invalidateQueries({ queryKey: [key, id] })
      void qc.invalidateQueries({ queryKey: ['orders'] })
    },
    onError: (e) => message.error(errorMessage(e)),
  })

  const goods = goodsCents(lines, all)
  const chargeCents = isValidAmount(charge) ? toCents(charge) : 0
  const short = shortUnits(lines, all)

  const submit = () => {
    const bad = problem(lines, all, charge)
      ?? (billTotal.trim() && !isValidAmount(billTotal) ? { kind: 'billTotal' as const, line: undefined } : null)
    if (bad) {
      const where = bad.line ? ` (${bad.line.name}${'part' in bad && bad.part ? ` · ${fmt(t('rcv.batchN'), { n: bad.part })}` : ''})` : ''
      message.warning(`${t(`rcv.bad.${bad.kind}`)}${where}`)
      return
    }
    modal.confirm({
      title: short ? fmt(t('rcv.shortTitle'), { n: short }) : t('rcv.confirm'),
      content: short ? t('rcv.shortText') : undefined,
      okText: t('rcv.save'), cancelText: t('rcv.back'), onOk: () => save.mutate(),
    })
  }

  if (page.isError) return <ErrorState message={errorMessage(page.error)} onRetry={() => void page.refetch()} />
  if (receipts.isError) return <ErrorState message={errorMessage(receipts.error)} onRetry={() => void receipts.refetch()} />
  if ((can('grn.create') && !f) || !receipts.data) return <PageSkeleton rows={8} />
  const open = !!f && canReceive(f.status)

  return (
    <>
      <PageHeader back={`/orders/${id}`} title={t('rcv.title')}
        subtitle={f ? `${f.order_no} · ${f.supplier_name} · ${f.branch_name}` : undefined} />
      {receipts.data.map((r) => <OnlineState key={r.receipt_id} receipt={r} />)}
      {f && !open && !receipts.data.length && <Alert type="info" showIcon message={t('rcv.notOpen')} />}
      {open && f && <>
        {!f.online_stock_in && <Alert style={{ marginBottom: 12 }} type="warning" showIcon message={t('rcv.online.off')} />}
        {f.online_error && <Alert style={{ marginBottom: 12 }} type="warning" showIcon message={`${t('rcv.noShop')} ${f.online_error}`} />}
        <Card size="small" style={{ marginBottom: 12 }}>
          <Form layout="vertical" component="div">
            <Space wrap size="large" align="start">
              <Form.Item label={t('rcv.date')} required>
                <DatePicker value={date} allowClear={false} onChange={(d: Dayjs | null) => { if (d) setDate(d) }}
                  disabledDate={(d) => d.isAfter(dayjs(), 'day')} />
              </Form.Item>
              <Form.Item label={t('qb.billNo')}>
                <Input style={{ width: 160 }} maxLength={60} value={billNo} onChange={(e) => setBillNo(e.target.value)} />
              </Form.Item>
              <Form.Item label={t('qb.billTotal')}>
                <Input style={{ width: 160 }} prefix="Rs" inputMode="decimal" value={billTotal}
                  onChange={(e) => setBillTotal(e.target.value.trim())} />
              </Form.Item>
              <Form.Item label={t('rcv.photo')} extra={t('rcv.photoHint')}>
                <input type="file" accept="image/jpeg,image/png,image/webp" capture="environment"
                  aria-label={t('rcv.photo')}
                  onChange={(e) => {
                    const file = e.target.files?.[0] ?? null
                    if (file && file.size > 3 * 1024 * 1024) { message.warning(t('rcv.photoBig')); e.target.value = ''; return }
                    setPhoto(file)
                  }} />
              </Form.Item>
              <Form.Item label={t('rcv.transport')} extra={t('rcv.transportHint')}>
                <Input style={{ width: 160 }} prefix="Rs" inputMode="decimal" aria-label={t('rcv.transport')}
                  value={charge} onChange={(e) => setTransport(e.target.value.trim())} />
              </Form.Item>
            </Space>
          </Form>
        </Card>
        {lines.map((l) => <LineCard key={l.order_line_id} line={l} parts={partsOf(l)} labelsRequired={f.labels_required}
          shown={(part) => shownFor(l, part)}
          onChange={(parts) => setTyped((ps) => ({ ...ps, [l.order_line_id]: parts }))} />)}
        <Button style={{ marginBottom: 12 }} icon={<PlusOutlined />} onClick={() => setAdding(true)}>
          {t('rcv.addExtra')}</Button>
        {adding && <AddExtra taken={lines.map((l) => l.online_variant_id ?? '')} onClose={() => setAdding(false)}
          onPick={(x) => { setExtras((es) => [...es, extraLine(x)]); setAdding(false) }} />}
        {chargeCents > 0 && !!preview.data?.missing_weight.length && (
          <Alert style={{ marginBottom: 12 }} type="error" showIcon message={t('rcv.missingWeight')}
            description={preview.data.missing_weight.join(', ')} />
        )}
        {preview.data?.over_cap && (
          <Alert style={{ marginBottom: 12 }} type="warning" showIcon
            message={fmt(t('rcv.overCap'), { pct: f.transport_cap_pct })} />
        )}
        {preview.isError && asked.length > 0 && (
          <Alert style={{ marginBottom: 12 }} type="error" showIcon message={errorMessage(preview.error)} />
        )}
        <Card size="small">
          <Space wrap size="large">
            <span>{t('qb.itemsTotal')}: <b>Rs {formatMoney(fromCents(goods))}</b></span>
            <span>{t('rcv.transport')}: <b>Rs {formatMoney(fromCents(chargeCents))}</b></span>
            <span>{t('rcv.total')}: <b>Rs {formatMoney(fromCents(goods + chargeCents))}</b></span>
          </Space>
          {billTotal && isValidAmount(billTotal) && toCents(billTotal) !== goods + chargeCents && (
            <Alert style={{ marginTop: 12 }} type="warning" showIcon message={t('rcv.billDiffers')} />
          )}
          <div style={{ marginTop: 16 }}>
            <Button type="primary" size="large" icon={<InboxOutlined />} loading={save.isPending}
              onClick={submit}>{t('rcv.save')}</Button>
          </div>
        </Card>
      </>}
    </>
  )
}

interface OnlineItem {
  online_variant_id: string; name: string; name_si: string | null; variant: string
  image_url?: string | null; weight_grams: number | null; last_price?: string | null
}

/** Owner 2026-11-26: a product we already sell that came without being ordered. A product
 *  that is not on SRIBEES Online is added there by the super admin first. */
function AddExtra(props: { taken: string[]; onClose: () => void; onPick: (x: OnlineItem) => void }) {
  const { t } = useT()
  const [q, setQ] = useState('')
  const found = useQuery({
    queryKey: ['online-items', q], enabled: q.trim().length >= 2,
    queryFn: async () => (await api.get<OnlineItem[]>('/online-items', { params: { q } })).data,
  })
  return (
    <Modal open title={t('rcv.addExtra')} footer={null} onCancel={props.onClose} width={640}>
      <Typography.Paragraph type="secondary">{t('rcv.addExtraHint')}</Typography.Paragraph>
      <Input.Search autoFocus allowClear value={q} onChange={(e) => setQ(e.target.value)}
        placeholder={t('ord.add.search')} />
      <List style={{ marginTop: 12, maxHeight: 420, overflow: 'auto' }} loading={found.isFetching}
        dataSource={(found.data ?? []).filter((x) => !props.taken.includes(x.online_variant_id))}
        locale={{ emptyText: q.trim().length < 2 ? t('ord.add.hint') : t('ord.add.none') }}
        renderItem={(x) => (
          <List.Item style={{ cursor: 'pointer' }} onClick={() => props.onPick(x)}>
            <List.Item.Meta avatar={<ProductPhoto url={x.image_url} size={48} />}
              title={`${x.name} ${x.variant}`.trim()} description={x.name_si} />
          </List.Item>
        )} />
    </Modal>
  )
}
