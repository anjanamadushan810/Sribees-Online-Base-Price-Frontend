import { CheckOutlined, CloseOutlined, SearchOutlined, ThunderboltOutlined } from '@ant-design/icons'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { App, Button, Card, Empty, Input, List, Modal, Segmented, Space, Tag, Typography } from 'antd'
import { useState } from 'react'
import { api, errorMessage } from '../api/client'
import { formatMoney } from '../api/money'
import type { MatchProduct, OnlineProduct, QueueItem } from '../api/types'
import { useAuth } from '../auth/AuthContext'

type State = 'todo' | 'matched' | 'all'

/** Supplier offer -> Online product. Suggestions only; a person confirms every match. */
export default function MatchingPanel({ supplierId }: { supplierId: string }) {
  const { can } = useAuth()
  const { message } = App.useApp()
  const qc = useQueryClient()
  const [state, setState] = useState<State>('todo')
  const [picking, setPicking] = useState<QueueItem | null>(null)
  const key = ['matching', supplierId, state]
  const queue = useQuery({
    queryKey: key,
    queryFn: async () => (await api.get<QueueItem[]>(`/suppliers/${supplierId}/matching`, { params: { state } })).data,
  })
  const refresh = () => qc.invalidateQueries({ queryKey: ['matching', supplierId] })
  const suggest = useMutation({
    mutationFn: async () => (await api.post(`/suppliers/${supplierId}/matching/suggest`)).data,
    onSuccess: (r: { with_suggestions: number; offers: number }) => {
      message.success(`Suggestions for ${r.with_suggestions} of ${r.offers} price lines`)
      refresh()
    },
    onError: (e) => message.error(errorMessage(e)),
  })
  const confirm = useMutation({
    mutationFn: async (v: { offer: string; product: string; variant?: string | null }) =>
      api.post(`/matching/offers/${v.offer}/confirm`, { online_product_id: v.product, online_variant_id: v.variant ?? null }),
    onSuccess: () => { refresh(); setPicking(null) },
    onError: (e) => message.error(errorMessage(e)),
  })
  const reject = useMutation({
    mutationFn: async (v: { offer: string; product: string }) =>
      api.post(`/matching/offers/${v.offer}/reject`, { online_product_id: v.product }),
    onSuccess: refresh,
    onError: (e) => message.error(errorMessage(e)),
  })
  const unmatch = useMutation({
    mutationFn: async (offer: string) => api.delete(`/matching/offers/${offer}`),
    onSuccess: refresh,
    onError: (e) => message.error(errorMessage(e)),
  })
  const write = can('matches.write')

  const product = (p: MatchProduct) => (
    <span>
      <b>{p.name}</b>{p.name_si && <> · {p.name_si}</>}{p.size && <Tag style={{ marginLeft: 6 }}>{p.size}</Tag>}
      {p.sku && <Typography.Text type="secondary"> {p.sku}</Typography.Text>}
      {p.score !== null && <Typography.Text type="secondary"> ({Math.round(Number(p.score) * 100)}%)</Typography.Text>}
    </span>
  )

  return (
    <>
      <Space wrap style={{ marginBottom: 12 }}>
        <Segmented<State> value={state} onChange={setState}
          options={[{ value: 'todo', label: 'To match' }, { value: 'matched', label: 'Matched' }, { value: 'all', label: 'All' }]} />
        {write && <Button icon={<ThunderboltOutlined />} loading={suggest.isPending}
          onClick={() => suggest.mutate()}>Find suggestions</Button>}
      </Space>
      <List loading={queue.isLoading} dataSource={queue.data}
        locale={{ emptyText: <Empty description="Nothing here" /> }}
        renderItem={(item) => (
          <Card size="small" style={{ marginBottom: 8 }}
            title={<span>{item.heading} {item.label && <Tag>{item.label}</Tag>}</span>}
            extra={<Typography.Text type="secondary">
              Rs {formatMoney(item.price)} / {formatMoney(item.mrp)} · box {item.units_per_box ?? '?'}
            </Typography.Text>}>
            {item.confirmed ? (
              <Space wrap>
                <Tag color="green">Matched</Tag>{product(item.confirmed)}
                {write && <Button size="small" onClick={() => unmatch.mutate(item.offer_id)}>Undo</Button>}
              </Space>
            ) : (
              <Space direction="vertical" style={{ width: '100%' }}>
                {item.suggestions.length === 0 && <Typography.Text type="secondary">No suggestion</Typography.Text>}
                {item.suggestions.map((s) => (
                  <Space key={s.online_product_id} wrap>
                    {product(s)}
                    {write && <>
                      <Button size="small" type="primary" icon={<CheckOutlined />}
                        onClick={() => confirm.mutate({ offer: item.offer_id, product: s.online_product_id, variant: s.online_variant_id })}>
                        Same product
                      </Button>
                      <Button size="small" icon={<CloseOutlined />}
                        onClick={() => reject.mutate({ offer: item.offer_id, product: s.online_product_id })}>
                        Not this
                      </Button>
                    </>}
                  </Space>
                ))}
                {write && <Button size="small" icon={<SearchOutlined />} onClick={() => setPicking(item)}>
                  Find the product
                </Button>}
              </Space>
            )}
          </Card>
        )} />
      {picking && <ProductSearch item={picking} onClose={() => setPicking(null)}
        onPick={(p) => confirm.mutate({ offer: picking.offer_id, product: p.online_product_id })} />}
    </>
  )
}

function ProductSearch(props: { item: QueueItem; onClose: () => void; onPick: (p: OnlineProduct) => void }) {
  const [q, setQ] = useState(props.item.heading.split(' ')[0])
  const found = useQuery({
    queryKey: ['online-products', q],
    enabled: q.trim().length >= 2,
    queryFn: async () => (await api.get<OnlineProduct[]>('/online-products', { params: { q } })).data,
  })
  return (
    <Modal open title={`Which product is "${props.item.heading} ${props.item.label}"?`} footer={null}
      onCancel={props.onClose} width={680}>
      <Input.Search autoFocus value={q} onChange={(e) => setQ(e.target.value)}
        placeholder="Name (English or Sinhala) or barcode" />
      <List style={{ marginTop: 12 }} loading={found.isFetching} dataSource={found.data}
        renderItem={(p) => (
          <List.Item actions={[<Button key="pick" type="primary" size="small" onClick={() => props.onPick(p)}>Choose</Button>]}>
            <List.Item.Meta title={p.name} description={[p.name_si, p.sku, [p.display_size, p.display_size_unit].filter(Boolean).join(' ')].filter(Boolean).join(' · ')} />
          </List.Item>
        )} />
    </Modal>
  )
}
