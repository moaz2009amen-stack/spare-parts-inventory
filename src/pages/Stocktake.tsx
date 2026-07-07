import { useEffect, useState } from 'react'
import { Loader2, ClipboardCheck } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import type { Database } from '../lib/database.types'

type Product = Database['public']['Tables']['products']['Row']
type Warehouse = Database['public']['Tables']['warehouses']['Row']

interface CountRow {
  productId: string
  partNumber: string
  name: string
  systemQty: number
  countedQty: string
}

export default function Stocktake() {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [warehouseId, setWarehouseId] = useState('')
  const [rows, setRows] = useState<CountRow[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [notes, setNotes] = useState('')
  const [onlyDifferences, setOnlyDifferences] = useState(false)

  useEffect(() => {
    let cancelled = false
    supabase.from('warehouses').select('*').order('created_at').then(({ data }) => {
      if (cancelled) return
      if (data) {
        setWarehouses(data)
        if (data.length > 0) setWarehouseId(data[0].id)
      }
    })
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    if (!warehouseId) return
    let cancelled = false
    setLoading(true)

    Promise.all([
      supabase.from('products').select('*').eq('is_active', true).order('name'),
      supabase.from('inventory').select('*').eq('warehouse_id', warehouseId),
    ]).then(([p, inv]) => {
      if (cancelled) return
      const invMap = Object.fromEntries((inv.data ?? []).map((i) => [i.product_id, i.quantity]))
      const combined: CountRow[] = (p.data ?? []).map((product: Product) => ({
        productId: product.id,
        partNumber: product.part_number,
        name: product.name,
        systemQty: invMap[product.id] ?? 0,
        countedQty: String(invMap[product.id] ?? 0),
      }))
      setRows(combined)
      setLoading(false)
    })

    return () => { cancelled = true }
  }, [warehouseId])

  const handleCountChange = (productId: string, value: string) => {
    setRows((prev) =>
      prev.map((r) => (r.productId === productId ? { ...r, countedQty: value } : r))
    )
  }

  const displayedRows = onlyDifferences
    ? rows.filter((r) => Number(r.countedQty) !== r.systemQty)
    : rows

  const differencesCount = rows.filter((r) => Number(r.countedQty) !== r.systemQty).length

  const handleSubmit = async () => {
    setError('')
    setSuccess('')

    const changedItems = rows
      .filter((r) => r.countedQty !== '' && Number(r.countedQty) !== r.systemQty)
      .map((r) => ({ product_id: r.productId, counted_quantity: Number(r.countedQty) }))

    if (changedItems.length === 0) {
      setError('مفيش أي فرق بين المخزون الفعلي والمسجّل، مفيش داعي لعملية جرد')
      return
    }

    if (!confirm(`هيتم تعديل كمية ${changedItems.length} صنف في المخزون حسب الجرد. متأكد؟`)) return

    setSaving(true)

    const { error } = await supabase.rpc('apply_stocktake', {
      p_warehouse_id: warehouseId,
      p_notes: notes || null,
      p_items: changedItems,
    })

    if (error) {
      setError(error.message)
    } else {
      setSuccess(`تم تسوية ${changedItems.length} صنف بنجاح، والمخزون بقى مطابق للجرد الفعلي`)
      setNotes('')
    }
    setSaving(false)
  }

  return (
    <div className="page-enter p-4 md:p-6 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 md:mb-6">
        <h1 className="font-display text-xl md:text-2xl font-bold text-navy-900">الجرد</h1>
        <select
          value={warehouseId}
          onChange={(e) => setWarehouseId(e.target.value)}
          className="border border-border-soft rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-accent"
        >
          {warehouses.map((w) => (
            <option key={w.id} value={w.id}>{w.name}</option>
          ))}
        </select>
      </div>

      <div className="card p-4 md:p-5 mb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <p className="text-sm text-slate-500">
          اكتب الكمية الفعلية اللي شايفها في المخزن قدام كل صنف. أي صنف رقمه
          مختلف عن المسجّل هيتلوّن بالبرتقالي، والنظام هيعدّل الكمية المسجّلة
          تلقائيًا لما تضغط "تسجيل الجرد" — بس للأصناف اللي فيها فرق فعلي.
        </p>
        <button
          onClick={() => setOnlyDifferences(!onlyDifferences)}
          className={`shrink-0 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
            onlyDifferences
              ? 'bg-accent text-white'
              : 'bg-white border border-border-soft text-slate-600 hover:bg-surface'
          }`}
        >
          {onlyDifferences ? 'عرض الكل' : `فيها فرق (${differencesCount})`}
        </button>
      </div>

      <div className="card overflow-hidden mb-5">
        <div className="table-scroll">
          <table className="w-full text-right">
            <thead className="bg-navy-900 text-white text-sm">
              <tr>
                <th className="p-3 whitespace-nowrap">رقم القطعة</th>
                <th className="p-3 whitespace-nowrap">الصنف</th>
                <th className="p-3 whitespace-nowrap">الكمية المسجّلة</th>
                <th className="p-3 whitespace-nowrap">الكمية الفعلية (عدّها)</th>
                <th className="p-3 whitespace-nowrap">الفرق</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="p-6 text-center text-slate-500">
                  <div className="flex items-center justify-center gap-2"><Loader2 size={16} className="animate-spin" />جاري التحميل...</div>
                </td></tr>
              ) : displayedRows.length === 0 ? (
                <tr><td colSpan={5} className="p-6 text-center text-slate-500">لا توجد أصناف لعرضها</td></tr>
              ) : (
                displayedRows.map((row) => {
                  const diff = (Number(row.countedQty) || 0) - row.systemQty
                  return (
                    <tr
                      key={row.productId}
                      className={`border-t border-border-soft transition-colors ${diff !== 0 ? 'bg-accent/5' : 'hover:bg-surface'}`}
                    >
                      <td className="p-3 font-mono-data whitespace-nowrap">{row.partNumber}</td>
                      <td className="p-3 whitespace-nowrap">{row.name}</td>
                      <td className="p-3 font-mono-data whitespace-nowrap text-slate-500">{row.systemQty}</td>
                      <td className="p-3 whitespace-nowrap">
                        <input
                          type="number"
                          value={row.countedQty}
                          onChange={(e) => handleCountChange(row.productId, e.target.value)}
                          className="w-24 border border-border-soft rounded-lg px-2 py-1.5 font-mono-data focus:outline-none focus:ring-2 focus:ring-accent"
                        />
                      </td>
                      <td className={`p-3 font-mono-data whitespace-nowrap font-bold ${
                        diff > 0 ? 'text-emerald-600' : diff < 0 ? 'text-red-600' : 'text-slate-400'
                      }`}>
                        {diff > 0 ? `+${diff}` : diff}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card p-5 md:p-6">
        <input
          type="text"
          placeholder="ملاحظة على عملية الجرد (اختياري)"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="w-full border border-border-soft rounded-xl px-3 py-2.5 mb-4 focus:outline-none focus:ring-2 focus:ring-accent"
        />

        {error && <p className="text-red-600 text-sm mb-3">{error}</p>}
        {success && <p className="text-emerald-600 text-sm mb-3">{success}</p>}

        <button
          onClick={handleSubmit}
          disabled={saving || loading}
          className="btn-primary w-full flex items-center justify-center gap-2 text-white rounded-xl py-2.5 font-medium transition-all disabled:opacity-70"
        >
          {saving ? <Loader2 size={16} className="animate-spin" /> : <ClipboardCheck size={16} />}
          {saving ? 'جاري التسوية...' : 'تسجيل الجرد وتسوية الفروقات'}
        </button>
      </div>
    </div>
  )
}
