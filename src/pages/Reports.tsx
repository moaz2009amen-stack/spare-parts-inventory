import { useEffect, useState } from 'react'
import { Loader2, FileSpreadsheet } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { exportToExcel } from '../lib/exportExcel'
import { getPeriodRange, type PeriodType } from '../lib/dateRanges'
import PeriodSelector from '../components/PeriodSelector'

type ReportTab = 'sales' | 'profit' | 'orders' | 'inventory' | 'customers' | 'debts' | 'returns' | 'stocktake'

const tabLabels: Record<ReportTab, string> = {
  sales: 'المبيعات', profit: 'الأرباح', orders: 'الطلبيات', inventory: 'المخزون',
  customers: 'العملاء', debts: 'الديون', returns: 'المرتجعات', stocktake: 'الجرد',
}

export default function Reports() {
  const [tab, setTab] = useState<ReportTab>('sales')
  const [period, setPeriod] = useState<PeriodType>('month')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')
  const [loading, setLoading] = useState(true)
  const [rows, setRows] = useState<Record<string, string | number>[]>([])
  const [summary, setSummary] = useState<{ label: string; value: string }[]>([])

  const range = getPeriodRange(period, customFrom, customTo)

  useEffect(() => {
    let cancelled = false
    setLoading(true)

    async function load() {
      const fromIso = range.from.toISOString()
      const toIso = range.to.toISOString()

      if (tab === 'sales') {
        const { data } = await supabase
          .from('sales_invoices')
          .select('*, customers(name)')
          .gte('created_at', fromIso).lte('created_at', toIso)
          .order('created_at', { ascending: false })
        const list = data ?? []
        const total = list.reduce((s, i) => s + i.total_amount, 0)
        setSummary([
          { label: 'عدد الفواتير', value: String(list.length) },
          { label: 'إجمالي المبيعات', value: total.toFixed(2) },
        ])
        setRows(list.map((i) => ({
          'رقم الفاتورة': i.invoice_number,
          'العميل': (i.customers as unknown as { name: string } | null)?.name ?? 'عميل نقدي',
          'التاريخ': new Date(i.created_at).toLocaleDateString('ar-EG'),
          'الإجمالي': i.total_amount,
        })))
      }

      if (tab === 'profit') {
        const { data: items } = await supabase
          .from('sales_invoice_items')
          .select('*, sales_invoices!inner(created_at, invoice_number)')
          .gte('sales_invoices.created_at', fromIso).lte('sales_invoices.created_at', toIso)

        const list = items ?? []
        let totalProfit = 0
        let totalRevenue = 0
        const byInvoice: Record<string, { revenue: number; profit: number }> = {}

        list.forEach((it) => {
          const inv = it.sales_invoices as unknown as { invoice_number: string }
          const revenue = it.quantity * it.unit_price
          const profit = revenue - (it.actual_cost ?? 0)
          totalRevenue += revenue
          totalProfit += profit
          if (!byInvoice[inv.invoice_number]) byInvoice[inv.invoice_number] = { revenue: 0, profit: 0 }
          byInvoice[inv.invoice_number].revenue += revenue
          byInvoice[inv.invoice_number].profit += profit
        })

        const margin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0

        setSummary([
          { label: 'إجمالي الإيراد', value: totalRevenue.toFixed(2) },
          { label: 'إجمالي الربح الدقيق', value: totalProfit.toFixed(2) },
          { label: 'هامش الربح', value: `${margin.toFixed(1)}%` },
        ])
        setRows(Object.entries(byInvoice).map(([inv, v]) => ({
          'رقم الفاتورة': inv,
          'الإيراد': v.revenue.toFixed(2),
          'الربح الدقيق': v.profit.toFixed(2),
        })))
      }

      if (tab === 'orders') {
        const { data } = await supabase
          .from('orders')
          .select('*, warehouses(name)')
          .gte('created_at', fromIso).lte('created_at', toIso)
          .order('created_at', { ascending: false })
        const list = data ?? []
        const total = list.reduce((s, o) => s + o.total_cost, 0)
        setSummary([
          { label: 'عدد الطلبيات', value: String(list.length) },
          { label: 'إجمالي التكلفة', value: total.toFixed(2) },
        ])
        setRows(list.map((o) => ({
          'رقم الطلبية': o.order_number,
          'المخزن': (o.warehouses as unknown as { name: string } | null)?.name ?? '-',
          'التاريخ': new Date(o.created_at).toLocaleDateString('ar-EG'),
          'التكلفة': o.total_cost,
        })))
      }

      if (tab === 'inventory') {
        const { data } = await supabase
          .from('inventory')
          .select('quantity, products(part_number, name), warehouses(name)')
        const list = data ?? []
        setSummary([{ label: 'عدد سجلات المخزون', value: String(list.length) }])
        setRows(list.map((r) => {
          const product = r.products as unknown as { part_number: string; name: string } | null
          const warehouse = r.warehouses as unknown as { name: string } | null
          return {
            'رقم القطعة': product?.part_number ?? '-',
            'الصنف': product?.name ?? '-',
            'المخزن': warehouse?.name ?? '-',
            'الكمية': r.quantity,
          }
        }))
      }

      if (tab === 'customers') {
        const { data } = await supabase.from('customers').select('*').order('name')
        const list = data ?? []
        setSummary([{ label: 'عدد العملاء', value: String(list.length) }])
        setRows(list.map((c) => ({
          'الاسم': c.name, 'الهاتف': c.phone ?? '-', 'الرصيد': c.balance,
        })))
      }

      if (tab === 'debts') {
        const { data } = await supabase.from('customers').select('*').gt('balance', 0).order('balance', { ascending: false })
        const list = data ?? []
        const total = list.reduce((s, c) => s + c.balance, 0)
        setSummary([
          { label: 'عدد العملاء المدينين', value: String(list.length) },
          { label: 'إجمالي الديون', value: total.toFixed(2) },
        ])
        setRows(list.map((c) => ({ 'الاسم': c.name, 'الهاتف': c.phone ?? '-', 'المديونية': c.balance })))
      }

      if (tab === 'returns') {
        const { data: salesReturns } = await supabase
          .from('sales_returns').select('*, sales_invoices(invoice_number)')
          .gte('created_at', fromIso).lte('created_at', toIso)
        const { data: orderReturns } = await supabase
          .from('order_returns').select('*, orders(order_number)')
          .gte('created_at', fromIso).lte('created_at', toIso)

        const list1 = salesReturns ?? []
        const list2 = orderReturns ?? []
        const total = list1.reduce((s, r) => s + r.total_amount, 0) + list2.reduce((s, r) => s + r.total_amount, 0)

        setSummary([
          { label: 'عدد المرتجعات', value: String(list1.length + list2.length) },
          { label: 'إجمالي قيمة المرتجعات', value: total.toFixed(2) },
        ])
        setRows([
          ...list1.map((r) => ({
            'النوع': 'مرتجع بيع',
            'مرجع': (r.sales_invoices as unknown as { invoice_number: string } | null)?.invoice_number ?? '-',
            'التاريخ': new Date(r.created_at).toLocaleDateString('ar-EG'),
            'القيمة': r.total_amount,
          })),
          ...list2.map((r) => ({
            'النوع': 'مرتجع طلبية',
            'مرجع': (r.orders as unknown as { order_number: string } | null)?.order_number ?? '-',
            'التاريخ': new Date(r.created_at).toLocaleDateString('ar-EG'),
            'القيمة': r.total_amount,
          })),
        ])
      }

      if (tab === 'stocktake') {
        const { data } = await supabase
          .from('stocktakes').select('*, warehouses(name)')
          .gte('created_at', fromIso).lte('created_at', toIso)
          .order('created_at', { ascending: false })
        const list = data ?? []
        setSummary([{ label: 'عدد عمليات الجرد', value: String(list.length) }])
        setRows(list.map((s) => ({
          'المخزن': (s.warehouses as unknown as { name: string } | null)?.name ?? '-',
          'التاريخ': new Date(s.created_at).toLocaleDateString('ar-EG'),
          'ملاحظات': s.notes ?? '',
        })))
      }

      if (!cancelled) setLoading(false)
    }

    load()
    return () => { cancelled = true }
  }, [tab, period, customFrom, customTo])

  const handleExport = () => {
    exportToExcel(`تقرير-${tabLabels[tab]}`, tabLabels[tab], rows)
  }

  return (
    <div className="page-enter p-4 md:p-6 max-w-6xl mx-auto">
      <h1 className="font-display text-xl md:text-2xl font-bold text-navy-900 mb-5 md:mb-6">التقارير</h1>

      <div className="flex flex-wrap gap-2 mb-5">
        {(Object.keys(tabLabels) as ReportTab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3.5 py-2 rounded-xl text-sm font-medium transition-colors ${
              tab === t ? 'bg-navy-900 text-white' : 'bg-white border border-border-soft text-slate-600'
            }`}
          >
            {tabLabels[t]}
          </button>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <PeriodSelector
          period={period}
          onPeriodChange={setPeriod}
          customFrom={customFrom}
          customTo={customTo}
          onCustomFromChange={setCustomFrom}
          onCustomToChange={setCustomTo}
        />
        <button
          onClick={handleExport}
          disabled={rows.length === 0}
          className="flex items-center justify-center gap-2 bg-emerald-600 text-white rounded-xl px-4 py-2.5 text-sm font-medium hover:bg-emerald-700 transition-colors disabled:opacity-50"
        >
          <FileSpreadsheet size={16} />
          تصدير Excel
        </button>
      </div>

      {summary.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
          {summary.map((s, i) => (
            <div key={i} className="card p-4">
              <p className="text-xs text-slate-500 mb-1">{s.label}</p>
              <p className="font-mono-data font-bold text-lg text-navy-900">{s.value}</p>
            </div>
          ))}
        </div>
      )}

      <div className="card overflow-hidden">
        <div className="table-scroll">
          <table className="w-full text-right text-sm">
            {loading ? (
              <tbody><tr><td className="p-6 text-center text-slate-500">
                <div className="flex items-center justify-center gap-2"><Loader2 size={16} className="animate-spin" />جاري التحميل...</div>
              </td></tr></tbody>
            ) : rows.length === 0 ? (
              <tbody><tr><td className="p-6 text-center text-slate-500">لا توجد بيانات في الفترة المحددة</td></tr></tbody>
            ) : (
              <>
                <thead className="bg-navy-900 text-white">
                  <tr>
                    {Object.keys(rows[0]).map((key) => (
                      <th key={key} className="p-3 whitespace-nowrap font-normal">{key}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, i) => (
                    <tr key={i} className="border-t border-border-soft hover:bg-surface transition-colors">
                      {Object.values(row).map((val, j) => (
                        <td key={j} className="p-3 font-mono-data whitespace-nowrap">{val}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </>
            )}
          </table>
        </div>
      </div>
    </div>
  )
}
