import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { App } from 'antd'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { api } from '../api/client'
import { LangProvider } from '../i18n'
import ReceiveGoods from './ReceiveGoods'

vi.mock('../auth/AuthContext', () => ({ useAuth: () => ({ can: () => true }) }))
vi.mock('../api/client', () => ({
  api: { get: vi.fn(), post: vi.fn() },
  errorMessage: (e: unknown) => String(e),
}))

beforeAll(() => {
  window.matchMedia ??= ((query: string) => ({
    matches: false, media: query, onchange: null, addListener() {}, removeListener() {},
    addEventListener() {}, removeEventListener() {}, dispatchEvent: () => false,
  })) as typeof window.matchMedia
  globalThis.ResizeObserver ??= class { observe() {} unobserve() {} disconnect() {} }
})
afterEach(cleanup)

const form = {
  order_id: 'o1', order_no: 'SPO-000040', status: 'approved', supplier_name: 'Nishi Super Palace',
  branch_name: 'Matugama', transport_charge: '4000.00', transport_cap_pct: 25, labels_required: false,
  online_stock_in: true, online_error: null,
  lines: [{
    order_line_id: 'l1', name: 'Soap A', name_si: null, image_url: null, online_variant_id: 'v1',
    pack_sizes: [], due_units: 100, unit_price: '200.00', mrp: null, by_weight: false,
    unit_weight_grams: 100, shop: null,
  }],
}

describe('receive goods page', () => {
  it('shows the delivered price and saves what was counted', async () => {
    vi.mocked(api.get).mockImplementation(async (url: string) =>
      ({ data: url.endsWith('/receiving') ? form : [] }))
    vi.mocked(api.post).mockImplementation(async (url: string) => ({
      data: url.endsWith('/preview')
        ? { transport_charge: '4000.00', total: '24000.00', transport_cap: '5000.00', over_cap: false,
            missing_weight: [], lines: [{ order_line_id: 'l1', transport: '4000.00', delivered_unit_price: '240.00' }] }
        : { receipt_no: 'RCV-000050' },
    }))
    render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <LangProvider><App>
          <MemoryRouter initialEntries={['/orders/o1/receive']}>
            <Routes><Route path="/orders/:id/receive" element={<ReceiveGoods />} /></Routes>
          </MemoryRouter>
        </App></LangProvider>
      </QueryClientProvider>,
    )
    expect(await screen.findByText('Soap A')).toBeInTheDocument()
    expect(screen.getByLabelText('Transport charge')).toHaveValue('4000.00')
    fireEvent.click(screen.getByRole('button', { name: 'All' }))
    expect(await screen.findByText('Rs 240.00', {}, { timeout: 3000 })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /Save the receipt/ }))
    expect((await screen.findAllByText('Save this receipt?')).length).toBeGreaterThan(0)
    const buttons = screen.getAllByRole('button', { name: /Save the receipt/ })
    fireEvent.click(buttons[buttons.length - 1])
    await waitFor(() => expect(vi.mocked(api.post).mock.calls.some(([url]) => url === '/orders/o1/receipts')).toBe(true))
    const sent = vi.mocked(api.post).mock.calls.find(([url]) => url === '/orders/o1/receipts')![1]
    expect(sent).toMatchObject({
      transport_charge: '4000.00',
      lines: [{ order_line_id: 'l1', units: 100, unit_price: '200.00', selling_price: null }],
    })
  }, 20000)
})
