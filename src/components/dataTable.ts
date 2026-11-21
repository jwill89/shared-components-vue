/** One column of a KitDataTable. */
export interface KitColumn<T> {
  /** The row's field it shows, and the name of the `cell-<key>` slot that can draw it instead. */
  key: string
  /** Its heading. */
  label: string
  /** Whether the heading is for screen readers alone, as a column of buttons' is. */
  hideLabel?: boolean
  sortable?: boolean
  /** What it shows as text, where that isn't the row's field: a formatted date, say. */
  text?: (row: T) => string
  /** What it sorts by, where that isn't what it shows: a date's timestamp, say. */
  sortValue?: (row: T) => string | number | null | undefined
  /** Whether the search looks in it; every column does unless it says not. */
  searchable?: boolean
  align?: 'start' | 'center' | 'end'
  /** Its width, as any CSS length; its content's by default. */
  width?: string
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
