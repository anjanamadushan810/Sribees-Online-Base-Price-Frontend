import { CheckOutlined, CloseOutlined, RightOutlined, SearchOutlined, ThunderboltOutlined,
  UndoOutlined } from '@ant-design/icons'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { App, Button, Drawer, Grid, Input, List, Modal, Progress, Segmented, Tag, Typography } from 'antd'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { api, errorMessage } from '../api/client'
import type { MatchProduct, OnlineProduct, QueueItem } from '../api/types'
import { useAuth } from '../auth/AuthContext'
import { EmptyState, ErrorState, Money, PageSkeleton, StatusPill } from '../components/ui'
import { useT } from '../i18n'
import { confidence, counts, fmt, nextAfter, visible, type Filter } from './matchingLogic'

const isTyping = (el: EventTarget | null) => {
  const n = el as HTMLElement | null
  return !!n && (['INPUT', 'TEXTAREA', 'SELECT'].includes(n.tagName) || n.isContentEditable)
}

/** Supplier offer -> Online product. Suggestions only; a person confirms every match. */
export default function MatchingPanel({ supplierId }: { supplierId: string }) {
  const { can } = useAuth()
  const { t } = useT()
  const { message } = App.useApp()
  const qc = useQueryClient()
  const wide = !!Grid.useBreakpoint().lg
  const write = can('matches.write')
  const [filter, setFilter] = useState<Filter>('todo')
  const [q, setQ] = useState('')
  const [selected, setSelected] = useState<string>()
  const [drawer, setDrawer] = useState(false)
  const [searching, setSearching] = useState(false)
  const searchBox = useRef<HTMLInputElement>(null)

  // One load of every line: the progress, the three tabs and the list all come from it.
  const queue = useQuery({
    queryKey: ['matching', supplierId],
    queryFn: async () => (await api.get<QueueItem[]>(`/suppliers/${supplierId}/matching`, { params: { state: 'all' } })).data,
  })
  const items = useMemo(() => queue.data ?? [], [queue.data])
  const c = counts(items)
  const list = useMemo(() => visible(items, filter, q), [items, filter, q])
  const current = items.find((i) => i.offer_id === selected)
  // Nothing picked yet (or it left the list): start at the first line on show.
  useEffect(() => {
    if (wide && list.length > 0 && !list.some((i) => i.offer_id === selected)) setSelected(list[0].offer_id)
  }, [wide, list, selected])

  const refresh = useCallback(() => qc.invalidateQueries({ queryKey: ['matching', supplierId] }), [qc, supplierId])
  const suggest = useMutation({
    mutationFn: async () => (await api.post(`/suppliers/${supplierId}/matching/suggest`)).data,
    onSuccess: (r: { with_suggestions: number; offers: number }) => {
      message.success(fmt(t('match.suggestionsFound'), { n: r.with_suggestions, total: r.offers }))
      void refresh()
    },
    onError: (e) => message.error(errorMessage(e)),
  })
  const confirm = useMutation({
    mutationFn: async (v: { offer: string; product: string; variant?: string | null }) =>
      api.post(`/matching/offers/${v.offer}/confirm`, { online_product_id: v.product, online_variant_id: v.variant ?? null }),
    onSuccess: (_r, v) => {
      // Move on first: the matched line leaves the "To match" tab when the list reloads.
      setSelected(nextAfter(list, v.offer)); setDrawer(false); setSearching(false)
      void refresh()
    },
    onError: (e) => message.error(errorMessage(e)),
  })
  const reject = useMutation({
    mutationFn: async (v: { offer: string; product: string }) =>
      api.post(`/matching/offers/${v.offer}/reject`, { online_product_id: v.product }),
    onSuccess: () => void refresh(),
    onError: (e) => message.error(errorMessage(e)),
  })
  const unmatch = useMutation({
    mutationFn: async (offer: string) => api.delete(`/matching/offers/${offer}`),
    onSuccess: () => void refresh(),
    onError: (e) => message.error(errorMessage(e)),
  })

  const acceptTop = useCallback((item: QueueItem) => {
    const s = item.suggestions[0]
    if (s) confirm.mutate({ offer: item.offer_id, product: s.online_product_id, variant: s.online_variant_id })
  }, [confirm])
  const move = useCallback((by: number) => {
    if (list.length === 0) return
    const at = list.findIndex((i) => i.offer_id === selected)
    setSelected(list[Math.min(list.length - 1, Math.max(0, at + by))].offer_id)
  }, [list, selected])

  // Keys: the whole job can be done without the mouse.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey || isTyping(e.target) || searching) return
      const k = e.key.toLowerCase()
      if (k === 'arrowdown' || k === 'j') { e.preventDefault(); move(1) }
      else if (k === 'arrowup' || k === 'k') { e.preventDefault(); move(-1) }
      else if (k === 's' && current) setSelected(nextAfter(list, current.offer_id))
      else if (write && current && !current.confirmed) {
        if (k === 'enter') { e.preventDefault(); acceptTop(current) }
        else if (k === 'n' && current.suggestions[0]) {
          reject.mutate({ offer: current.offer_id, product: current.suggestions[0].online_product_id })
        } else if (k === 'f') { e.preventDefault(); setSearching(true) }
      } else if (write && current?.confirmed && k === 'u') unmatch.mutate(current.offer_id)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [move, current, list, write, searching, acceptTop, reject, unmatch])

  if (queue.isLoading) return <PageSkeleton rows={8} />
  if (queue.isError) return <ErrorState message={t('match.loadError')} onRetry={() => void queue.refetch()} />

  const detail = current ? (
    <LineDetail item={current} write={write} busy={confirm.isPending || reject.isPending}
      onAccept={() => acceptTop(current)}
      onPick={(s) => confirm.mutate({ offer: current.offer_id, product: s.online_product_id, variant: s.online_variant_id })}
      onReject={(s) => reject.mutate({ offer: current.offer_id, product: s.online_product_id })}
      onSkip={() => setSelected(nextAfter(list, current.offer_id))}
      onFind={() => setSearching(true)} onUndo={() => unmatch.mutate(current.offer_id)} />
  ) : <EmptyState title={t('match.pickLine')} />

  return (
    <>
      <div className="match-progress">
        <div className="match-progress-text">
          <b>{c.todo === 0 && c.total > 0 ? t('match.allDone') : fmt(t('match.progress'), { done: c.matched, total: c.total })}</b>
        </div>
        <Progress percent={c.total ? Math.round((c.matched / c.total) * 100) : 0} showInfo={false}
          status={c.todo === 0 && c.total > 0 ? 'success' : 'active'}
          aria-label={fmt(t('match.progress'), { done: c.matched, total: c.total })} />
      </div>

      <div className="match-toolbar">
        <Segmented<Filter> value={filter} onChange={setFilter}
          options={[
            { value: 'todo', label: `${t('match.filter.todo')} (${c.todo})` },
            { value: 'matched', label: `${t('match.filter.matched')} (${c.matched})` },
            { value: 'all', label: `${t('match.filter.all')} (${c.total})` },
          ]} />
        <Input.Search ref={searchBox as never} allowClear value={q} onChange={(e) => setQ(e.target.value)}
          placeholder={t('match.search')} style={{ maxWidth: 260 }} aria-label={t('match.search')} />
        {write && (
          <Button icon={<ThunderboltOutlined />} loading={suggest.isPending} onClick={() => suggest.mutate()}>
            {t('match.findSuggestions')}
          </Button>
        )}
      </div>
      {!write && <Typography.Paragraph type="secondary">{t('match.readOnly')}</Typography.Paragraph>}

      <div className="match-grid">
        <section aria-label={t('match.lines')} className="match-list">
          {list.length === 0
            ? <EmptyState title={filter === 'todo' && !q ? t('match.empty.todo') : t('match.empty.other')} />
            : (
              <ul role="listbox" aria-label={t('match.lines')} className="match-rows">
                {list.map((i) => (
                  <li key={i.offer_id} role="option" aria-selected={i.offer_id === selected}>
                    <button type="button" className={`match-row${i.offer_id === selected ? ' is-on' : ''}`}
                      onClick={() => { setSelected(i.offer_id); if (!wide) setDrawer(true) }}>
                      <span className="match-row-main">
                        <span className="match-row-name">{i.heading}</span>
                        {i.label && <span className="match-row-label">{i.label}</span>}
                      </span>
                      <span className="match-row-side">
                        <Money value={i.price} />
                        {i.confirmed
                          ? <StatusPill tone="success" icon={<CheckOutlined aria-hidden />}>{t('match.status.matched')}</StatusPill>
                          : i.suggestions.length > 0
                            ? <StatusPill tone="info">{t('match.status.suggested')}</StatusPill>
                            : <StatusPill tone="neutral">{t('match.status.none')}</StatusPill>}
                      </span>
                      {!wide && <RightOutlined aria-hidden className="match-row-go" />}
                    </button>
                  </li>
                ))}
              </ul>
            )}
        </section>

        {wide && <section className="match-detail" aria-live="polite">{detail}</section>}
      </div>
      {wide && write && <div className="match-keys" aria-hidden>{t('match.keys')}</div>}

      {!wide && (
        <Drawer open={drawer && !!current} placement="bottom" height="88%" onClose={() => setDrawer(false)}
          title={current ? `${current.heading} ${current.label}`.trim() : ''}>
          {detail}
        </Drawer>
      )}
      {searching && current && (
        <ProductSearch item={current} onClose={() => setSearching(false)}
          onPick={(p) => confirm.mutate({ offer: current.offer_id, product: p.online_product_id })} />
      )}
    </>
  )
}

