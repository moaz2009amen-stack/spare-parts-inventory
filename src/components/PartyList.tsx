import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import type { Database } from '../lib/database.types'

type TableName = 'customers' | 'suppliers'
type Party = Database['public']['Tables']['customers']['Row']

interface PartyListProps {
  tableName: TableName
  title: string
  balanceLabel: string
}

export default function PartyList({ tableName, title, balanceLabel }: PartyListProps) {
  const [items, setItems] = useState<Party[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState({
    name: '',
    phone: '',
    address: '',
  })

  const loadItems = async () => {
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .order('created_at', { ascending: false })

    if (error) setError(error.message)
    else setItems(data ?? [])
    setLoading(false)
  }

  useEffect(() => {
    let cancelled = false
    setLoading(true)

    supabase
      .from(tableName)
      .select('*')
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (cancelled) return
        if (error) setError(error.message)
        else setItems(data ?? [])
        setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [tableName])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSaving(true)

    const { error } = await supabase.from(tableName).insert({
      name: form.name,
      phone: form.phone || null,
      address: form.address || null,
    })

    if (error) {
      setError(error.message)
    } else {
      setForm({ name: '', phone: '', address: '' })
      setLoading(true)
      await loadItems()
    }
    setSaving(false)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('حذف هذا السجل؟')) return
    const { error } = await supabase.from(tableName).delete().eq('id', id)
    if (error) setError(error.message)
    else setItems((prev) => prev.filter((i) => i.id !== id))
  }

  const balanceColor = (balance: number) => {
    if (balance > 0) return 'text-red-600'
    if (balance < 0) return 'text-emerald-600'
    return 'text-slate-500'
  }

  return (
    <div className="page-enter p-6 max-w-4xl mx-auto">
      <h1 className="font-display text-2xl font-bold text-navy-900 mb-6">{title}</h1>

      <form onSubmit={handleSubmit} className="card p-6 mb-8 grid grid-cols-2 gap-4">
        <input
          name="name"
          value={form.name}
          onChange={handleChange}
          placeholder="الاسم"
          required
          className="border border-border-soft rounded-lg px-3 py-2 col-span-2 focus:outline-none focus:ring-2 focus:ring-accent transition-shadow"
        />
        <input
          name="phone"
          value={form.phone}
          onChange={handleChange}
          placeholder="رقم الهاتف"
          className="border border-border-soft rounded-lg px-3 py-2 font-mono-data focus:outline-none focus:ring-2 focus:ring-accent transition-shadow"
        />
        <input
          name="address"
          value={form.address}
          onChange={handleChange}
          placeholder="العنوان (اختياري)"
          className="border border-border-soft rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent transition-shadow"
        />

        {error && <p className="text-red-600 text-sm col-span-2">{error}</p>}

        <button
          type="submit"
          disabled={saving}
          className="col-span-2 flex items-center justify-center gap-2 bg-accent text-white rounded-lg py-2.5 font-medium hover:bg-accent-dark active:scale-[0.98] transition-all disabled:opacity-70"
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
                <th className="p-3 font-display font-medium whitespace-nowrap">{balanceLabel}</th>
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
                    <td className="p-3 text-left">
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="text-sm text-red-600 hover:underline"
                      >
                        حذف
                      </button>
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
