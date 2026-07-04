export default function ComingSoon({ title }: { title: string }) {
  return (
    <div className="p-8">
      <h1 className="font-display text-xl font-bold text-navy-900 mb-2">{title}</h1>
      <p className="text-slate-500">هذه الوحدة قيد الإنشاء.</p>
    </div>
  )
}
