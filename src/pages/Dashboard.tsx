import { useEffect, useState } from 'react'
import { Loader2, TrendingUp, TrendingDown, Users, Package } from 'lucide-react'
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

export default function Dashboard() {
  const [loading, setLoading] = useState(true)
  const [totalSales, setTotalSales] = useState(0)
  const [totalOrdersCost, setTotalOrdersCost] = useState(0)
  const [topCustomers, setTopCustomers] = useState<TopEntry[]>([])
  const [topSellingProducts, setTopSellingProducts] = useState<TopEntry[]>([])
  const [topOrderedProducts, setTopOrderedProducts] = useState<TopEntry[]>([])
  const [latestInvoices, setLatestInvoices] = useState<LatestInvoice[]>([])

  useEffect(() => {
    let cancelled = false

    async function loadStats() {
      const [
        salesRes, ordersRes, saleItemsRes, orderItemsRes,
        customersRes, productsRes, warehousesRes,
      ] = await Promise.all([
        supabase.from('sales_invoices').select('*').order('created_at', { ascending: false }),
        supabase.from('orders').select('*').order('created_at', { ascending: false }),
        supabase.from('sales_invoice_items').select('*'),
        supabase.from('order_items').select('*'),
        supabase.from('customers').select('id, name'),
        supabase.from('products').select('id, name'),
        supabase.from('warehouses').select('id, name'),
      ])

      if (cancelled) return

      const sales = salesRes.data ?? []
      const orders = ordersRes.data ?? []
      const saleItems = saleItemsRes.data ?? []
      const orderItems = orderItemsRes.data ?? []
      const customerMap = Object.fromEntries((customersRes.data ?? []).map((c) => [c.id, c.name]))
      const productMap = Object.fromEntries((productsRes.data ?? []).map((p) => [p.id, p.name]))
      const warehouseMap = Object.fromEntries((warehousesRes.data ?? []).map((w) => [w.id, w.name]))

      setTotalSales(sales.reduce((sum, s) => sum + s.total_amount, 0))
      setTotalOrdersCost(orders.reduce((sum, o) => sum + o.total_cost, 0))

      const customerTotals: Record<string, number> = {}
      sales.forEach((s) => {
        if (!s.customer_id) return
        customerTotals[s.customer_id] = (customerTotals[s.customer_id] ?? 0) + s.total_amount
      })
      setTopCustomers(
        Object.entries(customerTotals)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([id, value]) => ({ name: customerMap[id] ?? 'غير معروف', value }))
      )

      const sellingTotals: Record<string, number> = {}
      saleItems.forEach((it) => {
        sellingTotals[it.product_id] = (sellingTotals[it.product_id] ?? 0) + Number(it.quantity)
      })
      setTopSellingProducts(
        Object.entries(sellingTotals)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([id, value]) => ({ name: productMap[id] ?? 'غير معروف', value }))
      )

      const orderedTotals: Record<string, number> = {}
      orderItems.forEach((it) => {
        orderedTotals[it.product_id] = (orderedTotals[it.product_id] ?? 0) + Number(it.quantity)
      })
      setTopOrderedProducts(
        Object.entries(orderedTotals)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([id, value]) => ({ name: productMap[id] ?? 'غير معروف', value }))
      )

      const combined: LatestInvoice[] = [
        ...sales.map((s) => ({
          invoice_number: s.invoice_number,
          type: 'بيع' as const,
          party: s.customer_id ? customerMap[s.customer_id] ?? 'عميل نقدي' : 'عميل نقدي',
          total: s.total_amount,
          date: s.created_at,
        })),
        ...orders.map((o) => ({
          invoice_number: o.order_number,
          type: 'طلبية' as const,
          party: warehouseMap[o.warehouse_id] ?? '-',
          total: o.total_cost,
          date: o.created_at,
        })),
      ]
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 8)

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

  return (
    <div className="page-enter p-4 md:p-6 max-w-6xl mx-auto">
      <h1 className="font-display text-xl md:text-2xl font-bold text-navy-900 mb-5 md:mb-6">لوحة الإحصائيات</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <div className="card p-5 flex items-center gap-4">
          <div className="w-11 h-11 shrink-0 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
            <TrendingUp size={20} />
          </div>
          <div className="min-w-0">
            <p className="text-sm text-slate-500">إجمالي المبيعات</p>
            <p className="font-mono-data font-bold text-xl text-navy-900">{totalSales.toFixed(2)}</p>
          </div>
        </div>
        <div className="card p-5 flex items-center gap-4">
          <div className="w-11 h-11 shrink-0 rounded-xl bg-red-50 flex items-center justify-center text-red-600">
            <TrendingDown size={20} />
          </div>
          <div className="min-w-0">
            <p className="text-sm text-slate-500">إجمالي تكلفة الطلبيات</p>
            <p className="font-mono-data font-bold text-xl text-navy-900">{totalOrdersCost.toFixed(2)}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-3">
            <Users size={16} className="text-accent-dark" />
            <p className="font-display font-bold text-navy-900">أهم العملاء</p>
          </div>
          {topCustomers.length === 0 ? (
            <p className="text-sm text-slate-500">لا توجد بيانات كافية بعد</p>
          ) : (
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
          {topSellingProducts.length === 0 ? (
            <p className="text-sm text-slate-500">لا توجد بيانات كافية بعد</p>
          ) : (
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
            <Package size={16} className="text-navy-700" />
            <p className="font-display font-bold text-navy-900">الأكثر طلبًا</p>
          </div>
          {topOrderedProducts.length === 0 ? (
            <p className="text-sm text-slate-500">لا توجد بيانات كافية بعد</p>
          ) : (
            <ul className="space-y-2">
              {topOrderedProducts.map((p, i) => (
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
          {latestInvoices.length === 0 ? (
            <p className="text-sm text-slate-500">لا توجد حركات بعد</p>
          ) : (
            <ul className="space-y-2">
              {latestInvoices.map((inv, i) => (
                <li key={i} className="flex justify-between gap-2 text-sm">
                  <span className="truncate">
                    <span className={inv.type === 'بيع' ? 'text-emerald-600' : 'text-red-600'}>
                      {inv.type}
                    </span>{' '}
                    — {inv.party}
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
