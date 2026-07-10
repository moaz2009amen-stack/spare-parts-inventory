import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Loader2, ArrowRight } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import type { Database } from '../lib/database.types'

type Order = Database['public']['Tables']['orders']['Row']

interface ItemReport {
  productId: string
  name: string
  orderedQty: number
  unitCost: number
  soldQty: number
  soldRevenue: number
  remainingQty: number
  lastSaleDate: string | null
}

export default function OrderReport() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [order, setOrder] = useState<Order | null>(null)
  const [warehouseName, setWarehouseName] = useState('')
  const [items, setItems] = useState<ItemReport[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    let cancelled = false

    async function load() {
      const { data: orderData } = await supabase.from('orders').select('*').eq('id', id).single()
      if (!orderData) { setLoading(false); return }
      setOrder(orderData)

      const { data: wh } = await supabase.from('warehouses').select('name').eq('id', orderData.warehouse_id).single()
      setWarehouseName(wh?.name ?? '-')

      const { data: orderItems } = await supabase.from('order_items').select('*').eq('order_id', id)
      const { data: products } = await supabase.from('products').select('id, name')
      const productMap = Object.fromEntries((products ?? []).map((p) => [p.id, p.name]))

      const reports: ItemReport[] = []
      for (const item of orderItems ?? []) {
        const { data: sales } = await supabase
          .from('sales_invoice_items')
          .select('quantity, unit_price, sales_invoices!inner(created_at, warehouse_id)')
          .eq('product_id', item.product_id)
          .eq('sales_invoices.warehouse_id', orderData.warehouse_id)
          .gte('sales_invoices.created_at', orderData.created_at)

        const soldQty = (sales ?? []).reduce((s, x) => s + Number(x.quantity), 0)
        const soldRevenue = (sales ?? []).reduce((s, x) => s + x.quantity * x.unit_price, 0)
        const lastSale = (sales ?? [])
          .map((x) => (x.sales_invoices as unknown as { created_at: string }).created_at)
          .sort()
          .reverse()[0]

        const { data: inv } = await supabase
          .from('inventory')
          .select('quantity')
          .eq('product_id', item.product_id)
          .eq('warehouse_id', orderData.warehouse_id)
          .single()

        reports.push({
          productId: item.product_id,
          name: productMap[item.product_id] ?? item.product_id,
          orderedQty: item.quantity,
          unitCost: item.unit_cost,
          soldQty: Math.min(soldQty, item.quantity),
          soldRevenue,
          remainingQty: inv?.quantity ?? 0,
          lastSaleDate: lastSale ?? null,
        })
      }

      if (!cancelled) {
        setItems(reports)
        setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [id])

  if (loading || !order) {
    return (
      <div className="p-8 flex items-center gap-2 text-slate-500">
        <Loader2 size={16} className="animate-spin" />
        جاري التحميل...
      </div>
    )
  }

  const totalOrderedQty = items.reduce((s, i) => s + i.orderedQty, 0)
  const totalSoldQty = items.reduce((s, i) => s + i.soldQty, 0)
  const sellThroughPercent = totalOrderedQty > 0 ? (totalSoldQty / totalOrderedQty) * 100 : 0
  const totalProfit = items.reduce((s, i) => s + (i.soldRevenue - i.soldQty * i.unitCost), 0)
  const bestSelling = [...items].sort((a, b) => b.soldQty - a.soldQty)[0]

  return (
    <div className="page-enter p-4 md:p-6 max-w-4xl mx-auto">
      <button onClick={() => navigate('/invoices')} className="flex items-center gap-1 text-sm text-accent-dark hover:underline mb-4">
        <ArrowRight size={14} /> رجوع للفواتير والطلبيات
      </button>

      <div className="card p-5 md:p-6 mb-6">
        <h1 className="font-display text-xl md:text-2xl font-bold text-navy-900">تقرير طلبية {order.order_number}</h1>
        <p className="text-sm text-slate-500 mt-1">{warehouseName} — {new Date(order.created_at).toLocaleString('ar-EG')}</p>
        {order.notes && <p className="text-sm text-slate-500 mt-1">{order.notes}</p>}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div className="card p-4">
          <p className="text-xs text-slate-500 mb-1">إجمالي تكلفة الطلبية</p>
          <p className="font-mono-data font-bold text-lg text-navy-900">{order.total_cost.toFixed(2)}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-slate-500 mb-1">عدد الأصناف</p>
          <p className="font-mono-data font-bold text-lg text-navy-900">{items.length}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-slate-500 mb-1">نسبة بيع الطلبية</p>
          <p className="font-mono-data font-bold text-lg text-navy-900">{sellThroughPercent.toFixed(0)}%</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-slate-500 mb-1">الأرباح التقديرية</p>
          <p className="font-mono-data font-bold text-lg text-emerald-600">{totalProfit.toFixed(2)}</p>
        </div>
      </div>

      {bestSelling && bestSelling.soldQty > 0 && (
        <p className="text-sm text-slate-600 mb-4">
          أكثر صنف مبيعًا من الطلبية دي: <span className="font-medium text-navy-900">{bestSelling.name}</span> ({bestSelling.soldQty} قطعة)
        </p>
      )}

      <p className="text-xs text-slate-400 mb-3">
        * "الكمية المباعة" هنا تقديرية: بتحسب كل بيع لنفس الصنف من نفس المخزن بعد تاريخ الطلبية،
        مش بالضرورة نفس القطع بالظبط (النظام مايتتبعش دفعات كل طلبية على حدة).
      </p>

      <div className="card overflow-hidden">
        <div className="table-scroll">
          <table className="w-full text-sm">
            <thead className="bg-navy-900 text-white">
              <tr>
                <th className="p-2.5 text-right whitespace-nowrap">الصنف</th>
                <th className="p-2.5 text-right whitespace-nowrap">اتشرت</th>
                <th className="p-2.5 text-right whitespace-nowrap">اتباعت</th>
                <th className="p-2.5 text-right whitespace-nowrap">المتبقي حاليًا</th>
                <th className="p-2.5 text-right whitespace-nowrap">آخر بيع</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it, i) => (
                <tr key={i} className="border-t border-border-soft">
                  <td className="p-2.5 whitespace-nowrap">{it.name}</td>
                  <td className="p-2.5 font-mono-data whitespace-nowrap">{it.orderedQty}</td>
                  <td className="p-2.5 font-mono-data whitespace-nowrap">{it.soldQty}</td>
                  <td className="p-2.5 font-mono-data whitespace-nowrap">{it.remainingQty}</td>
                  <td className="p-2.5 whitespace-nowrap text-slate-500">
                    {it.lastSaleDate ? new Date(it.lastSaleDate).toLocaleDateString('ar-EG') : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
