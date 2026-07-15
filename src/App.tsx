import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { AuthProvider } from './context/AuthProvider'
import { useAuth } from './context/useAuth'
import Login from './pages/Login'
import Layout from './components/Layout'

// تحميل كسول (Lazy) لكل صفحة — كل صفحة بتتحمّل بملفها المنفصل أول
// مرة يدخلها المستخدم بس، مش كلهم مع بعض في نفس الملف الأساسي وقت
// فتح الموقع. ده بيقلل حجم الملف الأول اللي المتصفح لازم يحمّله
// ويفسّره قبل ما يظهر أي حاجة، خصوصًا إن فيه صفحات بتستخدم مكتبات
// تقيلة (الرسوم البيانية في الإحصائيات، تصدير الإكسل).
const Dashboard = lazy(() => import('./pages/Dashboard'))
const Products = lazy(() => import('./pages/Products'))
const Categories = lazy(() => import('./pages/Categories'))
const Customers = lazy(() => import('./pages/Customers'))
const Statement = lazy(() => import('./pages/Statement'))
const Sales = lazy(() => import('./pages/Sales'))
const Orders = lazy(() => import('./pages/Orders'))
const InvoicesList = lazy(() => import('./pages/InvoicesList'))
const Returns = lazy(() => import('./pages/Returns'))
const Warehouses = lazy(() => import('./pages/Warehouses'))
const Stocktake = lazy(() => import('./pages/Stocktake'))
const Settings = lazy(() => import('./pages/Settings'))
const Reports = lazy(() => import('./pages/Reports'))
const ProductReport = lazy(() => import('./pages/ProductReport'))
const WarehouseReport = lazy(() => import('./pages/WarehouseReport'))
const OrderReport = lazy(() => import('./pages/OrderReport'))
const ActivityLog = lazy(() => import('./pages/ActivityLog'))

function PageLoader() {
  return (
    <div className="p-8 flex items-center gap-2 text-slate-500">
      <Loader2 size={16} className="animate-spin" />
      جاري التحميل...
    </div>
  )
}

function AppContent() {
  const { session, loading } = useAuth()

  if (loading) return <div className="p-8">جاري التحميل...</div>
  if (!session) return <Login />

  return (
    <BrowserRouter>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/reports/product/:id" element={<ProductReport />} />
            <Route path="/reports/warehouse/:id" element={<WarehouseReport />} />
            <Route path="/reports/order/:id" element={<OrderReport />} />
            <Route path="/products" element={<Products />} />
            <Route path="/categories" element={<Categories />} />
            <Route path="/customers" element={<Customers />} />
            <Route path="/statement/:id" element={<Statement />} />
            <Route path="/sales" element={<Sales />} />
            <Route path="/orders" element={<Orders />} />
            <Route path="/invoices" element={<InvoicesList />} />
            <Route path="/returns" element={<Returns />} />
            <Route path="/warehouses" element={<Warehouses />} />
            <Route path="/stocktake" element={<Stocktake />} />
            <Route path="/activity-log" element={<ActivityLog />} />
            <Route path="/settings" element={<Settings />} />
          </Route>
        </Routes>
      </Suspense>
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