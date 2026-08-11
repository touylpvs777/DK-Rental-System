import { useCallback, useMemo, useRef, useState } from 'react'
import {
  useReactTable, getCoreRowModel, flexRender, type ColumnDef,
} from '@tanstack/react-table'
import { Plus, Trash2, Copy, ClipboardPaste, Files, Search } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import './LineItemsGrid.css'

export interface GridRow {
  /** Stable identity for React reconciliation across add/delete/duplicate —
   *  mirrors the `nextKey` counter pattern already used by the document
   *  editor pages so focus doesn't jump mid-edit. */
  _key: number
  [field: string]: unknown
}

export interface GridColumn<T extends GridRow> {
  key: keyof T & string
  header: string
  type: 'text' | 'number' | 'select'
  width?: number
  align?: 'left' | 'right' | 'center'
  options?: { value: string; label: string }[]
  /** Read-only, derived from the row (Discount Amount / Tax Amount / Total). */
  compute?: (row: T) => number | string
  /** Formats a computed/numeric value for display. */
  format?: (value: number) => string
}

interface LineItemsGridProps<T extends GridRow> {
  columns: GridColumn<T>[]
  rows: T[]
  onRowsChange: (rows: T[]) => void
  createEmptyRow: () => T
  readOnly?: boolean
  /** Column key used by the lightweight text filter (e.g. description). */
  filterKey?: keyof T & string
}

function parseCellValue(raw: string, type: GridColumn<GridRow>['type']): unknown {
  if (type === 'number') {
    const n = Number(raw)
    return Number.isFinite(n) ? n : 0
  }
  return raw
}

