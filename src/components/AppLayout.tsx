import {
  BulbOutlined,
  DollarOutlined,
  HomeOutlined,
  LinkOutlined,
  LogoutOutlined,
  MoonOutlined,
  PauseCircleOutlined,
  ShopOutlined,
  ShoppingCartOutlined,
  SunOutlined,
  TeamOutlined,
  UserOutlined,
  MoreOutlined,
} from '@ant-design/icons'
import type { InputRef } from 'antd'
import { Avatar, Button, Drawer, Dropdown, Grid, Layout, Menu, Segmented, Tooltip } from 'antd'
import { Suspense, useCallback, useMemo, useRef, useState, type ReactNode } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { useT } from '../i18n'
import type { TextKey } from '../i18n/en'
import { useTheme } from '../theme/ThemeContext'
import GlobalSearch from './GlobalSearch'
import { PageSkeleton } from './ui'
import { useShortcuts } from './useShortcuts'

interface NavItem { key: string; label: TextKey; icon: ReactNode; permission: string; main?: boolean }
interface NavGroup { label: TextKey; items: NavItem[] }

const GROUPS: NavGroup[] = [
  { label: 'nav.group.home', items: [
    { key: '/', label: 'nav.home', icon: <HomeOutlined />, permission: 'suppliers.read', main: true },
  ] },
  { label: 'nav.group.buy', items: [
    { key: '/orders', label: 'nav.orders', icon: <ShoppingCartOutlined />, permission: 'orders.read', main: true },
    { key: '/suppliers', label: 'nav.suppliers', icon: <ShopOutlined />, permission: 'suppliers.read', main: true },
  ] },
  { label: 'nav.group.prices', items: [
    { key: '/matching', label: 'nav.matching', icon: <LinkOutlined />, permission: 'matches.read', main: true },
    { key: '/base-prices', label: 'nav.basePrices', icon: <DollarOutlined />, permission: 'base_prices.read' },
    { key: '/held', label: 'nav.held', icon: <PauseCircleOutlined />, permission: 'suppliers.read' },
  ] },
  { label: 'nav.group.setup', items: [
    { key: '/branches', label: 'nav.branches', icon: <TeamOutlined />, permission: 'branches.read' },
    { key: '/users', label: 'nav.users', icon: <UserOutlined />, permission: 'users.read' },
  ] },
]

const THEME_ICON = { system: <BulbOutlined />, light: <SunOutlined />, dark: <MoonOutlined /> }
const THEME_TEXT = { system: 'top.theme.system', light: 'top.theme.light', dark: 'top.theme.dark' } as const

