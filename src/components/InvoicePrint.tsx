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
    <div className="card p-5 md:p-8">
      <div className="no-print flex flex-col sm:flex-row justify-end gap-3 mb-5">
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

      {/* منطقة الطباعة الفعلية — كل شيء هنا محاذٍ لليمين بثبات في كل الأحجام */}
      <div className="print-area max-w-2xl mx-auto">
        {/* رأس الفاتورة */}
        <div className="grid grid-cols-2 gap-2 items-start border-b-2 border-navy-900 pb-4 mb-5">
          <div>
            <h2 className="font-display font-extrabold text-lg md:text-xl text-navy-900">
              {data.type === 'sale' ? 'فاتورة بيع' : 'فاتورة شراء'}
            </h2>
            <p className="text-xs md:text-sm text-slate-500 mt-1">
              نظام إدارة مخزن قطع غيار السيارات
            </p>
          </div>
          <div className="text-left">
            <p className="font-mono-data font-bold text-sm md:text-base">{data.invoiceNumber}</p>
            <p className="text-xs md:text-sm text-slate-500 mt-1">{data.date}</p>
          </div>
        </div>

        {/* بيانات الطرف التاني */}
        <div className="flex justify-between items-center bg-surface rounded-xl px-4 py-3 mb-5 text-sm">
          <span className="text-slate-500">{data.type === 'sale' ? 'العميل' : 'المورد'}</span>
          <span className="font-medium text-navy-900">{data.partyName}</span>
        </div>

        {/* جدول الأصناف */}
        <div className="table-scroll mb-5">
          <table className="w-full text-sm border border-border-soft rounded-xl overflow-hidden">
            <thead>
              <tr className="bg-navy-900 text-white">
                <th className="p-2.5 text-right font-normal whitespace-nowrap">الصنف</th>
                <th className="p-2.5 text-right font-normal whitespace-nowrap">الوحدة</th>
                <th className="p-2.5 text-right font-normal whitespace-nowrap">الكمية</th>
                <th className="p-2.5 text-right font-normal whitespace-nowrap">السعر</th>
                <th className="p-2.5 text-right font-normal whitespace-nowrap">الإجمالي</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((item, i) => (
                <tr key={i} className="border-t border-border-soft">
                  <td className="p-2.5 whitespace-nowrap">{item.name}</td>
                  <td className="p-2.5 whitespace-nowrap text-slate-500">{item.unit}</td>
                  <td className="p-2.5 font-mono-data whitespace-nowrap">{item.quantity}</td>
                  <td className="p-2.5 font-mono-data whitespace-nowrap">{item.price.toFixed(2)}</td>
                  <td className="p-2.5 font-mono-data whitespace-nowrap font-medium">
                    {(item.quantity * item.price).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* الإجماليات — دايمًا بنفس العرض وبنفس المحاذاة بغض النظر عن حجم الشاشة */}
        <div className="flex justify-start">
          <div className="w-full sm:w-72 text-sm border border-border-soft rounded-xl overflow-hidden">
            <div className="flex justify-between px-4 py-2.5 border-b border-border-soft">
              <span className="text-slate-500">الإجمالي</span>
              <span className="font-mono-data font-medium">{data.total.toFixed(2)}</span>
            </div>
            <div className="flex justify-between px-4 py-2.5 border-b border-border-soft">
              <span className="text-slate-500">المدفوع</span>
              <span className="font-mono-data font-medium">{data.paid.toFixed(2)}</span>
            </div>
            <div className="flex justify-between px-4 py-2.5 bg-surface">
              <span className="font-bold text-navy-900">المتبقي</span>
              <span className="font-mono-data font-bold text-navy-900">{remaining.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
