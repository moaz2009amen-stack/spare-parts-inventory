import * as XLSX from 'xlsx'

/**
 * تصدير أي مصفوفة بيانات كملف Excel.
 * كل عنصر في rows هو صف، ومفاتيح الـ object هي أسماء الأعمدة
 * (اكتبها بالعربي مباشرة عشان تظهر كعناوين أعمدة في الإكسل).
 */
export function exportToExcel(
  filename: string,
  sheetName: string,
  rows: Record<string, string | number>[]
) {
  const worksheet = XLSX.utils.json_to_sheet(rows)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName)
  XLSX.writeFile(workbook, `${filename}.xlsx`)
}
