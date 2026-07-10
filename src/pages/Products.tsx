import { useEffect, useState } from 'react'
import { ChevronDown, ChevronUp, Loader2, BarChart3 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { loadDraft, saveDraft, clearDraft } from '../lib/draft'
import Select from '../components/Select'
import type { Database } from '../lib/database.types'
import ProductUnitsPanel from '../components/ProductUnitsPanel'

type Product = Database['public']['Tables']['products']['Row']
type Category = Database['public']['Tables']['categories']['Row']

interface ProductForm {
  part_number: string
  barcode: string
  name: string
  category_id: string
  base_unit: string
  cost_price: string
  sale_price: string
  min_stock_alert: string
}

const DRAFT_KEY = 'new-product'
const emptyForm: ProductForm = {
  part_number: '', barcode: '', name: '', category_id: '',
  base_unit: 'قطعة', cost_price: '', sale_price: '', min_stock_alert: '',
}

export default function Products() {
  const navigate = useNavigate()
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const [form, setForm] = useState<ProductForm>(() => loadDraft(DRAFT_KEY, emptyForm))

  useEffect(() => {
    saveDraft(DRAFT_KEY, form)
  }, [form])

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

    Promise.all([
      supabase.from('products').select('*').order('created_at', { ascending: false }),
      supabase.from('categories').select('*').order('name', { ascending: true }),
    ]).then(([productsRes, categoriesRes]) => {
      if (cancelled) return
      if (productsRes.error) setError(productsRes.error.message)
      else setProducts(productsRes.data ?? [])
      if (categoriesRes.data) setCategories(categoriesRes.data)
      setLoading(false)
    })

    return () => { cancelled = true }
  }, [])

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
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
      category_id: form.category_id || null,
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
      setForm(emptyForm)
      clearDraft(DRAFT_KEY)
      setLoading(true)
      await loadProducts()
    }
    setSaving(false)
  }

  const categoryName = (id: string | null) =>
    categories.find((c) => c.id === id)?.name ?? '-'

  return (
    <div className="page-enter p-4 md:p-6 max-w-5xl mx-auto">
      <h1 className="font-display text-xl md:text-2xl font-bold text-navy-900 mb-5 md:mb-6">إدارة الأصناف</h1>

      <form
        onSubmit={handleSubmit}
        className="card p-5 md:p-6 mb-6 md:mb-8 grid grid-cols-1 sm:grid-cols-2 gap-4"
      >
        <input
          name="part_number"
          value={form.part_number}
          onChange={handleChange}
          placeholder="رقم القطعة"
          required
          className="border border-border-soft rounded-xl px-3 py-2.5 font-mono-data focus:outline-none focus:ring-2 focus:ring-accent transition-shadow"
        />
        <input
          name="barcode"
          value={form.barcode}
          onChange={handleChange}
          placeholder="الباركود (اختياري)"
          className="border border-border-soft rounded-xl px-3 py-2.5 font-mono-data focus:outline-none focus:ring-2 focus:ring-accent transition-shadow"
        />
        <input
          name="name"
          value={form.name}
          onChange={handleChange}
          placeholder="اسم الصنف"
          required
          className="border border-border-soft rounded-xl px-3 py-2.5 sm:col-span-2 focus:outline-none focus:ring-2 focus:ring-accent transition-shadow"
        />
        <div className="sm:col-span-2">
          <Select name="category_id" value={form.category_id} onChange={handleChange}>
            <option value="">بدون تصنيف</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </Select>
        </div>
        <input
          name="cost_price"
          value={form.cost_price}
          onChange={handleChange}
          placeholder="سعر التكلفة"
          type="number"
          step="0.01"
          className="border border-border-soft rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-accent transition-shadow"
        />
        <input
          name="sale_price"
          value={form.sale_price}
          onChange={handleChange}
          placeholder="سعر البيع"
          type="number"
          step="0.01"
          className="border border-border-soft rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-accent transition-shadow"
        />
        <input
          name="min_stock_alert"
          value={form.min_stock_alert}
          onChange={handleChange}
          placeholder="حد التنبيه الأدنى"
          type="number"
          className="border border-border-soft rounded-xl px-3 py-2.5 sm:col-span-2 focus:outline-none focus:ring-2 focus:ring-accent transition-shadow"
        />

        {error && <p className="text-red-600 text-sm sm:col-span-2">{error}</p>}

        <button
          type="submit"
          disabled={saving}
          className="btn-primary sm:col-span-2 flex items-center justify-center gap-2 text-white rounded-xl py-2.5 font-medium transition-all disabled:opacity-70"
        >
          {saving && <Loader2 size={16} className="animate-spin" />}
          {saving ? 'جاري الحفظ...' : 'إضافة الصنف'}
        </button>
      </form>

      <div className="card overflow-hidden">
        <div className="table-scroll">
          <table className="w-full text-right">
            <thead className="bg-navy-900 text-white text-sm">
              <tr>
                <th className="p-3 font-display font-medium whitespace-nowrap">رقم القطعة</th>
                <th className="p-3 font-display font-medium whitespace-nowrap">الاسم</th>
                <th className="p-3 font-display font-medium whitespace-nowrap">التصنيف</th>
                <th className="p-3 font-display font-medium whitespace-nowrap">سعر البيع</th>
                <th className="p-3 font-display font-medium whitespace-nowrap">التكلفة</th>
                <th className="p-3"></th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-6 text-center text-slate-500">
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 size={16} className="animate-spin" />
                      جاري التحميل...
                    </div>
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr><td colSpan={7} className="p-6 text-center text-slate-500">لا توجد أصناف بعد</td></tr>
              ) : (
                products.map((p) => (
                  <>
                    <tr
                      key={p.id}
                      className="border-t border-border-soft hover:bg-surface transition-colors"
                    >
                      <td className="p-3 font-mono-data whitespace-nowrap">{p.part_number}</td>
                      <td className="p-3 whitespace-nowrap">{p.name}</td>
                      <td className="p-3 whitespace-nowrap">{categoryName(p.category_id)}</td>
                      <td className="p-3 font-mono-data whitespace-nowrap">{p.sale_price}</td>
                      <td className="p-3 font-mono-data whitespace-nowrap">{p.cost_price}</td>
                      <td className="p-3 text-left whitespace-nowrap">
                        <button
                          onClick={() => navigate(`/reports/product/${p.id}`)}
                          className="flex items-center gap-1 text-sm text-navy-700 hover:text-navy-900"
                        >
                          <BarChart3 size={14} />
                          تقرير
                        </button>
                      </td>
                      <td className="p-3 text-left">
                        <button
                          onClick={() => setExpandedId(expandedId === p.id ? null : p.id)}
                          className="flex items-center gap-1 text-sm text-accent-dark hover:text-accent transition-colors"
                        >
                          الوحدات
                          {expandedId === p.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </button>
                      </td>
                    </tr>
                    {expandedId === p.id && (
                      <tr>
                        <td colSpan={7} className="p-0">
                          <div className="panel-enter">
                            <ProductUnitsPanel productId={p.id} />
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