function ConfidenceBar({ score }: { score: number | null }) {
  const { t } = useT()
  const level = confidence(score)
  if (!level) return null
  const pct = Math.round(Number(score) * 100)
  const tone = level === 'high' ? 'success' : level === 'medium' ? 'warning' : 'neutral'
  return (
    <div className="conf">
      <div className="conf-track" role="img" aria-label={`${t(`match.conf.${level}`)} ${pct}%`}>
        <div className={`conf-fill conf-${tone}`} style={{ width: `${Math.max(4, pct)}%` }} />
      </div>
      <span className="conf-text">{t(`match.conf.${level}`)} · {pct}%</span>
    </div>
  )
}

/** The Online product's main photo (owner 2026-11-26: easier to recognise than a name). */
export function ProductPhoto({ url, size = 56 }: { url?: string | null; size?: number }) {
  const [broken, setBroken] = useState(false)
  const box = { width: size, height: size, flex: `0 0 ${size}px`, borderRadius: 8,
    border: '1px solid var(--sb-border)', background: 'var(--sb-surface)', objectFit: 'contain' as const }
  if (!url || broken) return <div style={{ ...box, background: 'var(--sb-surface-alt)' }} aria-hidden />
  return <img src={url} alt="" loading="lazy" style={box} onError={() => setBroken(true)} />
}