export default function AppLayout() {
  const { me, can, logout } = useAuth()
  const { t, lang, setLang } = useT()
  const { preference, cycle } = useTheme()
  const navigate = useNavigate()
  const location = useLocation()
  const screens = Grid.useBreakpoint()
  const phone = screens.md === false
  const [more, setMore] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const searchRef = useRef<InputRef>(null)

  const groups = useMemo(
    () => GROUPS.map((g) => ({ ...g, items: g.items.filter((i) => can(i.permission)) }))
      .filter((g) => g.items.length),
    [can],
  )
  const flat = groups.flatMap((g) => g.items)
  const selected = flat.find((n) => n.key === '/' ? location.pathname === '/' : location.pathname.startsWith(n.key))?.key
  const focusSearch = useCallback(() => searchRef.current?.focus(), [])
  const allowed = useMemo(() => ({ o: can('orders.read'), s: can('suppliers.read'), m: can('matches.read') }), [can])
  useShortcuts(focusSearch, allowed)

  const go = (key: string) => { setMore(false); navigate(key) }

  const menuItems = groups.map((g) => ({
    type: 'group' as const, key: g.label, label: collapsed || g.label === 'nav.group.home' ? null : t(g.label),
    children: g.items.map((i) => ({ key: i.key, icon: i.icon, label: t(i.label) })),
  }))

  const themeItem = {
    key: 'theme', icon: THEME_ICON[preference], label: t(THEME_TEXT[preference]), onClick: cycle,
  }
  const userMenu = (
    <Dropdown placement="bottomRight" menu={{ items: [
      // On a phone the language and theme switches live here, so the search box keeps its room.
      ...(phone ? [
        { key: 'lang', label: lang === 'en' ? 'සිංහල' : 'English', onClick: () => setLang(lang === 'en' ? 'si' : 'en') },
        themeItem,
        { type: 'divider' as const },
      ] : []),
      { key: 'out', icon: <LogoutOutlined />, label: t('top.signOut'), onClick: () => void logout() },
    ] }}>
      <Button type="text" className="user-chip" aria-label={me?.full_name}>
        <Avatar size="small" style={{ background: 'var(--sb-primary)', color: 'var(--sb-primary-text)' }}>
          {me?.full_name.slice(0, 1).toUpperCase()}
        </Avatar>
        {!phone && <span className="user-label">{me?.full_name}</span>}
        {!phone && me && <span className="role-chip">{t(`role.${me.role}` as TextKey)}</span>}
      </Button>
    </Dropdown>
  )

  const tools = phone ? userMenu : (
    <>
      <Segmented size="small" value={lang} onChange={(v) => setLang(v as 'en' | 'si')}
        aria-label={t('top.language')}
        options={[{ value: 'en', label: 'EN' }, { value: 'si', label: 'සිං' }]} />
      <Tooltip title={t(THEME_TEXT[preference])}>
        <Button type="text" icon={THEME_ICON[preference]} onClick={cycle}
          aria-label={t(THEME_TEXT[preference])} />
      </Tooltip>
      {userMenu}
    </>
  )

  const brand = (
    <div className="brand">
      <div className="brand-mark" aria-hidden>S</div>
      {!collapsed && <div><div className="brand-name">Sribees</div><div className="brand-sub">Supply</div></div>}
    </div>
  )

  return (
    <Layout style={{ minHeight: '100vh' }} className={phone ? 'has-bottom-nav' : undefined}>
      <a className="skip-link" href="#main">{t('common.skipToContent')}</a>
      {!phone && (
        <Layout.Sider theme="light" width={228} collapsible collapsed={collapsed}
          onCollapse={setCollapsed} style={{ borderRight: '1px solid var(--sb-border)' }}>
          {brand}
          <Menu mode="inline" selectedKeys={selected ? [selected] : []} items={menuItems}
            onClick={(e) => go(e.key)} style={{ borderInlineEnd: 0 }} />
        </Layout.Sider>
      )}
      <Layout>
        <Layout.Header className="topbar" style={{ height: 56, lineHeight: 'normal', paddingInline: 16 }}>
          {phone && <div className="brand-mark" aria-hidden>S</div>}
          <div className="grow"><GlobalSearch ref={searchRef} /></div>
          {tools}
        </Layout.Header>
        <Layout.Content id="main" tabIndex={-1} style={{ outline: 'none' }}>
          <div className="content"><Suspense fallback={<PageSkeleton />}><Outlet /></Suspense></div>
        </Layout.Content>
      </Layout>

      {phone && (
        <nav className="bottom-nav" aria-label="Main">
          {flat.filter((i) => i.main).map((i) => (
            <button key={i.key} type="button" onClick={() => go(i.key)}
              aria-current={selected === i.key ? 'page' : undefined}>
              {i.icon}<span>{t(i.label)}</span>
            </button>
          ))}
          <button type="button" onClick={() => setMore(true)}>
            <MoreOutlined /><span>{t('nav.more')}</span>
          </button>
        </nav>
      )}
      <Drawer open={more} onClose={() => setMore(false)} placement="bottom" height="auto"
        title={t('nav.more')}>
        <Menu mode="inline" selectedKeys={selected ? [selected] : []} items={menuItems}
          onClick={(e) => go(e.key)} style={{ borderInlineEnd: 0 }} />
      </Drawer>
    </Layout>
  )
}
