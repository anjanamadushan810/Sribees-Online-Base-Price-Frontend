/** "{done} of {total}" style texts: the order of words differs per language. */
export function fmt(text: string, values: Record<string, string | number>): string {
  return text.replace(/\{(\w+)\}/g, (m, k: string) => (k in values ? String(values[k]) : m))
}
