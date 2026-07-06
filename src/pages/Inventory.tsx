import { useEffect, useState } from 'react'
import { Loader2, AlertTriangle } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import type { Database } from '../lib/database.types'

type Inventory = Database['public']['Tables']['inventory']['Row']
type Product = Database['public']['Tables']['products']['Row']
type Warehouse = Database['public']['Tables']['warehouses']['Row']

interface InventoryRow {
  productId: string
  productName: string
  partNumber: string
  warehouseName: string
  quantity: number
  minStockAlert: number
  isLow: boolean
}

export default function Inventory() {
  const [rows, setRows] = useState<InventoryRow[]>([])
  const [loading, setLoading] = useState(true)
  const [showLowOnly, setShowLowOnly] = useState(false)

  useEffect(() => {
    let cancelled = false

    Promise.all([
      supabase.from('inventory').select('*'),
      supabase.from('products').select('*'),
      supabase.from('warehouses').select('*'),
    ]).then(([inv, prod, wh]) => {
      if (cancelled) return

      const inventory = (inv.data ?? []) as Inventory[]
      const products = (prod.data ?? []) as Product[]
      const warehouses = (wh.data ?? []) as Warehouse[]

      const productMap = Object.fromEntries(products.map((p) => [p.id, p]))
      const warehouseMap = Object.fromEntries(warehouses.map((w) => [w.id, w.name]))

      const combined: InventoryRow[] = inventory
        .map((inv) => {
          const product = productMap[inv.product_id]
          if (!product) return null
          return {
            productId: inv.product_id,
            productName: product.name,
            partNumber: product.part_number,
            warehouseName: warehouseMap[inv.warehouse_id] ?? '-',
            quantity: inv.quantity,
            minStockAlert: product.min_stock_alert ?? 0,
            isLow: inv.quantity <= (product.min_stock_alert ?? 0),
          }
        })
        .filter((r): r is InventoryRow => r !== null)
        .sort((a, b) => a.productName.localeCompare(b.productName, 'ar'))

      setRows(combined)
      setLoading(false)
    })

    return () => {
      cancelled = true
    }
  }, [])

  const displayedRows = showLowOnly ? rows.filter((r) => r.isLow) : rows
  const lowCount = rows.filter((r) => r.isLow).length

  return (
    <div className="page-enter p-4 md:p-6 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 md:mb-6">
        <h1 className="font-display text-xl md:text-2xl font-bold text-navy-900">المخزون الحالي</h1>
        <button
          onClick={() => setShowLowOnly(!showLowOnly)}
          className={`flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
            showLowOnly
              ? 'bg-red-600 text-white'
              : 'bg-white border border-border-soft text-slate-600 hover:bg-surface'
          }`}
        >
          <AlertTriangle size={16} />
          {showLowOnly ? `عرض الكل` : `الأصناف الناقصة (${lowCount})`}
        </button>
      </div>

      <div className="card overflow-hidden">
        <div className="table-scroll">
          <table className="w-full text-right">
            <thead className="bg-navy-900 text-white text-sm">
              <tr>
                <th className="p-3 whitespace-nowrap">رقم القطعة</th>
                <th className="p-3 whitespace-nowrap">الصنف</th>
                <th className="p-3 whitespace-nowrap">المخزن</th>
                <th className="p-3 whitespace-nowrap">الكمية الحالية</th>
                <th className="p-3 whitespace-nowrap">حد التنبيه</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-slate-500">
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 size={16} className="animate-spin" />
                      جاري التحميل...
                    </div>
                  </td>
                </tr>
              ) : displayedRows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-slate-500">
                    {showLowOnly ? 'لا توجد أصناف ناقصة حاليًا 👍' : 'لا توجد بيانات مخزون بعد'}
                  </td>
                </tr>
              ) : (
                displayedRows.map((row, i) => (
                  <tr key={i} className="border-t border-border-soft hover:bg-surface transition-colors">
                    <td className="p-3 font-mono-data whitespace-nowrap">{row.partNumber}</td>
                    <td className="p-3 whitespace-nowrap">{row.productName}</td>
                    <td className="p-3 whitespace-nowrap">{row.warehouseName}</td>
                    <td className={`p-3 font-mono-data whitespace-nowrap font-bold ${row.isLow ? 'text-red-600' : 'text-navy-900'}`}>
                      {row.quantity}
                    </td>
                    <td className="p-3 font-mono-data whitespace-nowrap text-slate-500">{row.minStockAlert}</td>
                    <td className="p-3 whitespace-nowrap">
                      {row.isLow && (
                        <span className="flex items-center gap-1 text-xs bg-red-50 text-red-600 px-2 py-1 rounded-full font-medium">
                          <AlertTriangle size={12} />
                          وصل للحد الأدنى
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
