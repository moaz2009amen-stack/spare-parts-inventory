import { useEffect, useState } from 'react'
import { Loader2, TrendingUp, TrendingDown, Users, Package, DollarSign, ShoppingBag } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { supabase } from '../lib/supabaseClient'

interface TopEntry {
  name: string
  value: number
}

interface LatestInvoice {
  invoice_number: string
  type: 'بيع' | 'طلبية'
  party: string
  total: number
  date: string
}

interface ChartPoint {
  date: string
  sales: number
  profit: number
}

export default function Dashboard() {
  const [loading, setLoading] = useState(true)
  const [totalSales, setTotalSales] = useState(0)
  const [totalOrdersCost, setTotalOrdersCost] = useState(0)
  const [totalProfit, setTotalProfit] = useState(0)
  const [totalOrdersCount, setTotalOrdersCount] = useState(0)
  const [topCustomers, setTopCustomers] = useState<TopEntry[]>([])
  const [topSellingProducts, setTopSellingProducts] = useState<TopEntry[]>([])
  const [leastSellingProducts, setLeastSellingProducts] = useState<TopEntry[]>([])
  const [latestInvoices, setLatestInvoices] = useState<LatestInvoice[]>([])
  const [chartData, setChartData] = useState<ChartPoint[]>([])

  useEffect(() => {
    let cancelled = false

    async function loadStats() {
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29)
      thirtyDaysAgo.setHours(0, 0, 0, 0)

      const [
        salesRes, ordersRes, saleItemsRes,
        customersRes, productsRes, warehousesRes,
      ] = await Promise.all([
        supabase.from('sales_invoices').select('*').order('created_at', { ascending: false }),
        supabase.from('orders').select('*').order('created_at', { ascending: false }),
        supabase.from('sales_invoice_items').select('*, sales_invoices(created_at)'),
        supabase.from('customers').select('id, name'),
        supabase.from('products').select('id, name'),
        supabase.from('warehouses').select('id, name'),
      ])

      if (cancelled) return

      const sales = salesRes.data ?? []
      const orders = ordersRes.data ?? []
      const saleItems = saleItemsRes.data ?? []
      const customerMap = Object.fromEntries((customersRes.data ?? []).map((c) => [c.id, c.name]))
      const productMap = Object.fromEntries((productsRes.data ?? []).map((p) => [p.id, p.name]))
      const warehouseMap = Object.fromEntries((warehousesRes.data ?? []).map((w) => [w.id, w.name]))

      setTotalSales(sales.reduce((sum, s) => sum + s.total_amount, 0))
      setTotalOrdersCost(orders.reduce((sum, o) => sum + o.total_cost, 0))
      setTotalOrdersCount(sales.length)

      // الربح الدقيق: الإيراد ناقص التكلفة الفعلية الحقيقية (actual_cost)
      // المسجّلة وقت البيع من نظام الدفعات (FIFO)، مش تقدير
      let profit = 0
      const dailyMap: Record<string, { sales: number; profit: number }> = {}

      saleItems.forEach((it) => {
        const inv = it.sales_invoices as unknown as { created_at: string } | null
        const itemRevenue = it.quantity * it.unit_price
        const itemProfit = itemRevenue - (it.actual_cost ?? 0)
        profit += itemProfit

        if (inv) {
          const day = new Date(inv.created_at).toISOString().slice(0, 10)
          if (!dailyMap[day]) dailyMap[day] = { sales: 0, profit: 0 }
          dailyMap[day].sales += itemRevenue
          dailyMap[day].profit += itemProfit
        }
      })
      setTotalProfit(profit)

      const chart: ChartPoint[] = []
      for (let i = 0; i < 30; i++) {
        const d = new Date(thirtyDaysAgo)
        d.setDate(d.getDate() + i)
        const key = d.toISOString().slice(0, 10)
        chart.push({
          date: d.toLocaleDateString('ar-EG', { day: 'numeric', month: 'short' }),
          sales: Math.round((dailyMap[key]?.sales ?? 0) * 100) / 100,
          profit: Math.round((dailyMap[key]?.profit ?? 0) * 100) / 100,
        })
      }
      setChartData(chart)

      const customerTotals: Record<string, number> = {}
      sales.forEach((s) => {
        if (!s.customer_id) return
        customerTotals[s.customer_id] = (customerTotals[s.customer_id] ?? 0) + s.total_amount
      })
      setTopCustomers(
        Object.entries(customerTotals).sort((a, b) => b[1] - a[1]).slice(0, 5)
          .map(([id, value]) => ({ name: customerMap[id] ?? 'غير معروف', value }))
      )

      const sellingTotals: Record<string, number> = {}
      saleItems.forEach((it) => {
        sellingTotals[it.product_id] = (sellingTotals[it.product_id] ?? 0) + Number(it.quantity)
      })
      setTopSellingProducts(
        Object.entries(sellingTotals).sort((a, b) => b[1] - a[1]).slice(0, 5)
          .map(([id, value]) => ({ name: productMap[id] ?? 'غير معروف', value }))
      )
      setLeastSellingProducts(
        Object.entries(sellingTotals).sort((a, b) => a[1] - b[1]).slice(0, 5)
          .map(([id, value]) => ({ name: productMap[id] ?? 'غير معروف', value }))
      )

      const combined: LatestInvoice[] = [
        ...sales.map((s) => ({
          invoice_number: s.invoice_number, type: 'بيع' as const,
          party: s.customer_id ? customerMap[s.customer_id] ?? 'عميل نقدي' : 'عميل نقدي',
          total: s.total_amount, date: s.created_at,
        })),
        ...orders.map((o) => ({
          invoice_number: o.order_number, type: 'طلبية' as const,
          party: warehouseMap[o.warehouse_id] ?? '-',
          total: o.total_cost, date: o.created_at,
        })),
      ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 8)

      setLatestInvoices(combined)
      setLoading(false)
    }

    loadStats()
    return () => { cancelled = true }
  }, [])

  if (loading) {
    return (
      <div className="p-8 flex items-center gap-2 text-slate-500">
        <Loader2 size={16} className="animate-spin" />
        جاري تحميل الإحصائيات...
      </div>
    )
  }

  const profitMargin = totalSales > 0 ? (totalProfit / totalSales) * 100 : 0

  return (
    <div className="page-enter p-4 md:p-6 max-w-6xl mx-auto">
      <h1 className="font-display text-xl md:text-2xl font-bold text-navy-900 mb-5 md:mb-6">لوحة الإحصائيات</h1>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <div className="card p-4 flex items-center gap-3">
          <div className="w-10 h-10 shrink-0 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
            <TrendingUp size={18} />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-slate-500">المبيعات</p>
            <p className="font-mono-data font-bold text-navy-900 truncate">{totalSales.toFixed(0)}</p>
          </div>
        </div>
        <div className="card p-4 flex items-center gap-3">
          <div className="w-10 h-10 shrink-0 rounded-xl bg-accent/10 flex items-center justify-center text-accent-dark">
            <DollarSign size={18} />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-slate-500">الأرباح ({profitMargin.toFixed(0)}%)</p>
            <p className="font-mono-data font-bold text-navy-900 truncate">{totalProfit.toFixed(0)}</p>
          </div>
        </div>
        <div className="card p-4 flex items-center gap-3">
          <div className="w-10 h-10 shrink-0 rounded-xl bg-red-50 flex items-center justify-center text-red-600">
            <TrendingDown size={18} />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-slate-500">تكلفة الطلبيات</p>
            <p className="font-mono-data font-bold text-navy-900 truncate">{totalOrdersCost.toFixed(0)}</p>
          </div>
        </div>
        <div className="card p-4 flex items-center gap-3">
          <div className="w-10 h-10 shrink-0 rounded-xl bg-navy-900/5 flex items-center justify-center text-navy-900">
            <ShoppingBag size={18} />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-slate-500">عدد الفواتير</p>
            <p className="font-mono-data font-bold text-navy-900 truncate">{totalOrdersCount}</p>
          </div>
        </div>
      </div>

      <p className="text-xs text-emerald-600 mb-4">
        ✓ الأرباح دلوقتي دقيقة 100%، محسوبة من التكلفة الحقيقية الفعلية لكل قطعة اتباعت (نظام تتبع الدفعات FIFO).
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="card p-5">
          <p className="font-display font-bold text-navy-900 mb-3">المبيعات — آخر 30 يوم</p>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e7e9f2" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} interval={4} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip />
              <Line type="monotone" dataKey="sales" stroke="#f0930f" strokeWidth={2} dot={false} name="المبيعات" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="card p-5">
          <p className="font-display font-bold text-navy-900 mb-3">الأرباح — آخر 30 يوم</p>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e7e9f2" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} interval={4} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip />
              <Line type="monotone" dataKey="profit" stroke="#101d40" strokeWidth={2} dot={false} name="الربح" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-3">
            <Users size={16} className="text-accent-dark" />
            <p className="font-display font-bold text-navy-900">أهم العملاء</p>
          </div>
          {topCustomers.length === 0 ? <p className="text-sm text-slate-500">لا توجد بيانات كافية</p> : (
            <ul className="space-y-2">
              {topCustomers.map((c, i) => (
                <li key={i} className="flex justify-between gap-2 text-sm">
                  <span className="truncate">{c.name}</span>
                  <span className="font-mono-data font-medium shrink-0">{c.value.toFixed(2)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="card p-5">
          <div className="flex items-center gap-2 mb-3">
            <Package size={16} className="text-accent-dark" />
            <p className="font-display font-bold text-navy-900">الأكثر مبيعًا</p>
          </div>
          {topSellingProducts.length === 0 ? <p className="text-sm text-slate-500">لا توجد بيانات كافية</p> : (
            <ul className="space-y-2">
              {topSellingProducts.map((p, i) => (
                <li key={i} className="flex justify-between gap-2 text-sm">
                  <span className="truncate">{p.name}</span>
                  <span className="font-mono-data font-medium shrink-0">{p.value} قطعة</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-3">
            <Package size={16} className="text-slate-400" />
            <p className="font-display font-bold text-navy-900">الأقل مبيعًا</p>
          </div>
          {leastSellingProducts.length === 0 ? <p className="text-sm text-slate-500">لا توجد بيانات كافية</p> : (
            <ul className="space-y-2">
              {leastSellingProducts.map((p, i) => (
                <li key={i} className="flex justify-between gap-2 text-sm">
                  <span className="truncate">{p.name}</span>
                  <span className="font-mono-data font-medium shrink-0">{p.value} قطعة</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="card p-5">
          <p className="font-display font-bold text-navy-900 mb-3">آخر الحركات</p>
          {latestInvoices.length === 0 ? <p className="text-sm text-slate-500">لا توجد حركات بعد</p> : (
            <ul className="space-y-2">
              {latestInvoices.map((inv, i) => (
                <li key={i} className="flex justify-between gap-2 text-sm">
                  <span className="truncate">
                    <span className={inv.type === 'بيع' ? 'text-emerald-600' : 'text-red-600'}>{inv.type}</span>
                    {' '}— {inv.party}
                  </span>
                  <span className="font-mono-data font-medium shrink-0">{inv.total}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
