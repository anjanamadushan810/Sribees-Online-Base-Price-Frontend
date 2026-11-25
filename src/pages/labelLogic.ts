/** Sribees QR label numbers: 9 digits + a Luhn check digit (same rule as the backend). */

export function luhnDigit(body: string): number {
  let total = 0
  for (let i = 0; i < body.length; i++) {
    let d = Number(body[body.length - 1 - i])
    if (i % 2 === 0) { d *= 2; if (d > 9) d -= 9 }
    total += d
  }
  return (10 - (total % 10)) % 10
}

export function labelLooksValid(raw: string): boolean {
  const s = raw.replace(/[\s-]/g, '')
  return /^[1-9]\d{9}$/.test(s) && luhnDigit(s.slice(0, 9)) === Number(s[9])
}

export function prettyLabel(n: string): string {
  return `${n.slice(0, 4)} ${n.slice(4, 8)} ${n.slice(8)}`
}
