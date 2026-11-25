// UI plan, phase 1: the JavaScript the first page load needs stays under 400 KB gzipped.
import { readFileSync } from 'node:fs'
import { gzipSync } from 'node:zlib'

const LIMIT_KB = 400
const html = readFileSync('dist/index.html', 'utf8')
const files = [...html.matchAll(/(?:src|href)="\/(assets\/[^"]+\.js)"/g)].map((m) => m[1])
const kb = files.reduce((n, f) => n + gzipSync(readFileSync(`dist/${f}`)).length, 0) / 1024
console.log(`first-load JS: ${kb.toFixed(0)} KB gzipped (limit ${LIMIT_KB}) in ${files.length} files`)
if (kb > LIMIT_KB) {
  console.error('first-load JavaScript is over the limit')
  process.exit(1)
}
