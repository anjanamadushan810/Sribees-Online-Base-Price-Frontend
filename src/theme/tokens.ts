import { theme as antdTheme, type ThemeConfig } from 'antd'

/** The one place colours, type and spacing are decided (UI plan, section 4.1).
 *  Nothing else in the app may hard-code a hex colour: use these, or the CSS variables
 *  `--sb-*` that ThemeProvider writes from them. */
export type Mode = 'light' | 'dark'

export interface Palette {
  bg: string          // page background
  surface: string     // cards, tables, header
  surfaceAlt: string  // zebra rows, inputs at rest, subtle panels
  border: string
  text: string
  muted: string       // secondary text (AA on bg and surface)
  primary: string     // fills, links, focus
  primaryText: string // text on a primary fill
  primarySoft: string // tinted backgrounds (selected menu item, highlights)
  success: string
  warning: string
  danger: string
  info: string
  successSoft: string
  warningSoft: string
  dangerSoft: string
  infoSoft: string
}

export const PALETTE: Record<Mode, Palette> = {
  light: {
    bg: '#FAF7F2',
    surface: '#FFFFFF',
    surfaceAlt: '#F5F0E8',
    border: '#E7DFD2',
    text: '#241F18',
    muted: '#6A6153',
    primary: '#975700',
    primaryText: '#FFFFFF',
    primarySoft: '#FCEFD8',
    success: '#1E7A46',
    warning: '#9A5B00',
    danger: '#B42318',
    info: '#1F5FA8',
    successSoft: '#E3F4EA',
    warningSoft: '#FDF0D5',
    dangerSoft: '#FDE8E6',
    infoSoft: '#E4EEFA',
  },
  dark: {
    bg: '#17140F',
    surface: '#201C15',
    surfaceAlt: '#2A251C',
    border: '#3A3326',
    text: '#F3EEE4',
    muted: '#B5AB99',
    primary: '#F5A300',
    primaryText: '#1A1305',
    primarySoft: '#3A2C0E',
    success: '#4CC38A',
    warning: '#F2B544',
    danger: '#FF8A7D',
    info: '#7DB4F0',
    successSoft: '#17301F',
    warningSoft: '#3A2C0E',
    dangerSoft: '#3D1D1A',
    infoSoft: '#1A2D45',
  },
}

export const SPACE = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const
export const RADIUS = { control: 8, card: 12 } as const

export const FONT_STACK =
  "Inter, 'Noto Sans Sinhala', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif"

/** antd theme for a mode: the light or dark algorithm plus our tokens. */
export function buildTheme(mode: Mode): ThemeConfig {
  const p = PALETTE[mode]
  return {
    algorithm: mode === 'dark' ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
    token: {
      colorPrimary: p.primary,
      colorSuccess: p.success,
      colorWarning: p.warning,
      colorError: p.danger,
      colorInfo: p.info,
      colorBgBase: p.surface,
      colorBgLayout: p.bg,
      colorBgContainer: p.surface,
      colorBgElevated: p.surface,
      colorBorder: p.border,
      colorBorderSecondary: p.border,
      colorText: p.text,
      colorTextSecondary: p.muted,
      colorTextLightSolid: p.primaryText,
      borderRadius: RADIUS.control,
      borderRadiusLG: RADIUS.card,
      fontFamily: FONT_STACK,
      fontSize: 14,
    },
    components: {
      Layout: { siderBg: p.surface, headerBg: p.surface, bodyBg: p.bg },
      Menu: { itemSelectedBg: p.primarySoft, itemSelectedColor: p.primary },
      Table: { headerBg: p.surfaceAlt, rowHoverBg: p.surfaceAlt },
      Card: { borderRadiusLG: RADIUS.card },
    },
  }
}

/** `--sb-*` CSS variables for a mode, for plain CSS and inline styles. */
export function cssVars(mode: Mode): Record<string, string> {
  const p = PALETTE[mode]
  return {
    '--sb-bg': p.bg, '--sb-surface': p.surface, '--sb-surface-alt': p.surfaceAlt,
    '--sb-border': p.border, '--sb-text': p.text, '--sb-muted': p.muted,
    '--sb-primary': p.primary, '--sb-primary-text': p.primaryText,
    '--sb-primary-soft': p.primarySoft,
    '--sb-success': p.success, '--sb-warning': p.warning, '--sb-danger': p.danger,
    '--sb-info': p.info,
    '--sb-success-soft': p.successSoft, '--sb-warning-soft': p.warningSoft,
    '--sb-danger-soft': p.dangerSoft, '--sb-info-soft': p.infoSoft,
  }
}

// ---- contrast (WCAG 2.x), used by the tokens test ---------------------------------
function channel(v: number): number {
  const c = v / 255
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
}
export function luminance(hex: string): number {
  const n = parseInt(hex.slice(1), 16)
  return 0.2126 * channel((n >> 16) & 255) + 0.7152 * channel((n >> 8) & 255)
    + 0.0722 * channel(n & 255)
}
export function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}
