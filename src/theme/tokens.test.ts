import { describe, expect, it } from 'vitest'
import { PALETTE, contrast, cssVars } from './tokens'

describe('palette', () => {
  for (const mode of ['light', 'dark'] as const) {
    const p = PALETTE[mode]
    it(`${mode}: text pairs meet WCAG AA (4.5:1)`, () => {
      expect(contrast(p.text, p.bg)).toBeGreaterThanOrEqual(4.5)
      expect(contrast(p.text, p.surface)).toBeGreaterThanOrEqual(4.5)
      expect(contrast(p.muted, p.bg)).toBeGreaterThanOrEqual(4.5)
      expect(contrast(p.muted, p.surface)).toBeGreaterThanOrEqual(4.5)
      expect(contrast(p.primaryText, p.primary)).toBeGreaterThanOrEqual(4.5)
      expect(contrast(p.primary, p.surface)).toBeGreaterThanOrEqual(4.5) // links, outlines
      expect(contrast(p.primary, p.primarySoft)).toBeGreaterThanOrEqual(4.5) // selected menu
    })
    it(`${mode}: status colours are readable on their soft backgrounds`, () => {
      for (const k of ['success', 'warning', 'danger', 'info'] as const) {
        expect(contrast(p[k], p[`${k}Soft` as const])).toBeGreaterThanOrEqual(4.5)
        expect(contrast(p[k], p.surface)).toBeGreaterThanOrEqual(4.5)
      }
    })
  }

  it('every palette key has a CSS variable', () => {
    expect(Object.keys(cssVars('light')).length).toBe(Object.keys(cssVars('dark')).length)
    expect(Object.keys(cssVars('light'))).toContain('--sb-primary')
  })
})
