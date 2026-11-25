import { SyncOutlined } from '@ant-design/icons'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { App, Button } from 'antd'
import { api, errorMessage } from '../api/client'
import { useAuth } from '../auth/AuthContext'

interface SyncResult {
  products: number
  branches?: { created: number; linked: number; updated: number; skipped: number }
}

/** Pull SRIBEESonline's branches (and products) now. The server also does it by itself
 *  every few hours; this is for "I just added a branch in Online". */
export function SyncOnlineButton({ type = 'default' }: { type?: 'default' | 'primary' }) {
  const { can } = useAuth()
  const qc = useQueryClient()
  const { message } = App.useApp()
  const sync = useMutation({
    mutationFn: async () => (await api.post<SyncResult>('/online-catalog/sync')).data,
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ['branches'] })
      const b = r.branches
      message.success(b
        ? `Synced from Online: ${b.created} new, ${b.linked} linked, ${b.updated} updated branches; ${r.products} products.`
        : `Synced from Online: ${r.products} products. (Online did not send branches yet.)`)
    },
    onError: (e) => message.error(errorMessage(e)),
  })
  if (!can('online.sync')) return null
  return (
    <Button type={type} icon={<SyncOutlined />} loading={sync.isPending} onClick={() => sync.mutate()}>
      Sync from Online
    </Button>
  )
}
