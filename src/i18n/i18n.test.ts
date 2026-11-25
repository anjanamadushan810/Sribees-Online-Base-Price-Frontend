import { describe, expect, it } from 'vitest'
import { en } from './en'
import { si } from './si'

describe('texts', () => {
  it('Sinhala has exactly the keys English has', () => {
    expect(Object.keys(si).sort()).toEqual(Object.keys(en).sort())
  })
  it('nothing is empty', () => {
    for (const v of [...Object.values(en), ...Object.values(si)]) expect(v.trim()).not.toBe('')
  })
})
