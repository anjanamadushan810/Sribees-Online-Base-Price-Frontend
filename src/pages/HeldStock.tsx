import { ReloadOutlined, QrcodeOutlined } from '@ant-design/icons'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Alert, App, Button, Card, Form, Image, Input, InputNumber, Modal, Segmented, Space, Typography } from 'antd'
import { useState } from 'react'
import { api, errorMessage } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import PageHeader from '../components/PageHeader'
import { ErrorState, PageSkeleton, StatCard, StatusPill } from '../components/ui'
import { ResponsiveTable } from '../components/ui/ResponsiveTable'
import { useT } from '../i18n'
import { labelNumbers } from './receiveLogic'
import { fmt } from './textFormat'

export interface HeldLine {
  receipt_line_id: string; batch_id: string; batch_no: string; receipt_no: string
  branch_name: string; name: string; name_si: string | null; image_url: string | null
  received_date: string; expiry_date: string | null; mrp: string | null
  held: number; released: number; left: number; days: number
}

interface Release {
  release_id: string; name: string; batch_no: string; units: number
  online: 'off' | 'pending' | 'sent' | 'refused'; reason: string | null; created_at: string
}

interface HeldOut {
  summary: { lines: number; units: number; oldest_days: number }
  lines: HeldLine[]; releases: Release[]
}

const ONLINE_TONE = { off: 'neutral', pending: 'warning', sent: 'success', refused: 'danger' } as const

/** Owner 2026-11-27: goods kept aside without QR labels on a busy day. Sticking labels on
 *  some of them takes that many into the shop (and SRIBEES Online); the rest stay held. */
export default function HeldStock() {
  const { t, lang } = useT()
  const { can } = useAuth()
  const { message } = App.useApp()
  const qc = useQueryClient()
  const [taking, setTaking] = useState<HeldLine | null>(null)
  const q = useQuery({
    queryKey: ['held-stock'],
    queryFn: async () => (await api.get<HeldOut>('/stock/held')).data,
  })
  const retry = useMutation({
    mutationFn: async (id: string) => api.post(`/stock/held/releases/${id}/retry`),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['held-stock'] }),
    onError: (e) => message.error(errorMessage(e)),
  })
  if (q.isError) return <ErrorState message={errorMessage(q.error)} onRetry={() => void q.refetch()} />
  if (!q.data) return <PageSkeleton rows={6} />
  const d = q.data
  const name = (r: HeldLine) => lang === 'si' && r.name_si ? r.name_si : r.name
  const photo = (url: string | null) => url
    ? <Image src={url} width={40} height={40} style={{ objectFit: 'contain' }} />
    : null
  const take = (r: HeldLine) => can('grn.create') && (
    <Button type="primary" icon={<QrcodeOutlined />} onClick={() => setTaking(r)}>{t('hs.take')}</Button>)
  return (
    <>
      <PageHeader title={t('hs.title')} subtitle={t('hs.hint')} />
      <Space wrap size="middle" style={{ marginBottom: 16 }}>
        <StatCard label={t('hs.units')} value={d.summary.units} />
        <StatCard label={t('hs.lines')} value={d.summary.lines} />
        <StatCard label={t('hs.oldest')} value={fmt(t('hs.days'), { n: d.summary.oldest_days })} />
      </Space>
      <Card styles={{ body: { padding: 16 } }}>
        <ResponsiveTable rowKey="receipt_line_id" dataSource={d.lines} size="small"
          pagination={{ pageSize: 20, hideOnSinglePage: true }}
          locale={{ emptyText: <Typography.Text type="secondary">{t('hs.none')}</Typography.Text> }}
          cardFields={[
            { label: t('home.product'), render: (r) => name(r) },
            { label: t('hs.left'), render: (r) => <b>{r.left}</b> },
            { label: t('ex.expiry'), render: (r) => r.expiry_date ?? '—' },
            { label: t('hs.waiting'), render: (r) => fmt(t('hs.days'), { n: r.days }) },
            { label: '', render: (r) => take(r) },
          ]}
          columns={[
            { title: '', width: 56, render: (_, r) => photo(r.image_url) },
            { title: t('home.product'), render: (_, r) => (
              <div>{name(r)}<div className="muted-line">{r.batch_no} · {r.branch_name}</div></div>) },
            { title: t('hs.received'), render: (_, r) => (
              <div>{r.received_date}<div className="muted-line">{fmt(t('hs.days'), { n: r.days })}</div></div>) },
            { title: t('ex.expiry'), render: (_, r) => r.expiry_date ?? '—' },
            { title: 'MRP', align: 'right', render: (_, r) => r.mrp ?? '—' },
            { title: t('hs.left'), align: 'right', render: (_, r) => (
              <span><b>{r.left}</b>{r.released > 0 && <span className="muted-line"> / {r.held}</span>}</span>) },
            { title: '', render: (_, r) => take(r) },
          ]} />
      </Card>
      {d.releases.length > 0 && (
        <Card title={t('hs.recent')} style={{ marginTop: 16 }} styles={{ body: { padding: 16 } }}>
          <ResponsiveTable rowKey="release_id" dataSource={d.releases} size="small"
            pagination={{ pageSize: 10, hideOnSinglePage: true }}
            cardFields={[
              { label: t('home.product'), render: (r) => r.name },
              { label: t('hs.units'), render: (r) => r.units },
              { label: 'Online', render: (r) => <StatusPill tone={ONLINE_TONE[r.online]}>{t(`hs.online.${r.online}`)}</StatusPill> },
            ]}
            columns={[
              { title: t('home.product'), render: (_, r) => (
                <div>{r.name}<div className="muted-line">{r.batch_no}</div></div>) },
              { title: t('hs.units'), align: 'right', dataIndex: 'units' },
              { title: 'Online', render: (_, r) => (
                <Space direction="vertical" size={2}>
                  <StatusPill tone={ONLINE_TONE[r.online]}>{t(`hs.online.${r.online}`)}</StatusPill>
                  {r.reason && <Typography.Text type="secondary">{r.reason}</Typography.Text>}
                </Space>) },
              { title: '', render: (_, r) => r.online === 'refused' && can('grn.create') && (
                <Button icon={<ReloadOutlined />} loading={retry.isPending} onClick={() => retry.mutate(r.release_id)}>
                  {t('rcv.online.again')}</Button>) },
            ]} />
        </Card>
      )}
      {taking && <TakeIn line={taking} onClose={() => setTaking(null)}
        onDone={(n, left) => {
          message.success(fmt(t('hs.done'), { n, left }))
          setTaking(null)
          void qc.invalidateQueries({ queryKey: ['held-stock'] })
          void qc.invalidateQueries({ queryKey: ['held-summary'] })
        }} />}
    </>
  )
}

