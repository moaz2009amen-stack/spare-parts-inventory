import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { loadDraft, saveDraft, clearDraft } from '../lib/draft'
import type { Database } from '../lib/database.types'

type Category = Database['public']['Tables']['categories']['Row']

const DRAFT_KEY = 'new-category'

export default function Categories() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [name, setName] = useState(() => loadDraft(DRAFT_KEY, ''))

  useEffect(() => {
    saveDraft(DRAFT_KEY, name)
  }, [name])

  const loadCategories = async () => {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('name', { ascending: true })

    if (error) setError(error.message)
    else setCategories(data ?? [])
    setLoading(false)
  }

  useEffect(() => {
    let cancelled = false

    supabase
      .from('categories')
      .select('*')
      .order('name', { ascending: true })
      .then(({ data, error }) => {
        if (cancelled) return
        if (error) setError(error.message)
        else setCategories(data ?? [])
        setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSaving(true)

    const { error } = await supabase.from('categories').insert({ name })

    if (error) {
      setError(error.message)
    } else {
      setName('')
      clearDraft(DRAFT_KEY)
      setLoading(true)
      await loadCategories()
    }
    setSaving(false)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('حذف هذا التصنيف؟')) return
    const { error } = await supabase.from('categories').delete().eq('id', id)
    if (error) setError(error.message)
    else setCategories((prev) => prev.filter((c) => c.id !== id))
  }

  return (
    <div className="page-enter p-4 md:p-6 max-w-2xl mx-auto">
      <h1 className="font-display text-xl md:text-2xl font-bold text-navy-900 mb-5 md:mb-6">التصنيفات</h1>

      <form onSubmit={handleSubmit} className="card p-5 md:p-6 mb-6 md:mb-8 flex flex-col sm:flex-row gap-3">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="اسم التصنيف (مثلاً: فلاتر، إطارات، بواجي)"
          required
          className="flex-1 border border-border-soft rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-accent transition-shadow"
        />
        <button
          type="submit"
          disabled={saving}
          className="btn-primary flex items-center justify-center gap-2 text-white rounded-xl px-5 py-2.5 sm:py-0 font-medium transition-all disabled:opacity-70"
        >
          {saving && <Loader2 size={16} className="animate-spin" />}
          {saving ? 'جاري الإضافة...' : 'إضافة'}
        </button>
      </form>

      {error && <p className="text-red-600 text-sm mb-4">{error}</p>}

      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center gap-2 p-6 text-slate-500">
            <Loader2 size={16} className="animate-spin" />
            جاري التحميل...
          </div>
        ) : categories.length === 0 ? (
          <p className="p-6 text-center text-slate-500">لا توجد تصنيفات بعد</p>
        ) : (
          <ul>
            {categories.map((c) => (
              <li
                key={c.id}
                className="flex items-center justify-between px-4 py-3 border-t border-border-soft first:border-t-0 hover:bg-surface transition-colors"
              >
                <span>{c.name}</span>
                <button
                  onClick={() => handleDelete(c.id)}
                  className="text-sm text-red-600 hover:underline"
                >
                  حذف
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
