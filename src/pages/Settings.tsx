import { useEffect, useState } from 'react'
import { Loader2, Upload, Save } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'

interface CompanySettings {
  company_name: string
  phone: string
  logo_data_url: string | null
  invoice_footer_message: string
  next_sales_invoice_number: number
  next_order_number: number
}

export default function Settings() {
  const [settings, setSettings] = useState<CompanySettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [numberingSaving, setNumberingSaving] = useState(false)
  const [nextSalesNumber, setNextSalesNumber] = useState('')
  const [nextOrderNumber, setNextOrderNumber] = useState('')

  useEffect(() => {
    let cancelled = false
    supabase
      .from('company_settings')
      .select('*')
      .eq('id', true)
      .single()
      .then(({ data }) => {
        if (cancelled) return
        if (data) {
          setSettings(data)
          setNextSalesNumber(String(data.next_sales_invoice_number))
          setNextOrderNumber(String(data.next_order_number))
        }
        setLoading(false)
      })
    return () => { cancelled = true }
  }, [])

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !settings) return

    const reader = new FileReader()
    reader.onload = () => {
      setSettings({ ...settings, logo_data_url: reader.result as string })
    }
    reader.readAsDataURL(file)
  }

  const handleSave = async () => {
    if (!settings) return
    setError('')
    setSuccess('')
    setSaving(true)

    const { error } = await supabase
      .from('company_settings')
      .update({
        company_name: settings.company_name,
        phone: settings.phone,
        logo_data_url: settings.logo_data_url,
        invoice_footer_message: settings.invoice_footer_message,
      })
      .eq('id', true)

    if (error) setError(error.message)
    else setSuccess('تم حفظ بيانات الشركة بنجاح')
    setSaving(false)
  }

  const handleNumberingSave = async () => {
    setError('')
    setSuccess('')
    setNumberingSaving(true)

    const { error } = await supabase.rpc('set_invoice_numbering', {
      p_next_sales_number: Number(nextSalesNumber) || null,
      p_next_order_number: Number(nextOrderNumber) || null,
    })

    if (error) setError(error.message)
    else setSuccess('تم تحديث ترقيم الفواتير')
    setNumberingSaving(false)
  }

  if (loading || !settings) {
    return (
      <div className="p-8 flex items-center gap-2 text-slate-500">
        <Loader2 size={16} className="animate-spin" />
        جاري التحميل...
      </div>
    )
  }

  return (
    <div className="page-enter p-4 md:p-6 max-w-2xl mx-auto">
      <h1 className="font-display text-xl md:text-2xl font-bold text-navy-900 mb-5 md:mb-6">الإعدادات</h1>

      {error && <p className="text-red-600 text-sm mb-4">{error}</p>}
      {success && <p className="text-emerald-600 text-sm mb-4">{success}</p>}

      <div className="card p-5 md:p-6 mb-6">
        <p className="font-display font-bold text-navy-900 mb-4">بيانات الشركة (تظهر داخل الفاتورة)</p>

        <div className="flex items-center gap-4 mb-4">
          {settings.logo_data_url ? (
            <img src={settings.logo_data_url} alt="الشعار" className="w-16 h-16 object-contain rounded-lg border border-border-soft" />
          ) : (
            <div className="w-16 h-16 rounded-lg border border-dashed border-border-soft flex items-center justify-center text-slate-400 text-xs">
              بدون شعار
            </div>
          )}
          <label className="flex items-center gap-2 text-sm text-accent-dark cursor-pointer hover:underline">
            <Upload size={16} />
            رفع شعار جديد
            <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
          </label>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <input
            value={settings.company_name}
            onChange={(e) => setSettings({ ...settings, company_name: e.target.value })}
            placeholder="اسم الشركة"
            className="border border-border-soft rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-accent"
          />
          <input
            value={settings.phone ?? ''}
            onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
            placeholder="رقم التواصل"
            className="border border-border-soft rounded-xl px-3 py-2.5 font-mono-data focus:outline-none focus:ring-2 focus:ring-accent"
          />
        </div>

        <textarea
          value={settings.invoice_footer_message ?? ''}
          onChange={(e) => setSettings({ ...settings, invoice_footer_message: e.target.value })}
          placeholder="رسالة ثابتة تظهر أسفل كل فاتورة (اختياري)، مثلاً: شكرًا لتعاملكم معنا"
          rows={2}
          className="w-full border border-border-soft rounded-xl px-3 py-2.5 mb-4 focus:outline-none focus:ring-2 focus:ring-accent"
        />

        <button
          onClick={handleSave}
          disabled={saving}
          className="btn-primary flex items-center justify-center gap-2 text-white rounded-xl px-5 py-2.5 font-medium transition-all disabled:opacity-70"
        >
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          حفظ بيانات الشركة
        </button>
      </div>

      <div className="card p-5 md:p-6">
        <p className="font-display font-bold text-navy-900 mb-1">ترقيم الفواتير</p>
        <p className="text-xs text-slate-500 mb-4">
          الرقم اللي هتحطه هنا هيكون رقم **أول فاتورة جاية** بس (مش هيغيّر أرقام الفواتير القديمة).
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-xs text-slate-500 mb-1">رقم أول فاتورة بيع جاية</label>
            <input
              type="number"
              value={nextSalesNumber}
              onChange={(e) => setNextSalesNumber(e.target.value)}
              className="w-full border border-border-soft rounded-xl px-3 py-2.5 font-mono-data focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">رقم أول طلبية جاية</label>
            <input
              type="number"
              value={nextOrderNumber}
              onChange={(e) => setNextOrderNumber(e.target.value)}
              className="w-full border border-border-soft rounded-xl px-3 py-2.5 font-mono-data focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>
        </div>
        <button
          onClick={handleNumberingSave}
          disabled={numberingSaving}
          className="flex items-center justify-center gap-2 bg-navy-900 text-white rounded-xl px-5 py-2.5 font-medium hover:bg-navy-800 transition-colors disabled:opacity-70"
        >
          {numberingSaving && <Loader2 size={16} className="animate-spin" />}
          تحديث الترقيم
        </button>
      </div>
    </div>
  )
}