/** Scan the QR label of each unit taken in (a scanner types into the box), or name a strip
 *  of labels: its first number and how many. */
function TakeIn({ line, onClose, onDone }: {
  line: HeldLine; onClose: () => void; onDone: (n: number, left: number) => void
}) {
  const { t } = useT()
  const [mode, setMode] = useState<'scan' | 'strip'>('scan')
  const [text, setText] = useState('')
  const [start, setStart] = useState('')
  const [count, setCount] = useState<number | null>(null)
  const numbers = labelNumbers(text)
  const n = mode === 'scan' ? numbers.length : (count ?? 0)
  const save = useMutation({
    mutationFn: async () => (await api.post<{ units: number; left: number }>(
      `/stock/held/${line.receipt_line_id}/release`,
      mode === 'scan' ? { numbers } : { start: start.trim(), count })).data,
    onSuccess: (r) => onDone(r.units, r.left),
  })
  return (
    <Modal open title={`${t('hs.take')}: ${line.name}`} onCancel={onClose} okText={t('hs.takeOk')}
      okButtonProps={{ disabled: n <= 0 || n > line.left, loading: save.isPending }}
      onOk={() => save.mutate()} cancelText={t('rcv.back')}>
      <Typography.Paragraph type="secondary">{fmt(t('hs.takeHint'), { left: line.left })}</Typography.Paragraph>
      <Segmented style={{ marginBottom: 12 }} value={mode} onChange={(v) => setMode(v as 'scan' | 'strip')}
        options={[{ value: 'scan', label: t('hs.byScan') }, { value: 'strip', label: t('hs.byStrip') }]} />
      <Form layout="vertical" component="div">
        {mode === 'scan'
          ? <Form.Item label={fmt(t('hs.scanned'), { n: numbers.length, left: line.left })}>
              <Input.TextArea autoFocus autoSize={{ minRows: 3, maxRows: 8 }} value={text}
                placeholder={t('qb.labelsHint')} onChange={(e) => setText(e.target.value)} />
            </Form.Item>
          : <Space wrap>
              <Form.Item label={t('hs.first')}>
                <Input style={{ width: 180 }} value={start} onChange={(e) => setStart(e.target.value)} />
              </Form.Item>
              <Form.Item label={t('hs.howMany')}>
                <InputNumber min={1} max={line.left} precision={0} value={count} onChange={(v) => setCount(v)} />
              </Form.Item>
            </Space>}
      </Form>
      {n > line.left && <Alert type="warning" showIcon message={fmt(t('hs.tooMany'), { left: line.left })} />}
      {save.isError && <Alert type="error" showIcon message={errorMessage(save.error)} />}
    </Modal>
  )
}
