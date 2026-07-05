import { useEffect, useState } from 'react'
import { Loader2, Eye } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
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
  const [viewLoading, setViewLoading] = useState(false)

  useEffect(() => {
    let cancelled = false

    Promise.all([
      supabase.from('sales_invoices').select('*').order('created_at', { ascending: false }),
      supabase.from('purchase_invoices').select('*').order('created_at', { ascending: false }),
      supabase.from('customers').select('id, name'),
      supabase.from('suppliers').select('id, name'),
      supabase.from('products').select('id, name'),
    ]).then(([s, p, c, sup, prod]) => {
      if (cancelled) return
      if (s.data) setSalesInvoices(s.data)
      if (p.data) setPurchaseInvoices(p.data)
      if (c.data) setCustomerNames(Object.fromEntries(c.data.map((x) => [x.id, x.name])))
      if (sup.data) setSupplierNames(Object.fromEntries(sup.data.map((x) => [x.id, x.name])))
      if (prod.data) setProductNames(Object.fromEntries(prod.data.map((x) => [x.id, x.name])))
      setLoading(false)
    })

    return () => {
      cancelled = true
    }
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

  if (viewData) {
    return (
      <div className="page-enter p-6 max-w-4xl mx-auto">
        <button
          onClick={() => setViewData(null)}
          className="no-print mb-4 text-sm text-accent-dark hover:underline"
        >
          ← رجوع لقائمة الفواتير
        </button>
        <InvoicePrint data={viewData} onNewInvoice={() => setViewData(null)} />
      </div>
    )
  }

  const invoices = tab === 'sales' ? salesInvoices : purchaseInvoices

  return (
    <div className="page-enter p-6 max-w-5xl mx-auto">
      <h1 className="font-display text-2xl font-bold text-navy-900 mb-6">الفواتير</h1>

      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setTab('sales')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            tab === 'sales' ? 'bg-navy-900 text-white' : 'bg-white border border-border-soft text-slate-600'
          }`}
        >
          فواتير البيع
        </button>
        <button
          onClick={() => setTab('purchases')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
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
