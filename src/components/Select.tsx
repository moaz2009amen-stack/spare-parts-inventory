import { ChevronDown } from 'lucide-react'
import type { SelectHTMLAttributes } from 'react'

// مكوّن Select واحد بشكل موحّد، يُستخدم بدل أي <select> عادي في كل
// الموقع، عشان كل الـ Dropdowns تبقى بنفس الشكل بالظبط (نفس الحواف،
// نفس السهم، نفس حالة التركيز والتعطيل) بدل ما كل متصفح يوريها بشكله
// الافتراضي المختلف.
export default function Select({
  className = '',
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="relative">
      <select
        {...props}
        className={`w-full appearance-none border border-border-soft rounded-xl pl-9 pr-3 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-accent transition-shadow disabled:opacity-50 disabled:bg-surface ${className}`}
      >
        {children}
      </select>
      <ChevronDown
        size={16}
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
      />
    </div>
  )
}
