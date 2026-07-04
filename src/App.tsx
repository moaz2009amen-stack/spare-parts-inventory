import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthProvider'
import { useAuth } from './context/useAuth'
import Login from './pages/Login'
import Layout from './components/Layout'
import Products from './pages/Products'
import ComingSoon from './pages/ComingSoon'

function AppContent() {
  const { session, loading } = useAuth()

  if (loading) return <div className="p-8">جاري التحميل...</div>
  if (!session) return <Login />

  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Navigate to="/products" replace />} />
          <Route path="/products" element={<Products />} />
          <Route path="/customers" element={<ComingSoon title="العملاء" />} />
          <Route path="/suppliers" element={<ComingSoon title="الموردين" />} />
          <Route path="/sales" element={<ComingSoon title="المبيعات" />} />
          <Route path="/purchases" element={<ComingSoon title="المشتريات" />} />
          <Route path="/inventory" element={<ComingSoon title="المخزون" />} />
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
