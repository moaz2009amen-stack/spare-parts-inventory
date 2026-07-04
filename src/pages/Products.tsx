import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import type { Database } from '../lib/database.types'

type Product = Database['public']['Tables']['products']['Row']

export default function Products() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState({
    part_number: '',
    barcode: '',
    name: '',
    base_unit: 'قطعة',
    cost_price: '',
    sale_price: '',
    min_stock_alert: '',
  })

  const loadProducts = async () => {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) setError(error.message)
    else setProducts(data ?? [])
    setLoading(false)
  }

  useEffect(() => {
    let cancelled = false

    supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (cancelled) return
        if (error) setError(error.message)
        else setProducts(data ?? [])
        setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSaving(true)

    const { error } = await supabase.from('products').insert({
      part_number: form.part_number,
      barcode: form.barcode || null,
      name: form.name,
      base_unit: form.base_unit,
      cost_price: Number(form.cost_price) || 0,
      sale_price: Number(form.sale_price) || 0,
      min_stock_alert: Number(form.min_stock_alert) || 0,
    })

    if (error) {
      setError(
        error.code === '23505'
          ? 'رقم القطعة أو الباركود ده مسجل بالفعل'
          : error.message
      )
    } else {
      setForm({
        part_number: '',
        barcode: '',
        name: '',
        base_unit: 'قطعة',
        cost_price: '',
        sale_price: '',
        min_stock_alert: '',
      })
      setLoading(true)
      await loadProducts()
    }
    setSaving(false)
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="font-display text-2xl font-bold text-navy-900 mb-6">إدارة الأصناف</h1>

      <form
        onSubmit={handleSubmit}
        className="bg-white p-6 rounded-lg shadow-sm border border-border-soft mb-8 grid grid-cols-2 gap-4"
      >
        <input
          name="part_number"
          value={form.part_number}
          onChange={handleChange}
          placeholder="رقم القطعة"
          required
          className="border border-border-soft rounded px-3 py-2 font-mono-data focus:outline-none focus:ring-2 focus:ring-accent"
        />
        <input
          name="barcode"
          value={form.barcode}
          onChange={handleChange}
          placeholder="الباركود (اختياري)"
          className="border border-border-soft rounded px-3 py-2 font-mono-data focus:outline-none focus:ring-2 focus:ring-accent"
        />
        <input
          name="name"
          value={form.name}
          onChange={handleChange}
          placeholder="اسم الصنف"
          required
          className="border border-border-soft rounded px-3 py-2 col-span-2 focus:outline-none focus:ring-2 focus:ring-accent"
        />
        <input
          name="cost_price"
          value={form.cost_price}
          onChange={handleChange}
          placeholder="سعر التكلفة"
          type="number"
          step="0.01"
          className="border border-border-soft rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent"
        />
        <input
          name="sale_price"
          value={form.sale_price}
          onChange={handleChange}
          placeholder="سعر البيع"
          type="number"
          step="0.01"
          className="border border-border-soft rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent"
        />
        <input
          name="min_stock_alert"
          value={form.min_stock_alert}
          onChange={handleChange}
          placeholder="حد التنبيه الأدنى"
          type="number"
          className="border border-border-soft rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent"
        />

        {error && <p className="text-red-600 text-sm col-span-2">{error}</p>}

        <button
          type="submit"
          disabled={saving}
          className="col-span-2 bg-accent text-white rounded py-2 font-medium hover:bg-accent-dark transition-colors"
        >
          {saving ? 'جاري الحفظ...' : 'إضافة الصنف'}
        </button>
      </form>

      <div className="bg-white rounded-lg shadow-sm border border-border-soft overflow-hidden">
        <table className="w-full text-right">
          <thead className="bg-navy-900 text-white text-sm">
            <tr>
              <th className="p-3 font-display font-medium">رقم القطعة</th>
              <th className="p-3 font-display font-medium">الاسم</th>
              <th className="p-3 font-display font-medium">سعر البيع</th>
              <th className="p-3 font-display font-medium">التكلفة</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={4} className="p-4 text-center text-slate-500">جاري التحميل...</td></tr>
            ) : products.length === 0 ? (
              <tr><td colSpan={4} className="p-4 text-center text-slate-500">لا توجد أصناف بعد</td></tr>
            ) : (
              products.map((p) => (
                <tr key={p.id} className="border-t border-border-soft">
                  <td className="p-3 font-mono-data">{p.part_number}</td>
                  <td className="p-3">{p.name}</td>
                  <td className="p-3 font-mono-data">{p.sale_price}</td>
                  <td className="p-3 font-mono-data">{p.cost_price}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
