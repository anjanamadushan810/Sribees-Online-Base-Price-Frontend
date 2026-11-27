import { describe, expect, it } from 'vitest'
import { en } from '../i18n/en'
import { si } from '../i18n/si'
import { REASONS } from './Reorder'

describe('automatic orders', () => {
  it('every reason the server gives has words in both languages', () => {
    for (const r of REASONS) {
      expect(en[`ro.why.${r}` as keyof typeof en]).toBeTruthy()
      expect(si[`ro.why.${r}` as keyof typeof si]).toBeTruthy()
    }
  })
})
