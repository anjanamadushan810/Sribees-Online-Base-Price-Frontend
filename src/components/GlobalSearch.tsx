import { SearchOutlined } from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import { AutoComplete, Input } from 'antd'
import type { InputRef } from 'antd'
import { forwardRef, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import type { Order, Supplier } from '../api/types'
import { useAuth } from '../auth/AuthContext'
import { useT } from '../i18n'

/** One box to jump to a supplier (name or code) or an order (number). The lists are the
 *  same cached queries the pages use, so the box costs no extra request once they are warm. */
const GlobalSearch = forwardRef<InputRef>(function GlobalSearch(_, ref) {
  const { can } = useAuth()
  const { t } = useT()
  const navigate = useNavigate()
  const [text, setText] = useState('')
  const q = text.trim().toLowerCase()

  const suppliers = useQuery({
    queryKey: ['suppliers'], enabled: q.length > 0 && can('suppliers.read'),
    queryFn: async () => (await api.get<Supplier[]>('/suppliers')).data,
  })
  const orders = useQuery({
    queryKey: ['orders', undefined], enabled: q.length > 0 && can('orders.read'),
    queryFn: async () => (await api.get<Order[]>('/orders', { params: {} })).data,
  })

  const options = useMemo(() => {
    if (!q) return []
    const s = (suppliers.data ?? [])
      .filter((x) => x.name.toLowerCase().includes(q) || x.code.toLowerCase().includes(q))
      .slice(0, 6)
      .map((x) => ({ value: `/suppliers/${x.supplier_id}`, label: <span>{x.name} <span className="muted">{x.code}</span></span> }))
    const o = (orders.data ?? [])
      .filter((x) => x.order_no.toLowerCase().includes(q) || x.supplier_name.toLowerCase().includes(q))
      .slice(0, 6)
      .map((x) => ({ value: `/orders/${x.order_id}`, label: <span>{x.order_no} <span className="muted">{x.supplier_name}</span></span> }))
    const groups = []
    if (s.length) groups.push({ label: t('top.suppliers'), options: s })
    if (o.length) groups.push({ label: t('top.orders'), options: o })
    return groups
  }, [q, suppliers.data, orders.data, t])

  return (
    <AutoComplete className="top-search" options={options} value={text}
      onChange={setText} popupMatchSelectWidth={360}
      notFoundContent={q ? t('top.noResults') : null}
      onSelect={(path: string) => { setText(''); navigate(path) }}>
      <Input ref={ref} allowClear prefix={<SearchOutlined />} placeholder={t('top.search')}
        aria-label={t('top.search')} />
    </AutoComplete>
  )
})

export default GlobalSearch
