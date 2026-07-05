import { useEffect, useState } from 'react'
import { Loader2, Trash2, Plus } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import type { Database } from '../lib/database.types'
import InvoicePrint, { type InvoicePrintData } from '../components/InvoicePrint'

type Product = Database['public']['Tables']['products']['Row']
type ProductUnit = Database['public']['Tables']['product_units']['Row']
type Supplier = Database['public']['Tables']['suppliers']['Row']
type Warehouse = Database['public']['Tables']['warehouses']['Row']

interface CartItem {
  product_id: string
  product_name: string
  unit_name: string
  conversion_factor: number
  quantity: number
  unit_cost: number
}

export default function Purchases() {
  const [products, setProducts] = useState<Product[]>([])
  const [units, setUnits] = useState<ProductUnit[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [invoice, setInvoice] = useState<InvoicePrintData | null>(null)

  const [warehouseId, setWarehouseId] = useState('')
  const [supplierId, setSupplierId] = useState('')
  const [paidAmount, setPaidAmount] = useState('')
  const [cart, setCart] = useState<CartItem[]>([])

  const [picker, setPicker] = useState({
    product_id: '',
    unit_name: 'قطعة',
    quantity: '1',
    unit_cost: '',
  })

  useEffect(() => {
    let cancelled = false

    Promise.all([
      supabase.from('products').select('*').order('name'),
      supabase.from('product_units').select('*'),
      supabase.from('suppliers').select('*').order('name'),
      supabase.from('warehouses').select('*').order('created_at'),
    ]).then(([p, u, s, w]) => {
      if (cancelled) return
      if (p.data) setProducts(p.data)
      if (u.data) setUnits(u.data)
      if (s.data) setSuppliers(s.data)
      if (w.data) {
        setWarehouses(w.data)
        if (w.data.length > 0) setWarehouseId(w.data[0].id)
      }
      setLoading(false)
    })

    return () => {
      cancelled = true
    }
  }, [])

  const selectedProduct = products.find((p) => p.id === picker.product_id)
  const availableUnits = [
    { unit_name: selectedProduct?.base_unit ?? 'قطعة', conversion_factor: 1 },
    ...units
      .filter((u) => u.product_id === picker.product_id)
      .map((u) => ({ unit_name: u.unit_name, conversion_factor: u.conversion_factor })),
  ]

  const handleProductChange = (productId: string) => {
    const product = products.find((p) => p.id === productId)
    setPicker({
      product_id: productId,
      unit_name: product?.base_unit ?? 'قطعة',
      quantity: '1',
      unit_cost: product ? String(product.cost_price) : '',
    })
  }

  const addToCart = () => {
    if (!selectedProduct || !picker.quantity || !picker.unit_cost) return
    const unit = availableUnits.find((u) => u.unit_name === picker.unit_name)
    if (!unit) return

    setCart([
      ...cart,
      {
        product_id: selectedProduct.id,
        product_name: selectedProduct.name,
        unit_name: unit.unit_name,
        conversion_factor: unit.conversion_factor,
        quantity: Number(picker.quantity),
        unit_cost: Number(picker.unit_cost),
      },
    ])
    setPicker({ product_id: '', unit_name: 'قطعة', quantity: '1', unit_cost: '' })
  }

  const removeFromCart = (index: number) => {
    setCart(cart.filter((_, i) => i !== index))
  }

  const total = cart.reduce((sum, item) => sum + item.quantity * item.unit_cost, 0)

  const resetForm = () => {
    setInvoice(null)
    setCart([])
    setPaidAmount('')
    setSupplierId('')
    setError('')
  }

  const handleSubmit = async () => {
    setError('')

    if (cart.length === 0) {
      setError('أضف صنف واحد على الأقل للفاتورة')
      return
    }
    if (!warehouseId) {
      setError('اختر المخزن')
      return
    }

    setSaving(true)

    const paid = Number(paidAmount) || 0

    const { data: invoiceId, error } = await supabase.rpc('create_purchase_invoice', {
      p_supplier_id: supplierId || null,
      p_warehouse_id: warehouseId,
      p_items: cart.map((item) => ({
        product_id: item.product_id,
        unit_name: item.unit_name,
        conversion_factor: item.conversion_factor,
        quantity: item.quantity,
        unit_cost: item.unit_cost,
      })),
      p_paid_amount: paid,
    })

    if (error) {
      setError(error.message)
      setSaving(false)
      return
    }

    const { data: invoiceRow } = await supabase
      .from('purchase_invoices')
      .select('invoice_number, created_at')
      .eq('id', invoiceId)
      .single()

    const supplierName = suppliers.find((s) => s.id === supplierId)?.name ?? 'بدون تحديد مورد'

    setInvoice({
      type: 'purchase',
      invoiceNumber: invoiceRow?.invoice_number ?? '',
      date: invoiceRow?.created_at
        ? new Date(invoiceRow.created_at).toLocaleString('ar-EG')
        : new Date().toLocaleString('ar-EG'),
      partyName: supplierName,
      items: cart.map((item) => ({
        name: item.product_name,
        unit: item.unit_name,
        quantity: item.quantity,
        price: item.unit_cost,
      })),
      total,
      paid,
    })

    setSaving(false)
  }

  if (loading) {
    return (
      <div className="p-8 flex items-center gap-2 text-slate-500">
        <Loader2 size={16} className="animate-spin" />
        جاري التحميل...
      </div>
    )
  }

  if (invoice) {
    return (
      <div className="page-enter p-6 max-w-4xl mx-auto">
        <h1 className="font-display text-2xl font-bold text-navy-900 mb-6 no-print">
          تم تسجيل الفاتورة
        </h1>
        <InvoicePrint data={invoice} onNewInvoice={resetForm} />
      </div>
    )
  }

  return (
    <div className="page-enter p-6 max-w-4xl mx-auto">
      <h1 className="font-display text-2xl font-bold text-navy-900 mb-6">فاتورة شراء جديدة</h1>

      <div className="card p-6 mb-6 grid grid-cols-2 gap-4">
        <select
          value={warehouseId}
          onChange={(e) => setWarehouseId(e.target.value)}
          className="border border-border-soft rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent"
        >
          {warehouses.map((w) => (
            <option key={w.id} value={w.id}>{w.name}</option>
          ))}
        </select>
        <select
          value={supplierId}
          onChange={(e) => setSupplierId(e.target.value)}
          className="border border-border-soft rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent"
        >
          <option value="">بدون تحديد مورد</option>
          {suppliers.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
      </div>

      <div className="card p-6 mb-6">
        <p className="font-display font-bold text-navy-900 mb-3">إضافة صنف</p>
        <div className="grid grid-cols-4 gap-3 mb-3">
          <select
            value={picker.product_id}
            onChange={(e) => handleProductChange(e.target.value)}
            className="border border-border-soft rounded-lg px-3 py-2 col-span-2 focus:outline-none focus:ring-2 focus:ring-accent"
          >
            <option value="">اختر صنف...</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>{p.part_number} — {p.name}</option>
            ))}
          </select>
          <select
            value={picker.unit_name}
            onChange={(e) => setPicker({ ...picker, unit_name: e.target.value })}
            disabled={!picker.product_id}
            className="border border-border-soft rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent"
          >
            {availableUnits.map((u) => (
              <option key={u.unit_name} value={u.unit_name}>{u.unit_name}</option>
            ))}
          </select>
          <input
            type="number"
            placeholder="الكمية"
            value={picker.quantity}
            onChange={(e) => setPicker({ ...picker, quantity: e.target.value })}
            className="border border-border-soft rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent"
          />
          <input
            type="number"
            step="0.01"
            placeholder="تكلفة الوحدة"
            value={picker.unit_cost}
            onChange={(e) => setPicker({ ...picker, unit_cost: e.target.value })}
            className="border border-border-soft rounded-lg px-3 py-2 col-span-2 focus:outline-none focus:ring-2 focus:ring-accent"
          />
          <button
            onClick={addToCart}
            disabled={!picker.product_id}
            className="col-span-2 flex items-center justify-center gap-2 bg-navy-900 text-white rounded-lg py-2 font-medium hover:bg-navy-800 transition-colors disabled:opacity-50"
          >
            <Plus size={16} />
            أضف للفاتورة
          </button>
        </div>
      </div>

      <div className="card overflow-hidden mb-6">
        <div className="table-scroll">
          <table className="w-full text-right">
            <thead className="bg-navy-900 text-white text-sm">
              <tr>
                <th className="p-3 whitespace-nowrap">الصنف</th>
                <th className="p-3 whitespace-nowrap">الوحدة</th>
                <th className="p-3 whitespace-nowrap">الكمية</th>
                <th className="p-3 whitespace-nowrap">التكلفة</th>
                <th className="p-3 whitespace-nowrap">الإجمالي</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {cart.length === 0 ? (
                <tr><td colSpan={6} className="p-6 text-center text-slate-500">لم تُضف أي أصناف بعد</td></tr>
              ) : (
                cart.map((item, i) => (
                  <tr key={i} className="border-t border-border-soft">
                    <td className="p-3 whitespace-nowrap">{item.product_name}</td>
                    <td className="p-3 whitespace-nowrap">{item.unit_name}</td>
                    <td className="p-3 font-mono-data whitespace-nowrap">{item.quantity}</td>
                    <td className="p-3 font-mono-data whitespace-nowrap">{item.unit_cost}</td>
                    <td className="p-3 font-mono-data whitespace-nowrap">{item.quantity * item.unit_cost}</td>
                    <td className="p-3 text-left">
                      <button onClick={() => removeFromCart(i)} className="text-red-600 hover:text-red-700">
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card p-6">
        <div className="flex justify-between items-center mb-4">
          <span className="font-display font-bold text-lg text-navy-900">الإجمالي</span>
          <span className="font-mono-data font-bold text-lg text-navy-900">{total.toFixed(2)}</span>
        </div>
        <input
          type="number"
          step="0.01"
          placeholder="المبلغ المدفوع الآن (اتركه فارغًا لو آجل بالكامل)"
          value={paidAmount}
          onChange={(e) => setPaidAmount(e.target.value)}
          className="w-full border border-border-soft rounded-lg px-3 py-2 mb-4 focus:outline-none focus:ring-2 focus:ring-accent"
        />

        {error && <p className="text-red-600 text-sm mb-3">{error}</p>}

        <button
          onClick={handleSubmit}
          disabled={saving}
          className="w-full flex items-center justify-center gap-2 bg-accent text-white rounded-lg py-2.5 font-medium hover:bg-accent-dark active:scale-[0.98] transition-all disabled:opacity-70"
        >
          {saving && <Loader2 size={16} className="animate-spin" />}
          {saving ? 'جاري الحفظ...' : 'تسجيل الفاتورة'}
        </button>
      </div>
    </div>
  )
}
