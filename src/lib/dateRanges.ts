export type PeriodType = 'day' | 'week' | 'month' | 'year' | 'custom'

export interface DateRange {
  from: Date
  to: Date
}

export function getPeriodRange(period: PeriodType, customFrom?: string, customTo?: string): DateRange {
  const now = new Date()
  const to = new Date(now)
  to.setHours(23, 59, 59, 999)

  if (period === 'custom' && customFrom && customTo) {
    const from = new Date(customFrom)
    from.setHours(0, 0, 0, 0)
    const toCustom = new Date(customTo)
    toCustom.setHours(23, 59, 59, 999)
    return { from, to: toCustom }
  }

  const from = new Date(now)
  from.setHours(0, 0, 0, 0)

  switch (period) {
    case 'day':
      break
    case 'week':
      from.setDate(from.getDate() - 6)
      break
    case 'month':
      from.setDate(from.getDate() - 29)
      break
    case 'year':
      from.setDate(from.getDate() - 364)
      break
  }

  return { from, to }
}

export const periodLabels: Record<PeriodType, string> = {
  day: 'اليوم',
  week: 'آخر أسبوع',
  month: 'آخر شهر',
  year: 'آخر سنة',
  custom: 'فترة مخصصة',
}
