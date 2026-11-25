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
  '/suppliers/s1/matching': [
    { offer_id: 'm1', heading: 'Anchor Milk Powder', label: '400g', price: '348.50', mrp: '420.00',
      units_per_box: 24, confirmed: null, suggestions: [
        { online_product_id: 'p2', online_variant_id: null, name: 'Anchor milk powder 400g',
          name_si: 'ඇන්කර් කිරි පිටි 400g', sku: 'ANC400', size: '400 g', score: 0.93 },
        { online_product_id: 'p9', online_variant_id: null, name: 'Anchor milk powder 1kg',
          name_si: null, sku: 'ANC1000', size: '1 kg', score: 0.64 }] },
    { offer_id: 'm2', heading: 'Baby Cheramy Soap', label: '75g', price: '125.00', mrp: '165.00',
      units_per_box: 72, confirmed: null, suggestions: [
        { online_product_id: 'p1', online_variant_id: null, name: 'Baby Cheramy soap 75g',
          name_si: null, sku: 'BC75', size: '75 g', score: 0.71 }] },
    { offer_id: 'm3', heading: 'Sunlight Detergent', label: '1kg', price: '410.00', mrp: null,
      units_per_box: null, confirmed: null, suggestions: [] },
    { offer_id: 'm4', heading: 'Lanka Sugar', label: '1kg', price: '259.00', mrp: '280.00',
      units_per_box: 20, suggestions: [], confirmed: { online_product_id: 'p7',
        online_variant_id: null, name: 'Lanka white sugar 1kg', name_si: null, sku: 'SUG1',
        size: '1 kg', score: null } },
  ],
  '/orders/o1': {
    order_id: 'o1', order_no: 'SPO-000012', status: 'submitted', branch_name: 'Matugama', branch_id: 'b1',
    supplier_id: 's1', supplier_name: 'Nishi Super Palace', goods_total: '87392.00', delivery_charge: null, total: '87392.00',
    note: 'Deliver before noon', supplier_note: null, cancel_reason: null, cancel_note: null,
    created_at: '2026-11-22T09:30:00Z', submitted_at: '2026-11-22T10:00:00Z', approved_at: null, answered_at: null, supplier_seen_at: null,
    lines: [
      { line_id: 'l1', offer_id: 'f1', online_product_id: 'p1', heading: 'Anchor Milk Powder', label: '400g', boxes: 4,
        units_per_box: 24, units: 96, unit_price: '348.50', line_total: '33456.00' },
      { line_id: 'l2', offer_id: 'f2', online_product_id: 'p2', heading: 'Baby Cheramy Soap', label: '75g', boxes: 6,
        units_per_box: 72, units: 432, unit_price: '125.00', line_total: '54000.00' },
    ] },
  '/orders/o2': {
    order_id: 'o2', order_no: 'SPO-000011', status: 'accepted', branch_name: 'Matugama', branch_id: 'b1',
    supplier_id: 's1', supplier_name: 'Lanka Distributors', goods_total: '87392.00', delivery_charge: null, total: '87392.00',
    note: 'Deliver before noon', supplier_note: null, cancel_reason: null, cancel_note: null,
    created_at: '2026-11-22T09:30:00Z', submitted_at: '2026-11-22T10:00:00Z', approved_at: '2026-11-22T11:00:00Z', answered_at: '2026-11-23T05:20:00Z', supplier_seen_at: '2026-11-22T12:40:00Z',
    lines: [
      { line_id: 'l1', offer_id: 'f1', online_product_id: 'p1', heading: 'Anchor Milk Powder', label: '400g', boxes: 4,
        units_per_box: 24, units: 96, unit_price: '348.50', line_total: '33456.00' },
      { line_id: 'l2', offer_id: 'f2', online_product_id: 'p2', heading: 'Baby Cheramy Soap', label: '75g', boxes: 6,
        units_per_box: 72, units: 432, unit_price: '125.00', line_total: '54000.00' },
    ] },
  '/suppliers/s1': SUP(1, 'Nishi Super Palace', 14),
  '/suppliers/s1/catalog': { supplier_id: 's1', supplier_name: 'Nishi Super Palace', header: '', footer: '', sections: [
    { section_id: 'a', title: 'Milk powder', notes: [], is_active: true, products: [
      { product_id: 'q1', heading: 'Anchor Milk Powder', notes_before: [], notes_after: [], is_active: true, offers: [
        { offer_id: 'c1', label: '400g', price: '348.50', mrp: '420.00', units_per_box: 24, extra: [], is_active: true, held_reason: null }, { offer_id: 'c2', label: '1kg', price: '845.00', mrp: '980.00', units_per_box: 12, extra: [], is_active: true, held_reason: null } ] },
      { product_id: 'q2', heading: 'Lakspray', notes_before: [], notes_after: [], is_active: true, offers: [
        { offer_id: 'c3', label: '400g', price: '330.00', mrp: '320.00', units_per_box: 24, extra: [], is_active: true, held_reason: 'price_above_mrp' } ] } ] },
    { section_id: 'b', title: 'Soap', notes: [], is_active: true, products: [
      { product_id: 'q3', heading: 'Baby Cheramy Soap', notes_before: [], notes_after: [], is_active: true, offers: [
        { offer_id: 'c4', label: '75g', price: '125.00', mrp: '165.00', units_per_box: 72, extra: [], is_active: true, held_reason: null }, { offer_id: 'c5', label: '100g', price: '150.00', mrp: '190.00', units_per_box: 48, extra: [], is_active: false, held_reason: null } ] } ] } ] },
  '/held-offers': [
    { offer_id: 'h1', supplier_id: 's1', supplier_name: 'Nishi Super Palace', heading: 'Lakspray', label: '400g',
      price: '330.00', mrp: '320.00', held_reason: 'price_above_mrp', updated_at: '2026-11-25T01:00:00Z' },
    { offer_id: 'h2', supplier_id: 's1', supplier_name: 'Nishi Super Palace', heading: 'Sunlight', label: '1kg',
      price: '455.00', mrp: '440.00', held_reason: 'price_above_mrp', updated_at: '2026-11-24T05:30:00Z' },
    { offer_id: 'h3', supplier_id: 's2', supplier_name: 'Lanka Distributors', heading: 'Maggi Noodles', label: '400g',
      price: '260.00', mrp: '250.00', held_reason: 'price_above_mrp', updated_at: '2026-11-23T09:00:00Z' },
  ],
  '/base-prices/p1': { online_product_id: 'p1', name: 'Baby Cheramy soap 75g',
    offers: [
      { offer_id: 'o1', supplier_id: 's1', supplier_name: 'Nishi Super Palace', heading: 'Baby Cheramy Soap', label: '75g', price: '125.00', mrp: '165.00', units_per_box: 72 },
      { offer_id: 'o2', supplier_id: 's2', supplier_name: 'Lanka Distributors', heading: 'Baby Cheramy', label: '75g', price: '131.50', mrp: '165.00', units_per_box: 48 },
      { offer_id: 'o3', supplier_id: 's3', supplier_name: 'Ceylon Foods (Pvt) Ltd', heading: 'Cheramy Baby', label: '75g', price: '122.00', mrp: '165.00', units_per_box: 60 } ],
    history: [
      { online_product_id: 'p1', online_variant_id: null, supplier_id: 's1', order_id: 'o9', unit_price: '118.00', mrp: '165.00', recorded_at: '2026-09-02T10:00:00Z', voided_at: null },
      { online_product_id: 'p1', online_variant_id: null, supplier_id: 's1', order_id: 'o8', unit_price: '121.00', mrp: '165.00', recorded_at: '2026-10-05T10:00:00Z', voided_at: null },
      { online_product_id: 'p1', online_variant_id: null, supplier_id: 's1', order_id: 'o7', unit_price: '119.00', mrp: '165.00', recorded_at: '2026-10-28T10:00:00Z', voided_at: '2026-10-29T10:00:00Z' },
      { online_product_id: 'p1', online_variant_id: null, supplier_id: 's1', order_id: 'o2', unit_price: '125.00', mrp: '165.00', recorded_at: '2026-11-20T10:00:00Z', voided_at: null } ] },
  '/dashboard/today': {
    approval_mode: 'local', open_total: 17,
    rows: [
      { key: 'approve', count: 2, route: '/orders?status=submitted' },
      { key: 'unopened', count: 1, route: '/orders?status=approved' },
      { key: 'declined', count: 1, route: '/orders?status=declined' },
      { key: 'drafts', count: 3, route: '/orders?status=draft' },
      { key: 'to_match', count: 89, route: '/matching' },
      { key: 'held', count: 6, route: '/held' },
    ],
  },
  '/dashboard/orders-summary': {
    stages: { draft: 3, waiting_approval: 2, sent: 1, opened: 2, accepted: 5, declined: 1,
      rejected: 0, received: 4 },
    week_orders: 6, week_value: '412350.00',
  },
  '/dashboard/price-changes': {
    days: 7, increases: 2, decreases: 1,
    items: [
      { offer_id: 'f1', supplier_id: 's1', supplier_name: 'Nishi Super Palace', heading: 'Baby Cheramy soap', label: '75g', old_price: '125.00', new_price: '129.00', changed_at: '2026-11-24T07:00:00Z' },
      { offer_id: 'f2', supplier_id: 's2', supplier_name: 'Lanka Distributors', heading: 'Anchor milk powder', label: '400g', old_price: '352.00', new_price: '348.50', changed_at: '2026-11-23T07:00:00Z' },
      { offer_id: 'f3', supplier_id: 's1', supplier_name: 'Nishi Super Palace', heading: 'Coca-Cola', label: '1.5L', old_price: '369.00', new_price: '380.00', changed_at: '2026-11-22T07:00:00Z' },
    ],
  },
  '/dashboard/base-price-insight': {
    products_compared: 12, can_save_count: 2, never_ordered_count: 31, never_ordered: [],
    can_save: [
      { online_product_id: 'p1', product_name: 'Baby Cheramy soap 75g', base_price: '125.00', base_supplier: 'Nishi Super Palace', best_price: '110.00', best_supplier: 'Lanka Distributors', saving: '15.00', saving_pct: 12.0, last_paid_at: '2026-11-20T10:00:00Z' },
      { online_product_id: 'p2', product_name: 'Anchor milk powder 400g', base_price: '352.00', base_supplier: 'Lanka Distributors', best_price: '340.00', best_supplier: 'Ceylon Foods (Pvt) Ltd', saving: '12.00', saving_pct: 3.4, last_paid_at: '2026-11-18T10:00:00Z' },
    ],
  },
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
  ['home', '/'], ['suppliers', '/suppliers'], ['orders', '/orders'], ['base-prices', '/base-prices'],
  ['held', '/held'], ['matching', '/matching'], ['order-submitted', '/orders/o1'], ['order-accepted', '/orders/o2'], ['supplier-detail', '/suppliers/s1'], ['branches', '/branches'], ['users', '/users'],
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

      test('sinhala held prices', async ({ page }) => {
        await fakeApi(page, true)
        await page.addInitScript(() => localStorage.setItem('sb.lang', 'si'))
        await page.goto('/held')
        await expect(page.locator('h1')).toBeVisible()
        await page.waitForTimeout(400)
        await page.screenshot({ path: `shots/${mode}-${size}-held-si.png`, fullPage: true })
      })

      test('accessibility audit (axe)', async ({ page }) => {
        // A report, not a gate yet: findings are fixed in the next round, then this becomes a gate.
        await fakeApi(page, true)
        const report: Record<string, unknown> = {}
        for (const [name, path] of SCREENS) {
          await page.goto(path)
          await expect(page.locator('h1')).toBeVisible()
          await page.waitForTimeout(300)
          try {
            await page.addScriptTag({ url: 'https://cdnjs.cloudflare.com/ajax/libs/axe-core/4.10.2/axe.min.js' })
            const result = await page.evaluate(async () => {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const r = await (window as any).axe.run(document, { resultTypes: ['violations'] })
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              return r.violations.map((v: any) => ({ id: v.id, impact: v.impact, help: v.help,
                nodes: v.nodes.length, sample: v.nodes[0]?.html?.slice(0, 140) }))
            })
            report[name] = result
          } catch (e) {
            report[name] = { error: String(e).slice(0, 200) }
          }
        }
        const fs = await import('node:fs')
        fs.mkdirSync('shots', { recursive: true })
        fs.writeFileSync(`shots/a11y-${mode}-${size}.json`, JSON.stringify(report, null, 2))
      })

      test('base price drawer', async ({ page }) => {
        await fakeApi(page, true)
        await page.goto('/base-prices')
        await page.getByText('Baby Cheramy soap 75g').first().click()
        await expect(page.getByText('What suppliers offer today')).toBeVisible()
        await page.waitForTimeout(500)
        await page.screenshot({ path: `shots/${mode}-${size}-base-price-drawer.png` })
      })
    })
  }
}
