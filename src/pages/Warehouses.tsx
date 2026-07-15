import { useEffect, useState } from 'react'
import { Loader2, Star, Pencil, Trash2, Check, X, BarChart3, FileSpreadsheet } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { exportWarehouseInventory } from '../lib/exportInventory'
import type { Database } from '../lib/database.types'

type Warehouse = Database['public']['Tables']['warehouses']['Row']

export default function Warehouses() {
  const navigate = useNavigate()
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [name, setName] = useState('')
  const [address, setAddress] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editAddress, setEditAddress] = useState('')
  const [exportingId, setExportingId] = useState<string | null>(null)

  const loadWarehouses = async () => {
    const { data, error } = await supabase.from('warehouses').select('*').order('created_at')
    if (error) setError(error.message)
    else setWarehouses(data ?? [])
    setLoading(false)
  }

  useEffect(() => {
    let cancelled = false
    supabase.from('warehouses').select('*').order('created_at').then(({ data, error }) => {
      if (cancelled) return
      if (error) setError(error.message)
      else setWarehouses(data ?? [])
      setLoading(false)
    })
    return () => { cancelled = true }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSaving(true)

    const { error } = await supabase.from('warehouses').insert({
      name,
      address: address || null,
    })

    if (error) {
      setError(error.message)
    } else {
      setName('')
      setAddress('')
      setLoading(true)
      await loadWarehouses()
    }
    setSaving(false)
  }

  const startEdit = (w: Warehouse) => {
    setEditingId(w.id)
    setEditName(w.name)
    setEditAddress(w.address ?? '')
  }

  const saveEdit = async (id: string) => {
    const { error } = await supabase
      .from('warehouses')
      .update({ name: editName, address: editAddress || null })
      .eq('id', id)

    if (error) {
      setError(error.message)
    } else {
      setEditingId(null)
      await loadWarehouses()
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('حذف هذا المخزن؟ لن يمكن التراجع، وأي مخزون مسجّل عليه هيتأثر.')) return
    const { error } = await supabase.from('warehouses').delete().eq('id', id)
    if (error) setError(error.message)
    else await loadWarehouses()
  }

  const handleSetDefault = async (id: string) => {
    const { error } = await supabase.rpc('set_default_warehouse', { p_warehouse_id: id })
    if (error) setError(error.message)
    else await loadWarehouses()
  }

  const handleExport = async (w: Warehouse) => {
    setExportingId(w.id)
    try {
      await exportWarehouseInventory(w.id, w.name)
    } finally {
      setExportingId(null)
    }
  }

  return (
    <div className="page-enter p-4 md:p-6 max-w-3xl mx-auto">
      <h1 className="font-display text-xl md:text-2xl font-bold text-navy-900 mb-5 md:mb-6">المخازن</h1>

      <form onSubmit={handleSubmit} className="card p-5 md:p-6 mb-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="اسم المخزن"
          required
          className="border border-border-soft rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-accent transition-shadow"
        />
        <input
          value={address}
          onChange={(e) => setAddress(e.target.value)}
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
          {saving ? 'جاري الإضافة...' : 'إضافة مخزن'}
        </button>
      </form>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center gap-2 p-6 text-slate-500">
            <Loader2 size={16} className="animate-spin" />
            جاري التحميل...
          </div>
        ) : warehouses.length === 0 ? (
          <p className="p-6 text-center text-slate-500">لا توجد مخازن بعد</p>
        ) : (
          <ul>
            {warehouses.map((w) => (
              <li key={w.id} className="border-t border-border-soft first:border-t-0 px-4 py-3">
                {editingId === w.id ? (
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="flex-1 border border-border-soft rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                    />
                    <input
                      value={editAddress}
                      onChange={(e) => setEditAddress(e.target.value)}
                      placeholder="العنوان"
                      className="flex-1 border border-border-soft rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                    />
                    <div className="flex gap-2 justify-end">
                      <button onClick={() => saveEdit(w.id)} className="text-emerald-600"><Check size={18} /></button>
                      <button onClick={() => setEditingId(null)} className="text-slate-400"><X size={18} /></button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      {w.is_default && (
                        <span title="المخزن الافتراضي">
                          <Star size={16} className="text-accent fill-accent shrink-0" />
                        </span>
                      )}
                      <div className="min-w-0">
                        <p className="font-medium text-navy-900 truncate">{w.name}</p>
                        {w.address && <p className="text-xs text-slate-500 truncate">{w.address}</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <button
                        onClick={() => navigate(`/reports/warehouse/${w.id}`)}
                        className="text-navy-700 hover:text-navy-900"
                        title="تقرير المخزن"
                      >
                        <BarChart3 size={15} />
                      </button>
                      <button
                        onClick={() => handleExport(w)}
                        disabled={exportingId === w.id}
                        className="text-emerald-600 hover:text-emerald-700 disabled:opacity-50"
                        title="تصدير مخزون هذا المخزن (Excel)"
                      >
                        {exportingId === w.id ? (
                          <Loader2 size={15} className="animate-spin" />
                        ) : (
                          <FileSpreadsheet size={15} />
                        )}
                      </button>
                      {!w.is_default && (
                        <button
                          onClick={() => handleSetDefault(w.id)}
                          className="text-xs text-accent-dark hover:underline"
                        >
                          تحديد كافتراضي
                        </button>
                      )}
                      <button onClick={() => startEdit(w)} className="text-slate-500 hover:text-navy-900">
                        <Pencil size={15} />
                      </button>
                      <button onClick={() => handleDelete(w.id)} className="text-red-600 hover:text-red-700">
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
