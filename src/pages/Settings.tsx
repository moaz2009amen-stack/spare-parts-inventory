import { useEffect, useState } from 'react'
import { Loader2, Upload, Save, Download, Database, Info, User, Bell } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/useAuth'

interface CompanySettings {
  company_name: string
  phone: string
  logo_data_url: string | null
  invoice_footer_message: string
  next_sales_invoice_number: number
  next_order_number: number
  notify_low_stock: boolean
  notify_debts: boolean
}

type SettingsTab = 'company' | 'account' | 'notifications' | 'backup' | 'system'

const tabLabels: Record<SettingsTab, string> = {
  company: 'بيانات الشركة', account: 'الحساب', notifications: 'الإشعارات',
  backup: 'النسخ الاحتياطي', system: 'معلومات النظام',
}

const BACKUP_TABLES = [
  'company_settings', 'warehouses', 'categories', 'products', 'product_units',
  'customers', 'inventory', 'orders', 'order_items',
  'sales_invoices', 'sales_invoice_items', 'sales_returns', 'sales_return_items',
  'order_returns', 'order_return_items', 'stocktakes', 'stocktake_items',
  'payments', 'treasury_transactions',
] as const

export default function Settings() {
  const { profile } = useAuth()
  const [tab, setTab] = useState<SettingsTab>('company')

  const [settings, setSettings] = useState<CompanySettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [nextSalesNumber, setNextSalesNumber] = useState('')
  const [nextOrderNumber, setNextOrderNumber] = useState('')

  // حساب
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [newPassword, setNewPassword] = useState('')

  // نسخ احتياطي
  const [backupBusy, setBackupBusy] = useState(false)
  const [restoreLog, setRestoreLog] = useState<string[]>([])

  useEffect(() => {
    let cancelled = false
    supabase.from('company_settings').select('*').eq('id', true).single().then(({ data: s }) => {
      if (cancelled) return
      if (s) {
        setSettings(s)
        setNextSalesNumber(String(s.next_sales_invoice_number))
        setNextOrderNumber(String(s.next_order_number))
      }
      setLoading(false)
    })
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name)
    }
  }, [profile])

  useEffect(() => {
    let cancelled = false
    supabase.auth.getUser().then(async ({ data }) => {
      if (cancelled || !data.user) return
      const { data: row } = await supabase.from('users').select('phone').eq('id', data.user.id).single()
      if (!cancelled && row) setPhone(row.phone ?? '')
    })
    return () => { cancelled = true }
  }, [])

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !settings) return
    const reader = new FileReader()
    reader.onload = () => setSettings({ ...settings, logo_data_url: reader.result as string })
    reader.readAsDataURL(file)
  }

  const handleSaveCompany = async () => {
    if (!settings) return
    setError(''); setSuccess(''); setSaving(true)
    const { error } = await supabase.from('company_settings').update({
      company_name: settings.company_name,
      phone: settings.phone,
      logo_data_url: settings.logo_data_url,
      invoice_footer_message: settings.invoice_footer_message,
    }).eq('id', true)
    if (error) setError(error.message)
    else setSuccess('تم حفظ بيانات الشركة')
    setSaving(false)
  }

  const handleNumberingSave = async () => {
    setError(''); setSuccess(''); setSaving(true)
    const { error } = await supabase.rpc('set_invoice_numbering', {
      p_next_sales_number: Number(nextSalesNumber) || null,
      p_next_order_number: Number(nextOrderNumber) || null,
    })
    if (error) setError(error.message)
    else setSuccess('تم تحديث ترقيم الفواتير')
    setSaving(false)
  }

  const handleSaveAccount = async () => {
    setError(''); setSuccess(''); setSaving(true)
    const { data: userData } = await supabase.auth.getUser()
    if (!userData.user) { setSaving(false); return }

    const { error: profileError } = await supabase
      .from('users')
      .update({ full_name: fullName, phone: phone || null })
      .eq('id', userData.user.id)

    if (profileError) {
      setError(profileError.message)
      setSaving(false)
      return
    }

    if (newPassword) {
      const { error: pwError } = await supabase.auth.updateUser({ password: newPassword })
      if (pwError) {
        setError(pwError.message)
        setSaving(false)
        return
      }
      setNewPassword('')
    }

    setSuccess('تم حفظ بيانات الحساب')
    setSaving(false)
  }

  const handleToggle = async (key: 'notify_low_stock' | 'notify_debts') => {
    if (!settings) return
    const updated = { ...settings, [key]: !settings[key] }
    setSettings(updated)
    await supabase.from('company_settings').update({ [key]: updated[key] }).eq('id', true)
  }

  const handleBackup = async () => {
    setBackupBusy(true)
    const backup: Record<string, unknown> = {
      meta: { created_at: new Date().toISOString(), version: '1.0' },
    }
    for (const table of BACKUP_TABLES) {
      const { data } = await supabase.from(table).select('*')
      backup[table] = data ?? []
    }
    // بيانات المستخدمين للمرجعية فقط (بدون أي بيانات دخول حساسة)
    const { data: users } = await supabase.from('users').select('id, full_name, username, role, is_active')
    backup['users_reference'] = users ?? []

    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    const stamp = new Date().toISOString().replace(/[:.]/g, '-')
    a.href = url
    a.download = `نسخة-احتياطية-${stamp}.json`
    a.click()
    URL.revokeObjectURL(url)
    setBackupBusy(false)
  }

  const handleRestore = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!confirm('استعادة النسخة دي هتضيف/تحدّث البيانات فوق الموجود حاليًا في النظام، ومش هترجع فيها. متأكد؟')) {
      e.target.value = ''
      return
    }

    setBackupBusy(true)
    setRestoreLog([])
    const log: string[] = []

    try {
      const text = await file.text()
      const backup = JSON.parse(text)

      for (const table of BACKUP_TABLES) {
        const rows = backup[table]
        if (!Array.isArray(rows) || rows.length === 0) continue
        const { error } = await supabase.from(table).upsert(rows, { onConflict: 'id' })
        log.push(error ? `❌ ${table}: ${error.message}` : `✅ ${table}: ${rows.length} صف`)
      }
    } catch {
      log.push('❌ الملف غير صالح أو تالف')
    }

    setRestoreLog(log)
    setBackupBusy(false)
    e.target.value = ''
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

      <div className="flex flex-wrap gap-2 mb-6">
        {(Object.keys(tabLabels) as SettingsTab[]).map((t) => (
          <button
            key={t}
            onClick={() => { setTab(t); setError(''); setSuccess('') }}
            className={`px-3.5 py-2 rounded-xl text-sm font-medium transition-colors ${
              tab === t ? 'bg-navy-900 text-white' : 'bg-white border border-border-soft text-slate-600'
            }`}
          >
            {tabLabels[t]}
          </button>
        ))}
      </div>

      {error && <p className="text-red-600 text-sm mb-4">{error}</p>}
      {success && <p className="text-emerald-600 text-sm mb-4">{success}</p>}

      {tab === 'company' && (
        <>
          <div className="card p-5 md:p-6 mb-6">
            <p className="font-display font-bold text-navy-900 mb-4">بيانات الشركة (تظهر داخل الفاتورة)</p>
            <div className="flex items-center gap-4 mb-4">
              {settings.logo_data_url ? (
                <img src={settings.logo_data_url} alt="الشعار" className="w-16 h-16 object-contain rounded-lg border border-border-soft" />
              ) : (
                <div className="w-16 h-16 rounded-lg border border-dashed border-border-soft flex items-center justify-center text-slate-400 text-xs">بدون شعار</div>
              )}
              <label className="flex items-center gap-2 text-sm text-accent-dark cursor-pointer hover:underline">
                <Upload size={16} />رفع شعار جديد
                <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
              </label>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <input value={settings.company_name} onChange={(e) => setSettings({ ...settings, company_name: e.target.value })} placeholder="اسم الشركة" className="border border-border-soft rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-accent" />
              <input value={settings.phone ?? ''} onChange={(e) => setSettings({ ...settings, phone: e.target.value })} placeholder="رقم التواصل" className="border border-border-soft rounded-xl px-3 py-2.5 font-mono-data focus:outline-none focus:ring-2 focus:ring-accent" />
            </div>
            <textarea value={settings.invoice_footer_message ?? ''} onChange={(e) => setSettings({ ...settings, invoice_footer_message: e.target.value })} placeholder="رسالة ثابتة أسفل الفاتورة (اختياري)" rows={2} className="w-full border border-border-soft rounded-xl px-3 py-2.5 mb-4 focus:outline-none focus:ring-2 focus:ring-accent" />
            <button onClick={handleSaveCompany} disabled={saving} className="btn-primary flex items-center justify-center gap-2 text-white rounded-xl px-5 py-2.5 font-medium transition-all disabled:opacity-70">
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} حفظ بيانات الشركة
            </button>
          </div>

          <div className="card p-5 md:p-6">
            <p className="font-display font-bold text-navy-900 mb-1">ترقيم الفواتير</p>
            <p className="text-xs text-slate-500 mb-4">الرقم بتاعك هيكون رقم أول فاتورة/طلبية جاية بس.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-xs text-slate-500 mb-1">رقم أول فاتورة بيع جاية</label>
                <input type="number" value={nextSalesNumber} onChange={(e) => setNextSalesNumber(e.target.value)} className="w-full border border-border-soft rounded-xl px-3 py-2.5 font-mono-data focus:outline-none focus:ring-2 focus:ring-accent" />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">رقم أول طلبية جاية</label>
                <input type="number" value={nextOrderNumber} onChange={(e) => setNextOrderNumber(e.target.value)} className="w-full border border-border-soft rounded-xl px-3 py-2.5 font-mono-data focus:outline-none focus:ring-2 focus:ring-accent" />
              </div>
            </div>
            <button onClick={handleNumberingSave} disabled={saving} className="flex items-center justify-center gap-2 bg-navy-900 text-white rounded-xl px-5 py-2.5 font-medium hover:bg-navy-800 transition-colors disabled:opacity-70">
              {saving && <Loader2 size={16} className="animate-spin" />} تحديث الترقيم
            </button>
          </div>
        </>
      )}

      {tab === 'account' && (
        <div className="card p-5 md:p-6">
          <div className="flex items-center gap-2 mb-4">
            <User size={16} className="text-accent-dark" />
            <p className="font-display font-bold text-navy-900">بيانات الحساب</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-xs text-slate-500 mb-1">الاسم بالكامل</label>
              <input value={fullName} onChange={(e) => setFullName(e.target.value)} className="w-full border border-border-soft rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-accent" />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">رقم الهاتف</label>
              <input value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full border border-border-soft rounded-xl px-3 py-2.5 font-mono-data focus:outline-none focus:ring-2 focus:ring-accent" />
            </div>
          </div>
          <div className="mb-4">
            <label className="block text-xs text-slate-500 mb-1">كلمة مرور جديدة (اتركها فاضية لو مش عايز تغيّرها)</label>
            <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="w-full border border-border-soft rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-accent" />
          </div>
          <button onClick={handleSaveAccount} disabled={saving} className="btn-primary flex items-center justify-center gap-2 text-white rounded-xl px-5 py-2.5 font-medium transition-all disabled:opacity-70">
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} حفظ
          </button>
        </div>
      )}

      {tab === 'notifications' && (
        <div className="card p-5 md:p-6">
          <div className="flex items-center gap-2 mb-4">
            <Bell size={16} className="text-accent-dark" />
            <p className="font-display font-bold text-navy-900">تشغيل / إيقاف الإشعارات</p>
          </div>
          <div className="flex items-center justify-between py-3 border-b border-border-soft">
            <div>
              <p className="text-sm font-medium text-navy-900">إشعارات نقص المخزون</p>
              <p className="text-xs text-slate-500">تنبيه لما صنف يوصل لحد التنبيه الأدنى</p>
            </div>
            <button
              onClick={() => handleToggle('notify_low_stock')}
              className={`w-11 h-6 rounded-full transition-colors relative ${settings.notify_low_stock ? 'bg-accent' : 'bg-border-soft'}`}
            >
              <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform ${settings.notify_low_stock ? 'translate-x-0.5' : 'translate-x-5'}`} />
            </button>
          </div>
          <div className="flex items-center justify-between py-3">
            <div>
              <p className="text-sm font-medium text-navy-900">إشعارات الديون</p>
              <p className="text-xs text-slate-500">تنبيه لما عميل يتحول لمديون بعد ما كان رصيده صفر</p>
            </div>
            <button
              onClick={() => handleToggle('notify_debts')}
              className={`w-11 h-6 rounded-full transition-colors relative ${settings.notify_debts ? 'bg-accent' : 'bg-border-soft'}`}
            >
              <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform ${settings.notify_debts ? 'translate-x-0.5' : 'translate-x-5'}`} />
            </button>
          </div>
        </div>
      )}

      {tab === 'backup' && (
        <div className="space-y-6">
          <div className="card p-5 md:p-6">
            <div className="flex items-center gap-2 mb-3">
              <Database size={16} className="text-accent-dark" />
              <p className="font-display font-bold text-navy-900">إنشاء نسخة احتياطية</p>
            </div>
            <p className="text-sm text-slate-500 mb-4">
              بيجمّع كل بيانات النظام (المخازن، الأصناف، العملاء، الفواتير، الطلبيات،
              المرتجعات، الجرد...) في ملف JSON واحد وينزّله على جهازك.
            </p>
            <button onClick={handleBackup} disabled={backupBusy} className="btn-primary flex items-center justify-center gap-2 text-white rounded-xl px-5 py-2.5 font-medium transition-all disabled:opacity-70">
              {backupBusy ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />} إنشاء نسخة احتياطية
            </button>
          </div>

          <div className="card p-5 md:p-6">
            <p className="font-display font-bold text-navy-900 mb-3">استعادة نسخة احتياطية</p>
            <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2 mb-4">
              تحذير: الاستعادة بتضيف/تحدّث البيانات فوق الموجود حاليًا، ومفيش تراجع
              بعدها. جرّبها على نسخة تجريبية الأول لو مش متأكد.
            </p>
            <label className="inline-flex items-center gap-2 bg-navy-900 text-white rounded-xl px-5 py-2.5 text-sm font-medium hover:bg-navy-800 transition-colors cursor-pointer">
              {backupBusy && <Loader2 size={16} className="animate-spin" />}
              اختيار ملف واستعادة
              <input type="file" accept="application/json" onChange={handleRestore} disabled={backupBusy} className="hidden" />
            </label>
            {restoreLog.length > 0 && (
              <div className="mt-4 text-xs space-y-1 font-mono-data bg-surface rounded-lg p-3 max-h-60 overflow-y-auto">
                {restoreLog.map((l, i) => <p key={i}>{l}</p>)}
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'system' && (
        <div className="card p-5 md:p-6">
          <div className="flex items-center gap-2 mb-4">
            <Info size={16} className="text-accent-dark" />
            <p className="font-display font-bold text-navy-900">معلومات النظام</p>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-slate-500">إصدار النظام</span><span className="font-mono-data">1.0.0</span></div>
            <div className="flex justify-between"><span className="text-slate-500">آخر تحديث</span><span className="font-mono-data">{new Date().toLocaleDateString('ar-EG')}</span></div>
          </div>
        </div>
      )}
    </div>
  )
}
