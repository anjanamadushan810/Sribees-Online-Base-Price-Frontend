import { AxiosError } from 'axios'
import { describe, expect, it } from 'vitest'
import { loginErrorKind, loginErrorText } from './loginLogic'

const err = (status?: number, detail?: string) => new AxiosError('x', 'E', undefined, undefined,
  status ? ({ status, data: { detail }, statusText: '', headers: {}, config: {} } as never) : undefined)
const T = { bad: 'BAD', tooMany: 'MANY', offline: 'OFF' }

describe('login errors', () => {
  it('knows the three cases a person can act on', () => {
    expect(loginErrorKind(err(401))).toBe('bad')
    expect(loginErrorKind(err(429))).toBe('tooMany')
    expect(loginErrorKind(err(423))).toBe('tooMany')
    expect(loginErrorKind(err())).toBe('offline')
  })
  it('uses our words for those and the server words for the rest', () => {
    expect(loginErrorText(err(401), T)).toBe('BAD')
    expect(loginErrorText(err(403, 'Account is switched off'), T)).toBe('Account is switched off')
    expect(loginErrorText(new Error('boom'), T)).toBe('Something went wrong.')
  })
})