export default function LineItemsGrid<T extends GridRow>({
  columns, rows, onRowsChange, createEmptyRow, readOnly = false, filterKey,
}: LineItemsGridProps<T>) {
  const { t } = useTranslation()
  const [filterText, setFilterText] = useState('')
  const [rowClipboard, setRowClipboard] = useState<T | null>(null)
  const cellRefs = useRef(new Map<string, HTMLInputElement | HTMLSelectElement>())

  const columnDefs = useMemo<ColumnDef<T>[]>(
    () => columns.map((col) => ({ id: col.key, header: col.header, size: col.width ?? 140 })),
    [columns],
  )

  const table = useReactTable({
    data: rows,
    columns: columnDefs,
    getCoreRowModel: getCoreRowModel(),
    columnResizeMode: 'onChange',
  })

  const visibleIndexes = useMemo(() => {
    if (!filterText.trim() || !filterKey) return rows.map((_, i) => i)
    const needle = filterText.trim().toLowerCase()
    return rows
      .map((r, i) => ({ r, i }))
      .filter(({ r }) => String(r[filterKey] ?? '').toLowerCase().includes(needle))
      .map(({ i }) => i)
  }, [rows, filterText, filterKey])

  const updateCell = useCallback((rowIndex: number, key: string, value: unknown) => {
    const next = rows.slice()
    next[rowIndex] = { ...next[rowIndex], [key]: value }
    onRowsChange(next)
  }, [rows, onRowsChange])

  const addRow = useCallback(() => {
    onRowsChange([...rows, createEmptyRow()])
  }, [rows, onRowsChange, createEmptyRow])

  const deleteRow = useCallback((rowIndex: number) => {
    if (rows.length <= 1) return
    onRowsChange(rows.filter((_, i) => i !== rowIndex))
  }, [rows, onRowsChange])

  const duplicateRow = useCallback((rowIndex: number) => {
    const clone = { ...rows[rowIndex], _key: createEmptyRow()._key }
    const next = rows.slice()
    next.splice(rowIndex + 1, 0, clone)
    onRowsChange(next)
  }, [rows, onRowsChange, createEmptyRow])

  const copyRow = useCallback((rowIndex: number) => {
    setRowClipboard(rows[rowIndex])
  }, [rows])

  const pasteRowAfter = useCallback((rowIndex: number) => {
    if (!rowClipboard) return
    const clone = { ...rowClipboard, _key: createEmptyRow()._key }
    const next = rows.slice()
    next.splice(rowIndex + 1, 0, clone)
    onRowsChange(next)
  }, [rows, rowClipboard, onRowsChange, createEmptyRow])

  const focusCell = (rowIndex: number, colIndex: number) => {
    const el = cellRefs.current.get(`${rowIndex}-${colIndex}`)
    el?.focus()
  }

  const editableColIndexes = columns
    .map((c, i) => (c.compute === undefined ? i : -1))
    .filter((i) => i >= 0)

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement | HTMLSelectElement>, rowIndex: number, colIndex: number) => {
    const input = e.currentTarget as HTMLInputElement
    const atStart = input.selectionStart === 0 && input.selectionEnd === 0
    const atEnd = input.selectionStart === input.value.length && input.selectionEnd === input.value.length

    if (e.key === 'Enter') {
      e.preventDefault()
      if (rowIndex === rows.length - 1) {
        onRowsChange([...rows, createEmptyRow()])
        // Focus after the new row renders.
        requestAnimationFrame(() => focusCell(rowIndex + 1, colIndex))
      } else {
        focusCell(rowIndex + 1, colIndex)
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (rowIndex < rows.length - 1) focusCell(rowIndex + 1, colIndex)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      if (rowIndex > 0) focusCell(rowIndex - 1, colIndex)
    } else if (e.key === 'ArrowRight' && (input.tagName !== 'INPUT' || atEnd)) {
      const nextCol = editableColIndexes[editableColIndexes.indexOf(colIndex) + 1]
      if (nextCol !== undefined) {
        e.preventDefault()
        focusCell(rowIndex, nextCol)
      }
    } else if (e.key === 'ArrowLeft' && (input.tagName !== 'INPUT' || atStart)) {
      const idx = editableColIndexes.indexOf(colIndex)
      const prevCol = idx > 0 ? editableColIndexes[idx - 1] : undefined
      if (prevCol !== undefined) {
        e.preventDefault()
        focusCell(rowIndex, prevCol)
      }
    }
  }

  /** Excel-style multi-row/multi-column paste: pastes tab/newline-delimited
   *  clipboard text starting at the focused cell, extending the row count
   *  if the pasted block overflows past the last row. */
  const handlePaste = (e: React.ClipboardEvent, rowIndex: number, colIndex: number) => {
    const text = e.clipboardData.getData('text/plain')
    if (!text.includes('\t') && !text.includes('\n')) return // let native single-value paste happen
    e.preventDefault()

    const grid = text.replace(/\r/g, '').split('\n').filter((_, i, arr) => !(i === arr.length - 1 && arr[i] === ''))
      .map((line) => line.split('\t'))

    let next = rows.slice()
    grid.forEach((lineCells, rOffset) => {
      const targetRow = rowIndex + rOffset
      while (targetRow >= next.length) next.push(createEmptyRow())
      lineCells.forEach((cellText, cOffset) => {
        const targetCol = editableColIndexes[editableColIndexes.indexOf(colIndex) + cOffset]
        if (targetCol === undefined) return
        const col = columns[targetCol]
        next[targetRow] = { ...next[targetRow], [col.key]: parseCellValue(cellText, col.type) }
      })
    })
    onRowsChange(next)
  }

  return (
    <div className="grid-wrap">
      {filterKey && (
        <div className="grid-filter">
          <Search size={14} className="grid-filter-icon" />
          <input
            className="grid-filter-input"
            placeholder={t('lineItemsGrid.filterPlaceholder')}
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
          />
        </div>
      )}

      <div className="grid-scroll">
        <table className="grid-table" style={{ width: table.getTotalSize() + (readOnly ? 60 : 110) }}>
          <thead className="grid-thead">
            <tr>
              <th className="grid-th grid-th-no">{t('lineItemsGrid.no')}</th>
              {table.getHeaderGroups()[0].headers.map((header) => (
                <th key={header.id} className="grid-th" style={{ width: header.getSize(), position: 'relative' }}>
                  {flexRender(header.column.columnDef.header, header.getContext())}
                  <div
                    className={`grid-resizer${header.column.getIsResizing() ? ' is-resizing' : ''}`}
                    onMouseDown={header.getResizeHandler()}
                    onTouchStart={header.getResizeHandler()}
                  />
                </th>
              ))}
              {!readOnly && <th className="grid-th grid-th-actions">{t('lineItemsGrid.actions')}</th>}
            </tr>
          </thead>
          <tbody>
            {visibleIndexes.map((rowIndex) => {
              const row = rows[rowIndex]
              return (
                <tr key={row._key}>
                  <td className="grid-td grid-td-no">{rowIndex + 1}</td>
                  {columns.map((col, colIndex) => {
                    const isComputed = !!col.compute
                    const rawValue = isComputed ? col.compute!(row) : row[col.key]
                    const displayValue = typeof rawValue === 'number' && col.format ? col.format(rawValue) : String(rawValue ?? '')

                    if (isComputed || readOnly) {
                      return (
                        <td key={col.key} className={`grid-td grid-td-computed grid-align-${col.align ?? 'left'}`}>
                          {displayValue}
                        </td>
                      )
                    }

                    return (
                      <td key={col.key} className={`grid-td grid-align-${col.align ?? 'left'}`}>
                        {col.type === 'select' ? (
                          <select
                            ref={(el) => { if (el) cellRefs.current.set(`${rowIndex}-${colIndex}`, el); else cellRefs.current.delete(`${rowIndex}-${colIndex}`) }}
                            className="grid-cell-input"
                            value={String(row[col.key] ?? '')}
                            onChange={(e) => updateCell(rowIndex, col.key, e.target.value)}
                            onKeyDown={(e) => handleKeyDown(e, rowIndex, colIndex)}
                          >
                            {col.options?.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                          </select>
                        ) : (
                          <input
                            ref={(el) => { if (el) cellRefs.current.set(`${rowIndex}-${colIndex}`, el); else cellRefs.current.delete(`${rowIndex}-${colIndex}`) }}
                            className={`grid-cell-input grid-align-${col.align ?? 'left'}`}
                            type={col.type === 'number' ? 'number' : 'text'}
                            step={col.type === 'number' ? 'any' : undefined}
                            value={String(row[col.key] ?? '')}
                            onChange={(e) => updateCell(rowIndex, col.key, parseCellValue(e.target.value, col.type))}
                            onKeyDown={(e) => handleKeyDown(e, rowIndex, colIndex)}
                            onPaste={(e) => handlePaste(e, rowIndex, colIndex)}
                          />
                        )}
                      </td>
                    )
                  })}
                  {!readOnly && (
                    <td className="grid-td grid-td-actions">
                      <button type="button" className="grid-icon-btn" title={t('lineItemsGrid.copyRow')} onClick={() => copyRow(rowIndex)}>
                        <Copy size={14} />
                      </button>
                      <button type="button" className="grid-icon-btn" title={t('lineItemsGrid.pasteRow')} disabled={!rowClipboard} onClick={() => pasteRowAfter(rowIndex)}>
                        <ClipboardPaste size={14} />
                      </button>
                      <button type="button" className="grid-icon-btn" title={t('lineItemsGrid.duplicateRow')} onClick={() => duplicateRow(rowIndex)}>
                        <Files size={14} />
                      </button>
                      <button
                        type="button"
                        className="grid-icon-btn grid-icon-btn-danger"
                        title={t('lineItemsGrid.deleteRow')}
                        disabled={rows.length <= 1}
                        onClick={() => deleteRow(rowIndex)}
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  )}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {!readOnly && (
        <button type="button" className="btn btn-ghost grid-add-row-btn" onClick={addRow}>
          <Plus size={14} /> {t('lineItemsGrid.addRow')}
        </button>
      )}
    </div>
  )
}
