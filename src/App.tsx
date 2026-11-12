import { Spin } from 'antd'
import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './auth/AuthContext'
import LoginPage from './auth/LoginPage'
import AppLayout from './components/AppLayout'
import BasePrices from './pages/BasePrices'
import Branches from './pages/Branches'
import Held from './pages/Held'
import Matching from './pages/Matching'
import OrderDetail from './pages/OrderDetail'
import Orders from './pages/Orders'
import SupplierDetail from './pages/SupplierDetail'
import Suppliers from './pages/Suppliers'
import Users from './pages/Users'

export default function App() {
  const { me, ready } = useAuth()
  if (!ready) return <div className="center"><Spin size="large" /></div>
  if (!me) return <LoginPage />
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<Navigate to="/suppliers" replace />} />
        <Route path="/suppliers" element={<Suppliers />} />
        <Route path="/suppliers/:id" element={<SupplierDetail />} />
        <Route path="/matching" element={<Matching />} />
        <Route path="/orders" element={<Orders />} />
        <Route path="/orders/:id" element={<OrderDetail />} />
        <Route path="/base-prices" element={<BasePrices />} />
        <Route path="/held" element={<Held />} />
        <Route path="/branches" element={<Branches />} />
        <Route path="/users" element={<Users />} />
        <Route path="*" element={<Navigate to="/suppliers" replace />} />
      </Route>
    </Routes>
  )
}
