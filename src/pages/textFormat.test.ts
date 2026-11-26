import { describe, expect, it } from 'vitest'
import { fmt } from './textFormat'

describe('fmt', () => {
  it('fills named values in any word order', () => {
    expect(fmt('{done} of {total}', { done: 3, total: 9 })).toBe('3 of 9')
    expect(fmt('{missing} stays', {})).toBe('{missing} stays')
  })
})
