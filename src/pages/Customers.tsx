import { useEffect, useState } from 'react'
import { Loader2, FileText } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { loadDraft, saveDraft, clearDraft } from '../lib/draft'
import type { Database } from '../lib/database.types'

type Customer = Database['public']['Tables']['customers']['Row']

interface CustomerForm {
  name: string
  phone: string
  address: string
}

const DRAFT_KEY = 'new-customer'
const emptyForm: CustomerForm = { name: '', phone: '', address: '' }

export default function Customers() {
  const navigate = useNavigate()

  const [items, setItems] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<CustomerForm>(() => loadDraft(DRAFT_KEY, emptyForm))

  useEffect(() => {
    saveDraft(DRAFT_KEY, form)
  }, [form])

  const loadItems = async () => {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) setError(error.message)
    else setItems(data ?? [])
    setLoading(false)
  }

  useEffect(() => {
    let cancelled = false
    supabase
      .from('customers')
      .select('*')
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (cancelled) return
        if (error) setError(error.message)
        else setItems(data ?? [])
        setLoading(false)
      })
    return () => { cancelled = true }
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSaving(true)

    const { error } = await supabase.from('customers').insert({
      name: form.name,
      phone: form.phone || null,
      address: form.address || null,
    })

    if (error) {
      setError(error.message)
    } else {
      setForm(emptyForm)
      clearDraft(DRAFT_KEY)
      setLoading(true)
      await loadItems()
    }
    setSaving(false)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('حذف هذا العميل؟')) return
    const { error } = await supabase.from('customers').delete().eq('id', id)
    if (error) setError(error.message)
    else setItems((prev) => prev.filter((i) => i.id !== id))
  }

  const balanceColor = (balance: number) => {
    if (balance > 0) return 'text-red-600'
    if (balance < 0) return 'text-emerald-600'
    return 'text-slate-500'
  }

  return (
    <div className="page-enter p-4 md:p-6 max-w-4xl mx-auto">
      <h1 className="font-display text-xl md:text-2xl font-bold text-navy-900 mb-5 md:mb-6">العملاء</h1>

      <form onSubmit={handleSubmit} className="card p-5 md:p-6 mb-6 md:mb-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <input
          name="name"
          value={form.name}
          onChange={handleChange}
          placeholder="الاسم"
          required
          className="border border-border-soft rounded-xl px-3 py-2.5 sm:col-span-2 focus:outline-none focus:ring-2 focus:ring-accent transition-shadow"
        />
        <input
          name="phone"
          value={form.phone}
          onChange={handleChange}
          placeholder="رقم الهاتف"
          className="border border-border-soft rounded-xl px-3 py-2.5 font-mono-data focus:outline-none focus:ring-2 focus:ring-accent transition-shadow"
        />
        <input
          name="address"
          value={form.address}
          onChange={handleChange}
          placeholder="العنوان (اختياري)"
          className="border border-border-soft rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-accent transition-shadow"
        />

        {error && <p className="text-red-600 text-sm sm:col-span-2">{error}</p>}

        <button
          type="submit"
          disabled={saving}
          className="btn-primary sm:col-span-2 flex items-center justify-center gap-2 text-white rounded-xl py-2.5 font-medium transition-all disabled:opacity-70"
        >
          {saving && <Loader2 size={16} className="animate-spin" />}
          {saving ? 'جاري الحفظ...' : 'إضافة'}
        </button>
      </form>

      <div className="card overflow-hidden">
        <div className="table-scroll">
          <table className="w-full text-right">
            <thead className="bg-navy-900 text-white text-sm">
              <tr>
                <th className="p-3 font-display font-medium whitespace-nowrap">الاسم</th>
                <th className="p-3 font-display font-medium whitespace-nowrap">الهاتف</th>
                <th className="p-3 font-display font-medium whitespace-nowrap">العنوان</th>
                <th className="p-3 font-display font-medium whitespace-nowrap">الرصيد (مديون به)</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-slate-500">
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 size={16} className="animate-spin" />
                      جاري التحميل...
                    </div>
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={5} className="p-6 text-center text-slate-500">لا توجد سجلات بعد</td></tr>
              ) : (
                items.map((item) => (
                  <tr key={item.id} className="border-t border-border-soft hover:bg-surface transition-colors">
                    <td className="p-3 whitespace-nowrap">{item.name}</td>
                    <td className="p-3 font-mono-data whitespace-nowrap">{item.phone ?? '-'}</td>
                    <td className="p-3 whitespace-nowrap">{item.address ?? '-'}</td>
                    <td className={`p-3 font-mono-data whitespace-nowrap font-medium ${balanceColor(item.balance)}`}>
                      {item.balance}
                    </td>
                    <td className="p-3 text-left whitespace-nowrap">
                      <div className="flex items-center justify-end gap-3">
                        <button
                          onClick={() => navigate(`/statement/${item.id}`)}
                          className="flex items-center gap-1 text-sm text-accent-dark hover:underline"
                        >
                          <FileText size={14} />
                          كشف حساب
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="text-sm text-red-600 hover:underline"
                        >
                          حذف
                        </button>
                      </div>
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
