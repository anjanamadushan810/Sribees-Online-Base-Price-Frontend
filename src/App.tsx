import { Spin } from 'antd'
import { lazy } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './auth/AuthContext'
import LoginPage from './auth/LoginPage'
import AppLayout from './components/AppLayout'

// Each page is its own chunk: the first load carries only the shell and the login.
const Home = lazy(() => import('./pages/Home'))
const BasePrices = lazy(() => import('./pages/BasePrices'))
const Branches = lazy(() => import('./pages/Branches'))
const Held = lazy(() => import('./pages/Held'))
const Matching = lazy(() => import('./pages/Matching'))
const OrderDetail = lazy(() => import('./pages/OrderDetail'))
const Orders = lazy(() => import('./pages/Orders'))
const SupplierDetail = lazy(() => import('./pages/SupplierDetail'))
const Suppliers = lazy(() => import('./pages/Suppliers'))
const Users = lazy(() => import('./pages/Users'))

export default function App() {
  const { me, ready } = useAuth()
  if (!ready) return <div className="center"><Spin size="large" /></div>
  if (!me) return <LoginPage />
  return (
    <Routes>
        <Route element={<AppLayout />}>
          <Route index element={<Home />} />
          <Route path="/suppliers" element={<Suppliers />} />
          <Route path="/suppliers/:id" element={<SupplierDetail />} />
          <Route path="/matching" element={<Matching />} />
          <Route path="/orders" element={<Orders />} />
          <Route path="/orders/:id" element={<OrderDetail />} />
          <Route path="/base-prices" element={<BasePrices />} />
          <Route path="/held" element={<Held />} />
          <Route path="/branches" element={<Branches />} />
          <Route path="/users" element={<Users />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
    </Routes>
  )
}
