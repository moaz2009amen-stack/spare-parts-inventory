import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthProvider'
import { useAuth } from './context/useAuth'
import Login from './pages/Login'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Products from './pages/Products'
import Categories from './pages/Categories'
import Customers from './pages/Customers'
import Suppliers from './pages/Suppliers'
import Statement from './pages/Statement'
import Sales from './pages/Sales'
import Purchases from './pages/Purchases'
import InvoicesList from './pages/InvoicesList'
import Inventory from './pages/Inventory'
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
          <Route path="/suppliers" element={<Suppliers />} />
          <Route path="/statement/:type/:id" element={<Statement />} />
          <Route path="/sales" element={<Sales />} />
          <Route path="/purchases" element={<Purchases />} />
          <Route path="/invoices" element={<InvoicesList />} />
          <Route path="/inventory" element={<Inventory />} />
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
