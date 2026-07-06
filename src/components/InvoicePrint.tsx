import { Printer, FilePlus } from 'lucide-react'

export interface InvoicePrintItem {
  name: string
  unit: string
  quantity: number
  price: number
}

export interface InvoicePrintData {
  type: 'sale' | 'purchase'
  invoiceNumber: string
  date: string
  partyName: string
  items: InvoicePrintItem[]
  total: number
  paid: number
}

export default function InvoicePrint({
  data,
  onNewInvoice,
}: {
  data: InvoicePrintData
  onNewInvoice: () => void
}) {
  const remaining = data.total - data.paid

  return (
    <div className="card p-5 md:p-6">
      <div className="no-print flex flex-col sm:flex-row justify-end gap-3 mb-4">
        <button
          onClick={() => window.print()}
          className="flex items-center justify-center gap-2 bg-navy-900 text-white rounded-xl px-4 py-2 text-sm font-medium hover:bg-navy-800 transition-colors"
        >
          <Printer size={16} />
          طباعة الفاتورة
        </button>
        <button
          onClick={onNewInvoice}
          className="btn-primary flex items-center justify-center gap-2 text-white rounded-xl px-4 py-2 text-sm font-medium transition-all"
        >
          <FilePlus size={16} />
          فاتورة جديدة
        </button>
      </div>

      <div className="print-area">
        <div className="flex flex-col sm:flex-row justify-between items-start gap-2 mb-6 border-b-2 border-navy-900 pb-4">
          <div>
            <h2 className="font-display font-extrabold text-xl text-navy-900">
              {data.type === 'sale' ? 'فاتورة بيع' : 'فاتورة شراء'}
            </h2>
            <p className="text-sm text-slate-500 mt-1">نظام إدارة مخزن قطع غيار السيارات</p>
          </div>
          <div className="sm:text-left text-sm">
            <p className="font-mono-data font-bold">{data.invoiceNumber}</p>
            <p className="text-slate-500">{data.date}</p>
          </div>
        </div>

        <p className="mb-4 text-sm">
          <span className="text-slate-500">{data.type === 'sale' ? 'العميل: ' : 'المورد: '}</span>
          <span className="font-medium">{data.partyName}</span>
        </p>

        <div className="table-scroll mb-6">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-navy-900 text-white">
                <th className="p-2 text-right whitespace-nowrap">الصنف</th>
                <th className="p-2 text-right whitespace-nowrap">الوحدة</th>
                <th className="p-2 text-right whitespace-nowrap">الكمية</th>
                <th className="p-2 text-right whitespace-nowrap">السعر</th>
                <th className="p-2 text-right whitespace-nowrap">الإجمالي</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((item, i) => (
                <tr key={i} className="border-b border-border-soft">
                  <td className="p-2 whitespace-nowrap">{item.name}</td>
                  <td className="p-2 whitespace-nowrap">{item.unit}</td>
                  <td className="p-2 font-mono-data whitespace-nowrap">{item.quantity}</td>
                  <td className="p-2 font-mono-data whitespace-nowrap">{item.price.toFixed(2)}</td>
                  <td className="p-2 font-mono-data whitespace-nowrap">{(item.quantity * item.price).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex justify-end">
          <div className="w-full sm:w-64 text-sm space-y-1.5">
            <div className="flex justify-between">
              <span>الإجمالي</span>
              <span className="font-mono-data font-bold">{data.total.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>المدفوع</span>
              <span className="font-mono-data">{data.paid.toFixed(2)}</span>
            </div>
            <div className="flex justify-between border-t border-border-soft pt-1.5 font-bold">
              <span>المتبقي</span>
              <span className="font-mono-data">{remaining.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
