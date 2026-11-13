// Shapes of the Sribees Supply API (backend/app/api/*). Money arrives as strings.

export type Role = 'owner' | 'purchasing' | 'branch_manager' | 'accountant'

export interface Branch {
  branch_id: string
  code: string
  name: string
  online_branch_id: string | null
  is_active: boolean
}

export interface User {
  user_id: string
  email: string
  full_name: string
  role: Role
  all_branches: boolean
  is_active: boolean
  totp_enabled: boolean
  last_login_at: string | null
  branches: Branch[]
}

export interface Me extends User {
  permissions: string[]
  two_factor: boolean
}

export interface Tokens {
  status: 'ok'
  access_token: string
  expires_in: number
}

export interface Step {
  status: 'totp_required' | 'totp_setup_required'
  ticket: string
}

export interface SupplierUser {
  supplier_user_id: string
  phone: string
  full_name: string
  language: 'si' | 'en'
  is_active: boolean
  last_login_at: string | null
}

export interface Supplier {
  supplier_id: string
  name: string
  notes: string | null
  is_active: boolean
  created_at: string
  users: SupplierUser[]
}

export interface Offer {
  offer_id: string
  label: string
  price: string
  mrp: string | null
  units_per_box: number | null
  extra: string[]
  is_active: boolean
  held_reason: string | null
}

export interface CatalogProduct {
  product_id: string
  heading: string
  notes_before: string[]
  notes_after: string[]
  is_active: boolean
  offers: Offer[]
}

export interface CatalogSection {
  section_id: string
  title: string
  notes: string[]
  is_active: boolean
  products: CatalogProduct[]
}

export interface Catalog {
  supplier_id: string
  supplier_name: string
  header: string
  footer: string
  sections: CatalogSection[]
}

export interface FlaggedLine {
  line_no: number
  raw: string
  heading: string
  section: string
  flags: string[]
  price: string
  mrp: string | null
  units_per_box: number | null
  label: string
  extra: string[]
}

export interface ImportPreview {
  sections: number
  products: number
  offers: number
  new_sections: number
  new_products: number
  new_offers: number
  changed_offers: {
    line_no: number
    heading: string
    label: string
    old_price: string
    new_price: string
  }[]
  same_offers: number
  flagged: FlaggedLine[]
  reshaped: { heading: string; label: string; before: number; after: number }[]
  held: { line_no: number; raw: string; heading: string }[]
  has_header: boolean
  has_footer: boolean
}

export interface ImportResult {
  sections_new: number
  products_new: number
  offers_new: number
  offers_changed: number
  offers_same: number
  offers_skipped: number
  not_in_paste: number
}

export interface MatchProduct {
  online_product_id: string
  online_variant_id: string | null
  name: string
  name_si: string | null
  sku: string | null
  size: string | null
  score: number | null
}

export interface QueueItem {
  offer_id: string
  heading: string
  label: string
  price: string
  mrp: string | null
  units_per_box: number | null
  confirmed: MatchProduct | null
  suggestions: MatchProduct[]
}

export interface OnlineProduct {
  online_product_id: string
  sku: string | null
  name: string
  name_si: string | null
  display_size: string | null
  display_size_unit: string | null
  is_active: boolean
}

export type OrderStatus =
  | 'draft' | 'submitted' | 'approved' | 'accepted' | 'declined' | 'cancelled' | 'received'

export interface OrderLine {
  line_id: string
  offer_id: string
  heading: string
  label: string
  boxes: number
  units_per_box: number
  units: number
  unit_price: string
  mrp: string | null
  line_total: string
  online_product_id: string | null
  online_variant_id: string | null
}

export interface Order {
  order_id: string
  order_no: string
  status: OrderStatus
  branch_name: string
  goods_total: string
  delivery_charge: string | null
  total: string
  supplier_note: string | null
  approved_at: string | null
  answered_at: string | null
  cancel_reason: string | null
  cancel_note: string | null
  supplier_id: string
  supplier_name: string
  branch_id: string
  note: string | null
  created_at: string
  submitted_at: string | null
  supplier_seen_at: string | null
  lines: OrderLine[]
}

export interface BasePriceRow {
  online_product_id: string
  online_variant_id: string | null
  supplier_id: string
  order_id: string
  unit_price: string
  mrp: string | null
  recorded_at: string
  voided_at: string | null
  product_name: string
  supplier_name: string
}

export interface ProductBasePrice {
  online_product_id: string
  name: string
  history: Omit<BasePriceRow, 'product_name' | 'supplier_name'>[]
  offers: {
    offer_id: string
    supplier_id: string
    supplier_name: string
    heading: string
    label: string
    price: string
    mrp: string | null
    units_per_box: number | null
  }[]
}

export interface HeldOffer {
  offer_id: string
  supplier_id: string
  supplier_name: string
  heading: string
  label: string
  price: string
  mrp: string | null
  held_reason: string
  updated_at: string
}
