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
    <div className="card p-6">
      <div className="no-print flex justify-end gap-3 mb-4">
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 bg-navy-900 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-navy-800 transition-colors"
        >
          <Printer size={16} />
          طباعة الفاتورة
        </button>
        <button
          onClick={onNewInvoice}
          className="flex items-center gap-2 bg-accent text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-accent-dark transition-colors"
        >
          <FilePlus size={16} />
          فاتورة جديدة
        </button>
      </div>

      <div className="print-area">
        <div className="flex justify-between items-start mb-6 border-b-2 border-navy-900 pb-4">
          <div>
            <h2 className="font-display font-extrabold text-xl text-navy-900">
              {data.type === 'sale' ? 'فاتورة بيع' : 'فاتورة شراء'}
            </h2>
            <p className="text-sm text-slate-500 mt-1">نظام إدارة مخزن قطع غيار السيارات</p>
          </div>
          <div className="text-left text-sm">
            <p className="font-mono-data font-bold">{data.invoiceNumber}</p>
            <p className="text-slate-500">{data.date}</p>
          </div>
        </div>

        <p className="mb-4 text-sm">
          <span className="text-slate-500">{data.type === 'sale' ? 'العميل: ' : 'المورد: '}</span>
          <span className="font-medium">{data.partyName}</span>
        </p>

        <table className="w-full text-sm mb-6">
          <thead>
            <tr className="bg-navy-900 text-white">
              <th className="p-2 text-right">الصنف</th>
              <th className="p-2 text-right">الوحدة</th>
              <th className="p-2 text-right">الكمية</th>
              <th className="p-2 text-right">السعر</th>
              <th className="p-2 text-right">الإجمالي</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((item, i) => (
              <tr key={i} className="border-b border-border-soft">
                <td className="p-2">{item.name}</td>
                <td className="p-2">{item.unit}</td>
                <td className="p-2 font-mono-data">{item.quantity}</td>
                <td className="p-2 font-mono-data">{item.price.toFixed(2)}</td>
                <td className="p-2 font-mono-data">{(item.quantity * item.price).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="flex justify-end">
          <div className="w-64 text-sm space-y-1.5">
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
