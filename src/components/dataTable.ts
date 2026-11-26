/** One column of a KitDataTable. */
export interface KitColumn<T> {
  /** The row's field it shows, and the name of the `cell-<key>` slot that can draw it instead. */
  key: string
  /** Its heading. */
  label: string
  /** Whether the heading is for screen readers alone, as a column of buttons' is. */
  hideLabel?: boolean
  /** Whether its cell names the row, as a screen reader reads with each other cell in it. */
  rowHeader?: boolean
  sortable?: boolean
  /** What it shows as text, where that isn't the row's field: a formatted date, say. */
  text?: (row: T) => string
  /** What it sorts by, where that isn't what it shows: a date's timestamp, say. */
  sortValue?: (row: T) => string | number | null | undefined
  /** Whether the search looks in it; every column does unless it says not. */
  searchable?: boolean
  align?: 'start' | 'center' | 'end'
  /** Its width, as any CSS length; its content's by default, and where a resizable table starts it. */
  width?: string
  /** Whether a filter over the table offers its values, each with how many rows hold it. */
  filter?: boolean
  /** Its values, where a row holds several (its sections, say), for the filter and the search. */
  values?: (row: T) => readonly string[]
  /**
   * Its value in a CSV of the rows: its `text` or the row's field by default, and nothing for a
   * column whose heading is hidden (a column of buttons) unless this says. `false` leaves it out.
   */
  csv?: false | ((row: T) => KitCsvValue)
}

/** A value a CSV cell holds. */
export type KitCsvValue = string | number | boolean | null | undefined

/** One of a column's values, with how many rows hold it: one choice of a table's filter. */
export interface KitFacet {
  value: string
  count: number
}

/** The column a KitDataTable is sorted by, and which way. */
export interface KitSort {
  key: string
  direction: 'ascending' | 'descending'
}

/** A row's field, by name. */
export function fieldOf(row: object, key: string): unknown {
  return (row as Record<string, unknown>)[key]
}

/** A value as the text a cell shows and a search looks in; an object as its JSON. */
export function textOf(value: unknown): string {
  if (value === null || value === undefined) {
    return ''
  }
  if (typeof value === 'string') {
    return value
  }
  if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') {
    return String(value)
  }
  return JSON.stringify(value)
}

/**
 * Two values in the order a person expects: numbers by size, and text by the reader's locale
 * with the numbers inside it by size, so "Shelf 9" comes before "Shelf 10". Nothing sorts last.
 */
export function compareValues(a: unknown, b: unknown): number {
  const aEmpty = a === null || a === undefined || a === ''
  const bEmpty = b === null || b === undefined || b === ''
  if (aEmpty || bEmpty) {
    return Number(aEmpty) - Number(bEmpty)
  }
  if (typeof a === 'number' && typeof b === 'number') {
    return a - b
  }
  return textOf(a).localeCompare(textOf(b), undefined, { numeric: true, sensitivity: 'base' })
}

/**
 * A CSV cell, as RFC 4180 writes one. Words that open with `=`, `+`, `-`, `@`, a tab or a return
 * take a leading apostrophe, which a spreadsheet reads as "this is text" rather than running them
 * as a formula; a number is left as it is, since a negative amount is one.
 */
export function csvCell(value: KitCsvValue): string {
  if (value === null || value === undefined) {
    return ''
  }
  const text = typeof value === 'string' && /^[=+\-@\t\r]/.test(value) ? `'${value}` : String(value)
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

/** A CSV of `rows`, a heading line first, each line ended as RFC 4180 ends one. */
export function toCsv<T>(
  columns: readonly { label: string; value: (row: T) => KitCsvValue }[],
  rows: readonly T[],
): string {
  const lines = [
    columns.map((column) => csvCell(column.label)),
    ...rows.map((row) => columns.map((column) => csvCell(column.value(row)))),
  ]
  return lines.map((line) => `${line.join(',')}\r\n`).join('')
}

/**
 * Saves `csv` as a file named `filename`, which gains `.csv` where it has none. The file starts
 * with a byte-order mark, so a spreadsheet reads it as UTF-8. The link is put in the page for the
 * click, which some browsers ask, and its address let go only after the download has begun.
 */
export function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob([`﻿${csv}`], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename.toLowerCase().endsWith('.csv') ? filename : `${filename}.csv`
  document.body.append(link)
  link.click()
  link.remove()
  setTimeout(() => {
    URL.revokeObjectURL(url)
  }, 1000)
}
