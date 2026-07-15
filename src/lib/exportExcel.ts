import * as XLSX from 'xlsx'

export interface ExcelSheet {
  name: string
  rows: Record<string, string | number>[]
}

// تعريض الأعمدة تلقائيًا حسب أطول قيمة/عنوان في العمود، عشان الملف
// يفتح منظّم من غير ما تضطر تسحّب حدود الأعمدة يدويًا كل مرة.
function autoFitColumns(worksheet: XLSX.WorkSheet, rows: Record<string, string | number>[]) {
  if (rows.length === 0) return
  const headers = Object.keys(rows[0])
  worksheet['!cols'] = headers.map((header) => {
    const maxLen = Math.max(header.length, ...rows.map((r) => String(r[header] ?? '').length))
    return { wch: Math.min(Math.max(maxLen + 2, 10), 40) }
  })
}

/**
 * تصدير أي مصفوفة بيانات كملف Excel بشيت واحد.
 * كل عنصر في rows هو صف، ومفاتيح الـ object هي أسماء الأعمدة
 * (اكتبها بالعربي مباشرة عشان تظهر كعناوين أعمدة في الإكسل).
 */
export function exportToExcel(
  filename: string,
  sheetName: string,
  rows: Record<string, string | number>[]
) {
  exportMultiSheetExcel(filename, [{ name: sheetName, rows }])
}

/**
 * تصدير ملف Excel بأكتر من شيت في نفس الوقت (مثلًا: شيت "ملخص" وشيت
 * "التفاصيل" في نفس الملف) — مفيد للتقارير اللي محتاجة تكون منظّمة
 * أكتر من مجرد جدول واحد خام.
 */
export function exportMultiSheetExcel(filename: string, sheets: ExcelSheet[]) {
  const workbook = XLSX.utils.book_new()
  for (const sheet of sheets) {
    const worksheet = XLSX.utils.json_to_sheet(sheet.rows)
    autoFitColumns(worksheet, sheet.rows)
    // اسم الشيت في إكسل أقصى طول مسموح بيه 31 حرف
    XLSX.utils.book_append_sheet(workbook, worksheet, sheet.name.slice(0, 31))
  }
  XLSX.writeFile(workbook, `${filename}.xlsx`)
}
