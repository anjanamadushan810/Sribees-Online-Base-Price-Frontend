import { describe, expect, it } from 'vitest'
import { clean } from '../pages/SupplierFields'

describe('clean', () => {
  it('turns blank text into null and leaves numbers and switches alone', () => {
    expect(clean({ email: '  ', contact_name: ' Nishi ', credit_days: 0, is_related_party: false }))
      .toEqual({ email: null, contact_name: 'Nishi', credit_days: 0, is_related_party: false })
  })
})
