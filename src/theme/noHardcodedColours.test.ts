import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

/** UI plan, phase 0: colours live in src/theme/tokens.ts only. A hex colour anywhere else
 *  would not follow the theme (dark mode) and would escape the contrast test. */
function files(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f)
    return statSync(p).isDirectory() ? files(p) : [p]
  })
}

describe('colours', () => {
  it('no hex or rgb() colour outside src/theme/tokens.ts', () => {
    const bad: string[] = []
    for (const f of files('src')) {
      if (!/\.(tsx?|css)$/.test(f) || f.endsWith('tokens.ts') || f.endsWith('.test.ts')) continue
      const text = readFileSync(f, 'utf8')
      if (/#[0-9a-fA-F]{3,8}\b/.test(text) || /rgba?\(/.test(text)) bad.push(f)
    }
    expect(bad).toEqual([])
  })
})
