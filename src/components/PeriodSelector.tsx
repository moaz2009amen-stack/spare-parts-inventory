import Select from './Select'
import { periodLabels, type PeriodType } from '../lib/dateRanges'

interface PeriodSelectorProps {
  period: PeriodType
  onPeriodChange: (p: PeriodType) => void
  customFrom: string
  customTo: string
  onCustomFromChange: (v: string) => void
  onCustomToChange: (v: string) => void
}

export default function PeriodSelector({
  period, onPeriodChange, customFrom, customTo, onCustomFromChange, onCustomToChange,
}: PeriodSelectorProps) {
  return (
    <div className="flex flex-col sm:flex-row gap-3">
      <div className="w-full sm:w-48">
        <Select value={period} onChange={(e) => onPeriodChange(e.target.value as PeriodType)}>
          {(Object.keys(periodLabels) as PeriodType[]).map((p) => (
            <option key={p} value={p}>{periodLabels[p]}</option>
          ))}
        </Select>
      </div>
      {period === 'custom' && (
        <div className="flex gap-2">
          <input
            type="date"
            value={customFrom}
            onChange={(e) => onCustomFromChange(e.target.value)}
            className="border border-border-soft rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
          />
          <input
            type="date"
            value={customTo}
            onChange={(e) => onCustomToChange(e.target.value)}
            className="border border-border-soft rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
          />
        </div>
      )}
    </div>
  )
}
