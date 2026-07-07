import { useEffect, useState } from 'react'
import { Loader2, Eye, XCircle, FileSpreadsheet } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { exportToExcel } from '../lib/exportExcel'
import type { Database } from '../lib/database.types'
import InvoicePrint, { type InvoicePrintData } from '../components/InvoicePrint'

type SaleInvoice = Database['public']['Tables']['sales_invoices']['Row']
type PurchaseInvoice = Database['public']['Tables']['purchase_invoices']['Row']

const statusLabel: Record<string, string> = {
  paid: 'مدفوعة',
  partial: 'مدفوعة جزئيًا',
  unpaid: 'آجلة',
}

const statusColor: Record<string, string> = {
  paid: 'text-emerald-600',
  partial: 'text-accent-dark',
  unpaid: 'text-red-600',
}

export default function InvoicesList() {
  const [tab, setTab] = useState<'sales' | 'purchases'>('sales')
  const [salesInvoices, setSalesInvoices] = useState<SaleInvoice[]>([])
  const [purchaseInvoices, setPurchaseInvoices] = useState<PurchaseInvoice[]>([])
  const [customerNames, setCustomerNames] = useState<Record<string, string>>({})
  const [supplierNames, setSupplierNames] = useState<Record<string, string>>({})
  const [productNames, setProductNames] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [viewData, setViewData] = useState<InvoicePrintData | null>(null)
  const [viewingId, setViewingId] = useState<string | null>(null)
  const [viewLoading, setViewLoading] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [error, setError] = useState('')

  const loadAll = async () => {
    const [s, p, c, sup, prod] = await Promise.all([
      supabase.from('sales_invoices').select('*').order('created_at', { ascending: false }),
      supabase.from('purchase_invoices').select('*').order('created_at', { ascending: false }),
      supabase.from('customers').select('id, name'),
      supabase.from('suppliers').select('id, name'),
      supabase.from('products').select('id, name'),
    ])
    if (s.data) setSalesInvoices(s.data)
    if (p.data) setPurchaseInvoices(p.data)
    if (c.data) setCustomerNames(Object.fromEntries(c.data.map((x) => [x.id, x.name])))
    if (sup.data) setSupplierNames(Object.fromEntries(sup.data.map((x) => [x.id, x.name])))
    if (prod.data) setProductNames(Object.fromEntries(prod.data.map((x) => [x.id, x.name])))
    setLoading(false)
  }

  useEffect(() => {
    let cancelled = false
    loadAll().then(() => {
      if (cancelled) return
    })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const viewInvoice = async (type: 'sale' | 'purchase', invoice: SaleInvoice | PurchaseInvoice) => {
    setViewLoading(true)
    const table = type === 'sale' ? 'sales_invoice_items' : 'purchase_invoice_items'
    const priceField = type === 'sale' ? 'unit_price' : 'unit_cost'

    const { data: items } = await supabase.from(table).select('*').eq('invoice_id', invoice.id)

    const partyName =
      type === 'sale'
        ? customerNames[(invoice as SaleInvoice).customer_id ?? ''] ?? 'عميل نقدي'
        : supplierNames[(invoice as PurchaseInvoice).supplier_id ?? ''] ?? 'بدون تحديد مورد'

    setViewingId(invoice.id)
    setViewData({
      type,
      invoiceNumber: invoice.invoice_number,
      date: new Date(invoice.created_at).toLocaleString('ar-EG'),
      partyName,
      items: (items ?? []).map((it) => ({
        name: productNames[it.product_id] ?? it.product_id,
        unit: it.unit_name,
        quantity: it.quantity,
        price: it[priceField as keyof typeof it] as number,
      })),
      total: invoice.total_amount,
      paid: invoice.paid_amount,
    })
    setViewLoading(false)
  }

  const handleCancel = async () => {
    if (!viewingId || !viewData) return
    if (!confirm('هل أنت متأكد من إلغاء هذه الفاتورة؟ سيتم إرجاع المخزون والرصيد لحالتهما قبل الفاتورة، ولا يمكن التراجع عن هذا الإجراء.')) return

    setCancelling(true)
    setError('')

    const fn = viewData.type === 'sale' ? 'void_sale_invoice' : 'void_purchase_invoice'
    const { error } = await supabase.rpc(fn, { p_invoice_id: viewingId })

    if (error) {
      setError(error.message)
    } else {
      setViewData(null)
      setViewingId(null)
      setLoading(true)
      await loadAll()
    }
    setCancelling(false)
  }

  const handleExport = () => {
    const rows =
      tab === 'sales'
        ? salesInvoices.map((inv) => ({
            'رقم الفاتورة': inv.invoice_number,
            'العميل': customerNames[inv.customer_id ?? ''] ?? 'عميل نقدي',
            'التاريخ': new Date(inv.created_at).toLocaleDateString('ar-EG'),
            'الإجمالي': inv.total_amount,
            'المدفوع': inv.paid_amount,
            'الحالة': statusLabel[inv.payment_status],
          }))
        : purchaseInvoices.map((inv) => ({
            'رقم الفاتورة': inv.invoice_number,
            'المورد': supplierNames[inv.supplier_id ?? ''] ?? '-',
            'التاريخ': new Date(inv.created_at).toLocaleDateString('ar-EG'),
            'الإجمالي': inv.total_amount,
            'المدفوع': inv.paid_amount,
            'الحالة': statusLabel[inv.payment_status],
          }))

    exportToExcel(
      tab === 'sales' ? 'فواتير-البيع' : 'فواتير-الشراء',
      tab === 'sales' ? 'فواتير البيع' : 'فواتير الشراء',
      rows
    )
  }

  if (viewData) {
    return (
      <div className="page-enter p-4 md:p-6 max-w-4xl mx-auto">
        <div className="no-print flex items-center justify-between mb-4">
          <button
            onClick={() => { setViewData(null); setViewingId(null) }}
            className="text-sm text-accent-dark hover:underline"
          >
            ← رجوع لقائمة الفواتير
          </button>
          <button
            onClick={handleCancel}
            disabled={cancelling}
            className="flex items-center gap-1.5 text-sm text-red-600 hover:underline disabled:opacity-60"
          >
            {cancelling ? <Loader2 size={14} className="animate-spin" /> : <XCircle size={14} />}
            إلغاء الفاتورة
          </button>
        </div>
        {error && <p className="no-print text-red-600 text-sm mb-3">{error}</p>}
        <InvoicePrint data={viewData} onNewInvoice={() => { setViewData(null); setViewingId(null) }} />
      </div>
    )
  }

  const invoices = tab === 'sales' ? salesInvoices : purchaseInvoices

  return (
    <div className="page-enter p-4 md:p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-5 md:mb-6">
        <h1 className="font-display text-xl md:text-2xl font-bold text-navy-900">الفواتير</h1>
        <button
          onClick={handleExport}
          className="flex items-center gap-2 bg-emerald-600 text-white rounded-xl px-3 md:px-4 py-2 text-sm font-medium hover:bg-emerald-700 transition-colors"
        >
          <FileSpreadsheet size={16} />
          <span className="hidden sm:inline">تصدير Excel</span>
        </button>
      </div>

      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setTab('sales')}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
            tab === 'sales' ? 'bg-navy-900 text-white' : 'bg-white border border-border-soft text-slate-600'
          }`}
        >
          فواتير البيع
        </button>
        <button
          onClick={() => setTab('purchases')}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
            tab === 'purchases' ? 'bg-navy-900 text-white' : 'bg-white border border-border-soft text-slate-600'
          }`}
        >
          فواتير الشراء
        </button>
      </div>

      <div className="card overflow-hidden">
        <div className="table-scroll">
          <table className="w-full text-right">
            <thead className="bg-navy-900 text-white text-sm">
              <tr>
                <th className="p-3 whitespace-nowrap">رقم الفاتورة</th>
                <th className="p-3 whitespace-nowrap">{tab === 'sales' ? 'العميل' : 'المورد'}</th>
                <th className="p-3 whitespace-nowrap">التاريخ</th>
                <th className="p-3 whitespace-nowrap">الإجمالي</th>
                <th className="p-3 whitespace-nowrap">الحالة</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="p-6 text-center text-slate-500">
                  <div className="flex items-center justify-center gap-2"><Loader2 size={16} className="animate-spin" />جاري التحميل...</div>
                </td></tr>
              ) : invoices.length === 0 ? (
                <tr><td colSpan={6} className="p-6 text-center text-slate-500">لا توجد فواتير بعد</td></tr>
              ) : (
                invoices.map((inv) => (
                  <tr key={inv.id} className="border-t border-border-soft hover:bg-surface transition-colors">
                    <td className="p-3 font-mono-data whitespace-nowrap">{inv.invoice_number}</td>
                    <td className="p-3 whitespace-nowrap">
                      {tab === 'sales'
                        ? customerNames[(inv as SaleInvoice).customer_id ?? ''] ?? 'عميل نقدي'
                        : supplierNames[(inv as PurchaseInvoice).supplier_id ?? ''] ?? '-'}
                    </td>
                    <td className="p-3 whitespace-nowrap text-slate-500">
                      {new Date(inv.created_at).toLocaleDateString('ar-EG')}
                    </td>
                    <td className="p-3 font-mono-data whitespace-nowrap">{inv.total_amount}</td>
                    <td className={`p-3 whitespace-nowrap font-medium ${statusColor[inv.payment_status]}`}>
                      {statusLabel[inv.payment_status]}
                    </td>
                    <td className="p-3 text-left">
                      <button
                        onClick={() => viewInvoice(tab === 'sales' ? 'sale' : 'purchase', inv)}
                        disabled={viewLoading}
                        className="flex items-center gap-1 text-sm text-accent-dark hover:underline"
                      >
                        <Eye size={14} />
                        عرض
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
