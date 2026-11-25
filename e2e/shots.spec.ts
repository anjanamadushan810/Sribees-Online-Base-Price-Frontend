/**
 * Screenshots of the main screens in light and dark, on a computer and on a phone, with a
 * fake API (no server needed). Run by .github/workflows/ui-screenshots.yml; the images are
 * the evidence that a UI change was looked at (UI plan, section 10).
 */
import { expect, test, type Page } from '@playwright/test'

const ME = {
  user_id: 'u1', email: 'owner@example.com', full_name: 'Nimal Perera', role: 'owner',
  all_branches: true, is_active: true, totp_enabled: true, last_login_at: null, branches: [],
  two_factor: true,
  permissions: ['suppliers.read', 'suppliers.write', 'suppliers.bank', 'matches.read',
    'matches.write', 'orders.read', 'orders.create', 'orders.approve', 'base_prices.read',
    'branches.read', 'branches.write', 'users.read', 'users.write'],
}
const SUP = (i: number, name: string, credit: number) => ({
  supplier_id: `s${i}`, code: `SUP-000${i}`, name, notes: null, is_active: true,
  created_at: '2026-11-12T08:00:00Z', contact_name: i === 1 ? 'Mr Nishantha' : null,
  phone: '0712345678', email: null, address: null, credit_days: credit, is_related_party: false,
  users: [{ supplier_user_id: `u${i}`, phone: '+94712345678', email: null,
    must_change_password: false, full_name: 'Nishi', language: 'si', is_active: true,
    last_login_at: null }],
})
const FIXTURES: Record<string, unknown> = {
  '/auth/me': ME,
  '/suppliers': [SUP(1, 'Nishi Super Palace', 14), SUP(2, 'Lanka Distributors', 0),
    SUP(3, 'Ceylon Foods (Pvt) Ltd', 30)],
  '/orders': [
    { order_id: 'o1', order_no: 'SPO-000012', status: 'submitted', branch_name: 'Matugama',
      goods_total: '152000.00', delivery_charge: null, total: '152000.00', supplier_note: null,
      supplier_name: 'Nishi Super Palace', created_at: '2026-11-24T09:30:00Z' },
    { order_id: 'o2', order_no: 'SPO-000011', status: 'accepted', branch_name: 'Matugama',
      goods_total: '48500.00', delivery_charge: '600.00', total: '49100.00', supplier_note: null,
      supplier_name: 'Lanka Distributors', created_at: '2026-11-23T11:10:00Z' },
    { order_id: 'o3', order_no: 'SPO-000010', status: 'draft', branch_name: 'Matugama',
      goods_total: '9800.00', delivery_charge: null, total: '9800.00', supplier_note: null,
      supplier_name: 'Ceylon Foods (Pvt) Ltd', created_at: '2026-11-22T15:45:00Z' },
  ],
  '/base-prices': [
    { online_product_id: 'p1', online_variant_id: null, supplier_id: 's1', order_id: 'o2',
      unit_price: '125.00', mrp: '165.00', recorded_at: '2026-11-20T10:00:00Z', voided_at: null,
      product_name: 'Baby Cheramy soap 75g', supplier_name: 'Nishi Super Palace' },
    { online_product_id: 'p2', online_variant_id: null, supplier_id: 's2', order_id: 'o2',
      unit_price: '348.50', mrp: '420.00', recorded_at: '2026-11-18T10:00:00Z', voided_at: null,
      product_name: 'Anchor milk powder 400g', supplier_name: 'Lanka Distributors' },
  ],
  '/held-offers': [],
  '/branches': [{ branch_id: 'b1', code: 'MTG', name: 'Matugama', online_branch_id: 'x', is_active: true }],
  '/users': [ME],
}

async function fakeApi(page: Page, signedIn: boolean) {
  await page.route('**/api/**', async (route) => {
    const path = new URL(route.request().url()).pathname.replace(/^\/api/, '')
    if (path === '/auth/refresh') {
      return signedIn
        ? route.fulfill({ json: { status: 'ok', access_token: 'x', expires_in: 900 } })
        : route.fulfill({ status: 401, json: { detail: 'no session' } })
    }
    if (path in FIXTURES) return route.fulfill({ json: FIXTURES[path] })
    return route.fulfill({ json: [] })
  })
}

const SCREENS = [
  ['suppliers', '/suppliers'], ['orders', '/orders'], ['base-prices', '/base-prices'],
  ['held', '/held'], ['branches', '/branches'], ['users', '/users'],
] as const
const SIZES = [['desktop', 1440, 900], ['phone', 390, 844]] as const
const MODES = ['light', 'dark'] as const

for (const mode of MODES) {
  for (const [size, width, height] of SIZES) {
    test.describe(`${mode} ${size}`, () => {
      test.use({ viewport: { width, height }, colorScheme: mode })

      test('login', async ({ page }) => {
        await fakeApi(page, false)
        await page.goto('/')
        await expect(page.getByRole('button', { name: /continue/i })).toBeVisible()
        await page.screenshot({ path: `shots/${mode}-${size}-login.png` })
      })

      for (const [name, path] of SCREENS) {
        test(name, async ({ page }) => {
          await fakeApi(page, true)
          await page.goto(path)
          await expect(page.locator('h1')).toBeVisible()
          await page.waitForTimeout(400) // let tables and fonts settle
          await page.screenshot({ path: `shots/${mode}-${size}-${name}.png`, fullPage: true })
        })
      }

      test('sinhala shell', async ({ page }) => {
        await fakeApi(page, true)
        await page.addInitScript(() => localStorage.setItem('sb.lang', 'si'))
        await page.goto('/suppliers')
        await expect(page.locator('h1')).toBeVisible()
        await page.waitForTimeout(400)
        await page.screenshot({ path: `shots/${mode}-${size}-sinhala.png` })
      })
    })
  }
}
