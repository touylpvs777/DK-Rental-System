export interface ExcelLineItem {
  itemCode?: string
  description: string
  qty: number
  unit: string
  unitPrice: number
  discountPercent: number
  discountAmount: number
  taxPercent: number
  taxAmount: number
  total: number
}

export interface ExcelExportData {
  documentTitle: string
  documentNumber: string
  date: string
  customerName?: string
  currency: string
  items: ExcelLineItem[]
  subtotal: number
  taxTotal: number
  grandTotal: number
}

/**
 * xlsx (SheetJS) is only imported here, dynamically, on export-click — it's a
 * large dependency that shouldn't sit in the app's initial bundle.
 */
export async function exportDocumentToExcel(data: ExcelExportData): Promise<void> {
  const XLSX = await import('xlsx')

  const headerRows = [
    [data.documentTitle],
    [`No.: ${data.documentNumber}`, `Date: ${data.date}`, data.customerName ? `Customer: ${data.customerName}` : ''],
    [],
    ['No', 'Item Code', 'Description', 'Qty', 'Unit', 'Unit Price', 'Discount %', 'Discount Amount', 'Tax %', 'Tax Amount', 'Total'],
  ]

  const itemRows = data.items.map((it, i) => [
    i + 1, it.itemCode ?? '', it.description, it.qty, it.unit,
    it.unitPrice, it.discountPercent, it.discountAmount, it.taxPercent, it.taxAmount, it.total,
  ])

  const footerRows = [
    [],
    ['', '', '', '', '', '', '', '', '', 'Subtotal', data.subtotal],
    ['', '', '', '', '', '', '', '', '', 'Tax', data.taxTotal],
    ['', '', '', '', '', '', '', '', '', 'Grand Total', data.grandTotal],
  ]

  const sheet = XLSX.utils.aoa_to_sheet([...headerRows, ...itemRows, ...footerRows])
  sheet['!cols'] = [
    { wch: 5 }, { wch: 14 }, { wch: 36 }, { wch: 8 }, { wch: 8 },
    { wch: 12 }, { wch: 10 }, { wch: 14 }, { wch: 8 }, { wch: 12 }, { wch: 14 },
  ]

  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, sheet, data.documentTitle.slice(0, 31) || 'Document')
  XLSX.writeFile(workbook, `${data.documentNumber || 'document'}.xlsx`)
}
