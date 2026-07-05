import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import type { Database } from '../lib/database.types'

type ProductUnit = Database['public']['Tables']['product_units']['Row']

export default function ProductUnitsPanel({ productId }: { productId: string }) {
  const [units, setUnits] = useState<ProductUnit[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState({
    unit_name: '',
    conversion_factor: '',
    barcode: '',
  })

  const loadUnits = async () => {
    const { data, error } = await supabase
      .from('product_units')
      .select('*')
      .eq('product_id', productId)
      .order('conversion_factor', { ascending: true })

    if (error) setError(error.message)
    else setUnits(data ?? [])
    setLoading(false)
  }

  useEffect(() => {
    let cancelled = false

    supabase
      .from('product_units')
      .select('*')
      .eq('product_id', productId)
      .order('conversion_factor', { ascending: true })
      .then(({ data, error }) => {
        if (cancelled) return
        if (error) setError(error.message)
        else setUnits(data ?? [])
        setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [productId])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSaving(true)

    const { error } = await supabase.from('product_units').insert({
      product_id: productId,
      unit_name: form.unit_name,
      conversion_factor: Number(form.conversion_factor),
      barcode: form.barcode || null,
    })

    if (error) {
      setError(
        error.code === '23505'
          ? 'اسم الوحدة ده موجود بالفعل لنفس الصنف'
          : error.message
      )
    } else {
      setForm({ unit_name: '', conversion_factor: '', barcode: '' })
      setLoading(true)
      await loadUnits()
    }
    setSaving(false)
  }

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('product_units').delete().eq('id', id)
    if (error) setError(error.message)
    else setUnits((prev) => prev.filter((u) => u.id !== id))
  }

  return (
    <div className="bg-surface border-t-2 border-accent/30 p-4 pr-8">
      <p className="text-xs text-slate-500 mb-3">
        الوحدة الأساسية دايمًا "قطعة". هنا تضيف وحدات إضافية زي علبة أو كرتونة، وتحدد كام قطعة أساسية بتساوي.
      </p>

      <form onSubmit={handleSubmit} className="flex flex-wrap gap-2 mb-3">
        <input
          name="unit_name"
          value={form.unit_name}
          onChange={handleChange}
          placeholder="اسم الوحدة (علبة)"
          required
          className="flex-1 min-w-30 border border-border-soft rounded-lg px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-accent transition-shadow"
        />
        <input
          name="conversion_factor"
          value={form.conversion_factor}
          onChange={handleChange}
          placeholder="عدد القطع"
          type="number"
          step="0.01"
          required
          className="w-28 border border-border-soft rounded-lg px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-accent transition-shadow"
        />
        <input
          name="barcode"
          value={form.barcode}
          onChange={handleChange}
          placeholder="باركود الوحدة (اختياري)"
          className="flex-1 min-w-35 border border-border-soft rounded-lg px-2 py-1.5 text-sm font-mono-data bg-white focus:outline-none focus:ring-2 focus:ring-accent transition-shadow"
        />
        <button
          type="submit"
          disabled={saving}
          className="flex items-center gap-1.5 bg-accent text-white rounded-lg px-4 text-sm font-medium hover:bg-accent-dark active:scale-[0.98] transition-all disabled:opacity-70"
        >
          {saving && <Loader2 size={14} className="animate-spin" />}
          إضافة
        </button>
      </form>

      {error && <p className="text-red-600 text-xs mb-2">{error}</p>}

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Loader2 size={14} className="animate-spin" />
          جاري التحميل...
        </div>
      ) : units.length === 0 ? (
        <p className="text-sm text-slate-500">لا توجد وحدات إضافية بعد.</p>
      ) : (
        <table className="w-full text-sm bg-white rounded-lg overflow-hidden border border-border-soft">
          <tbody>
            {units.map((u) => (
              <tr key={u.id} className="border-t border-border-soft first:border-t-0 hover:bg-surface transition-colors">
                <td className="py-2 px-3">{u.unit_name}</td>
                <td className="py-2 px-3 font-mono-data">{u.conversion_factor} قطعة</td>
                <td className="py-2 px-3 font-mono-data text-slate-500">{u.barcode ?? '-'}</td>
                <td className="py-2 px-3 text-left">
                  <button
                    onClick={() => handleDelete(u.id)}
                    className="text-red-600 hover:underline"
                  >
                    حذف
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