function ProductName({ p }: { p: MatchProduct }) {
  return (
    <div className="match-product" style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
      <ProductPhoto url={p.image_url} />
      <div>
      <div className="match-product-name">{p.name}{p.size && <Tag style={{ marginLeft: 8 }}>{p.size}</Tag>}</div>
      {(p.name_si || p.sku) && (
        <Typography.Text type="secondary">{[p.name_si, p.sku].filter(Boolean).join(' · ')}</Typography.Text>
      )}
      </div>
    </div>
  )
}

function LineDetail(props: {
  item: QueueItem; write: boolean; busy: boolean
  onAccept: () => void; onPick: (s: MatchProduct) => void; onReject: (s: MatchProduct) => void
  onSkip: () => void; onFind: () => void; onUndo: () => void
}) {
  const { t } = useT()
  const { item, write, busy } = props
  return (
    <div>
      <div className="match-line">
        <div className="match-line-title">{item.heading}{item.label && <span> {item.label}</span>}</div>
        <dl className="match-facts">
          <div><dt>{t('match.price')}</dt><dd><Money value={item.price} /></dd></div>
          <div><dt>{t('match.mrp')}</dt><dd><Money value={item.mrp} /></dd></div>
          <div><dt>{t('match.box')}</dt><dd className="num">{item.units_per_box ?? '—'}</dd></div>
        </dl>
      </div>

      {item.confirmed ? (
        <div className="match-card match-card-done">
          <StatusPill tone="success" icon={<CheckOutlined aria-hidden />}>{t('match.matchedTo')}</StatusPill>
          <ProductName p={item.confirmed} />
          {write && <Button icon={<UndoOutlined />} onClick={props.onUndo}>{t('match.undo')}</Button>}
        </div>
      ) : (
        <>
          <h2 className="match-question">{t('match.question')}</h2>
          {item.suggestions.length === 0 && (
            <Typography.Paragraph type="secondary">{t('match.noSuggestion')}</Typography.Paragraph>
          )}
          {item.suggestions.map((s, n) => (
            <div key={s.online_product_id} className={`match-card${n === 0 ? ' match-card-top' : ''}`}>
              <ProductName p={s} />
              <ConfidenceBar score={s.score} />
              {write && (
                <div className="match-actions">
                  <Button type={n === 0 ? 'primary' : 'default'} icon={<CheckOutlined />} disabled={busy}
                    onClick={() => (n === 0 ? props.onAccept() : props.onPick(s))}>{t('match.same')}</Button>
                  <Button icon={<CloseOutlined />} disabled={busy} onClick={() => props.onReject(s)}>
                    {t('match.notThis')}
                  </Button>
                </div>
              )}
            </div>
          ))}
          {write && (
            <div className="match-actions" style={{ marginTop: 12 }}>
              <Button icon={<SearchOutlined />} onClick={props.onFind}>{t('match.findProduct')}</Button>
              <Button type="text" onClick={props.onSkip}>{t('match.skip')}</Button>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function ProductSearch(props: { item: QueueItem; onClose: () => void; onPick: (p: OnlineProduct) => void }) {
  const { t } = useT()
  const [q, setQ] = useState(props.item.heading.split(' ')[0])
  const found = useQuery({
    queryKey: ['online-products', q],
    enabled: q.trim().length >= 2,
    queryFn: async () => (await api.get<OnlineProduct[]>('/online-products', { params: { q } })).data,
  })
  return (
    <Modal open title={t('match.searchTitle')} footer={null} onCancel={props.onClose} width={680}>
      <Typography.Paragraph strong>{`${props.item.heading} ${props.item.label}`.trim()}</Typography.Paragraph>
      <Input.Search autoFocus allowClear value={q} onChange={(e) => setQ(e.target.value)}
        onPressEnter={() => found.data?.[0] && props.onPick(found.data[0])}
        placeholder={t('match.searchPlaceholder')} />
      <List style={{ marginTop: 12 }} loading={found.isFetching} dataSource={found.data}
        locale={{ emptyText: q.trim().length < 2 ? t('match.searchHint') : t('match.noResults') }}
        renderItem={(p) => (
          <List.Item actions={[<Button key="pick" type="primary" size="small" onClick={() => props.onPick(p)}>
            {t('match.choose')}</Button>]}>
            <List.Item.Meta avatar={<ProductPhoto url={p.image_url} size={48} />} title={p.name} description={[p.name_si, p.sku,
              [p.display_size, p.display_size_unit].filter(Boolean).join(' ')].filter(Boolean).join(' · ')} />
          </List.Item>
        )} />
    </Modal>
  )
}
