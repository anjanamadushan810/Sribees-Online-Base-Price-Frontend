import {
  DollarOutlined,
  LinkOutlined,
  LogoutOutlined,
  PauseCircleOutlined,
  ShopOutlined,
  ShoppingCartOutlined,
  TeamOutlined,
  UserOutlined,
} from '@ant-design/icons'
import { Avatar, Button, Dropdown, Layout, Menu, Typography } from 'antd'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { ROLE_LABEL } from '../api/lookups'
import { useAuth } from '../auth/AuthContext'

interface NavItem { key: string; label: string; icon: React.ReactNode; permission?: string }

const NAV: NavItem[] = [
  { key: '/suppliers', label: 'Suppliers', icon: <ShopOutlined />, permission: 'suppliers.read' },
  { key: '/matching', label: 'Matching', icon: <LinkOutlined />, permission: 'matches.read' },
  { key: '/orders', label: 'Orders', icon: <ShoppingCartOutlined />, permission: 'orders.read' },
  { key: '/base-prices', label: 'Base prices', icon: <DollarOutlined />, permission: 'base_prices.read' },
  { key: '/held', label: 'Held prices', icon: <PauseCircleOutlined />, permission: 'suppliers.read' },
  { key: '/branches', label: 'Branches', icon: <TeamOutlined />, permission: 'branches.read' },
  { key: '/users', label: 'Users', icon: <UserOutlined />, permission: 'users.read' },
]

export default function AppLayout() {
  const { me, can, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const selected = NAV.find((n) => location.pathname.startsWith(n.key))?.key

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Layout.Sider breakpoint="lg" collapsedWidth={0} theme="light" width={220}
        style={{ borderRight: '1px solid #f0f0f0' }}>
        <div style={{ padding: '18px 20px', fontWeight: 700, fontSize: 17 }}>Sribees Supply</div>
        <Menu mode="inline" selectedKeys={selected ? [selected] : []}
          items={NAV.filter((n) => !n.permission || can(n.permission)).map((n) => ({
            key: n.key, label: n.label, icon: n.icon,
          }))}
          onClick={(e) => navigate(e.key)} />
      </Layout.Sider>
      <Layout>
        <Layout.Header style={{ background: '#fff', display: 'flex', justifyContent: 'flex-end',
          alignItems: 'center', padding: '0 20px', borderBottom: '1px solid #f0f0f0' }}>
          <Dropdown menu={{ items: [{ key: 'out', icon: <LogoutOutlined />, label: 'Sign out',
            onClick: () => void logout() }] }}>
            <Button type="text">
              <Avatar size="small" style={{ background: '#c77700' }}>
                {me?.full_name.slice(0, 1).toUpperCase()}
              </Avatar>
              <span style={{ marginLeft: 8 }}>{me?.full_name}</span>
              <Typography.Text type="secondary" style={{ marginLeft: 8 }}>
                {me ? ROLE_LABEL[me.role] : ''}
              </Typography.Text>
            </Button>
          </Dropdown>
        </Layout.Header>
        <Layout.Content style={{ padding: 20 }}>
          <Outlet />
        </Layout.Content>
      </Layout>
    </Layout>
  )
}
