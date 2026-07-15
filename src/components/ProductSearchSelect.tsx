import { useEffect, useRef, useState } from 'react'
import { Search, X } from 'lucide-react'

interface ProductLike {
  id: string
  name: string
  part_number: string
  barcode?: string | null
}

interface Props<T extends ProductLike> {
  products: T[]
  value: string
  onChange: (id: string) => void
  placeholder?: string
  disabled?: boolean
}

// كومبوننت بحث لاختيار صنف بدل الـ <select> العادي — مفيد جدًا لما يكون
// عدد الأصناف كبير وصعب تدوّر عليه في قائمة منسدلة طويلة. بيدور بالاسم
// أو رقم القطعة أو الباركود مع بعض. البحث محلي (client-side) لأن قائمة
// الأصناف أصلًا محمّلة كاملة في الصفحة.
export default function ProductSearchSelect<T extends ProductLike>({
  products,
  value,
  onChange,
  placeholder = 'دوّر بالاسم أو رقم القطعة أو الباركود...',
  disabled = false,
}: Props<T>) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const boxRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const selected = products.find((p) => p.id === value)

  const term = query.trim().toLowerCase()
  const results = (
    term.length === 0
      ? products
      : products.filter(
          (p) =>
            p.name.toLowerCase().includes(term) ||
            p.part_number.toLowerCase().includes(term) ||
            (p.barcode ?? '').toLowerCase().includes(term)
        )
  ).slice(0, 30)

  if (selected && !open) {
    return (
      <div className="relative flex items-center justify-between border border-border-soft rounded-xl px-3 py-2.5 bg-white">
        <div className="min-w-0">
          <p className="text-sm font-medium text-navy-900 truncate">{selected.name}</p>
          <p className="text-xs text-slate-400 font-mono-data truncate">{selected.part_number}</p>
        </div>
        {!disabled && (
          <button
            type="button"
            onClick={() => {
              onChange('')
              setQuery('')
              setOpen(true)
            }}
            className="shrink-0 text-slate-400 hover:text-red-600 p-1"
            aria-label="تغيير الصنف"
          >
            <X size={16} />
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="relative" ref={boxRef}>
      <div className="relative">
        <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          value={query}
          disabled={disabled}
          onChange={(e) => {
            setQuery(e.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          className="w-full border border-border-soft rounded-xl pr-9 pl-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent transition-shadow disabled:opacity-50"
        />
      </div>
      {open && !disabled && (
        <div className="pop-enter absolute top-full mt-1 w-full bg-white rounded-xl shadow-lg border border-border-soft overflow-hidden z-50 max-h-64 overflow-y-auto">
          {results.length === 0 ? (
            <p className="p-4 text-center text-sm text-slate-500">لا توجد نتائج</p>
          ) : (
            results.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  onChange(p.id)
                  setQuery('')
                  setOpen(false)
                }}
                className="w-full text-right p-2.5 hover:bg-surface transition-colors border-b border-border-soft last:border-b-0"
              >
                <p className="text-sm font-medium text-navy-900 truncate">{p.name}</p>
                <p className="text-xs text-slate-400 font-mono-data truncate">
                  {p.part_number}
                  {p.barcode ? ` — ${p.barcode}` : ''}
                </p>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}
