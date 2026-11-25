import { describe, expect, it } from 'vitest'
import { labelLooksValid, luhnDigit, prettyLabel } from './labelLogic'

describe('label numbers', () => {
  it('matches the backend check digit', () => {
    const body = '100000123'
    const n = body + luhnDigit(body)
    expect(n).toBe('1000001238') // backend make_number(100000123)
    expect(labelLooksValid(n)).toBe(true)
    expect(labelLooksValid(`${n.slice(0, 4)} ${n.slice(4, 8)}-${n.slice(8)}`)).toBe(true)
    expect(labelLooksValid(body + ((luhnDigit(body) + 1) % 10))).toBe(false)
  })
  it('refuses other shapes', () => {
    for (const bad of ['', '123', '0123456789', '12345678901', 'abcdefghij']) expect(labelLooksValid(bad)).toBe(false)
  })
  it('is shown in groups', () => { expect(prettyLabel('1000001230')).toBe('1000 0012 30') })
})
