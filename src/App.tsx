import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthProvider'
import { useAuth } from './context/useAuth'
import Login from './pages/Login'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Products from './pages/Products'
import Categories from './pages/Categories'
import Customers from './pages/Customers'
import Statement from './pages/Statement'
import Sales from './pages/Sales'
import Orders from './pages/Orders'
import InvoicesList from './pages/InvoicesList'
import Warehouses from './pages/Warehouses'
import Stocktake from './pages/Stocktake'

function AppContent() {
  const { session, loading } = useAuth()

  if (loading) return <div className="p-8">جاري التحميل...</div>
  if (!session) return <Login />

  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/products" element={<Products />} />
          <Route path="/categories" element={<Categories />} />
          <Route path="/customers" element={<Customers />} />
          <Route path="/statement/:id" element={<Statement />} />
          <Route path="/sales" element={<Sales />} />
          <Route path="/orders" element={<Orders />} />
          <Route path="/invoices" element={<InvoicesList />} />
          <Route path="/warehouses" element={<Warehouses />} />
          <Route path="/stocktake" element={<Stocktake />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}
