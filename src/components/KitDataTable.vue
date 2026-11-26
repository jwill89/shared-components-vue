<script setup lang="ts" generic="T extends object">
// The one table a list of records sits in. Given the whole list, it searches, filters, sorts and
// pages it itself, in that order, so a sort orders every row and not only the page on screen.
// Given one page the server made (`total`, the count of every row), it leaves all of that to the
// server and says, through its models, what to fetch; a list that does so records it as a
// departure. Search, filters, sort and page are models the page keeps in its address, and a new
// search, filter or sort starts at page one.
//
// A sortable column's heading is a button, and the heading says which way it sorts (`aria-sort`);
// a press sorts ascending, then descending, then, where `clearableSort`, as the list came. Each
// cell is the row's field as text, or its column's `text`, or the `cell-<key>` slot's. A table
// wider than its panel scrolls inside it, and the frame takes focus then, so the keyboard can
// scroll it too. Loading, failed, empty and nothing matching are four states, each in the rows'
// place under the headings, their icons from the slots; a list read again while it has rows keeps
// them, marked busy, with a line that says so. A column marked `rowHeader` names each row, its cells
// row headings a screen reader reads with the others. `selectable` adds a box to each row, and one
// that selects every row the search matches, on every page.
//
// Each of the rest is asked for:
// - A `detail` slot opens a row to show more under it, by a button of its own in the row's first
//   cell (`v-model:expanded`, the keys of the rows open).
// - A column marked `filter` offers its values over the table, each with how many rows hold it
//   among those the search and the other filters leave (`v-model:filters`); a column whose rows
//   hold several values gives them as `values`. A choice no row holds any more lets go.
// - `groupBy` keeps rows that share a field together, under a heading row of their own, and sorts
//   within each group.
// - `csv`, the file's name, adds a button that saves every row matching as a CSV, in the order
//   shown, each column as its `csv` or its text. With a server's page it asks the page instead
//   (`download`), which fetches every row and hands them to `exportCsv(rows)`, the same columns.
// - `resizable` lets each column be widened or narrowed by dragging its edge, by the arrow keys on
//   it, or by a press in the "Column widths" panel (`v-model:widths`, in pixels).
// - `stackBelow` turns each row into a card, every cell under its heading's name, where the table
//   is narrower than that length.
import {
  computed,
  onBeforeUnmount,
  onMounted,
  ref,
  useId,
  useSlots,
  useTemplateRef,
  watch,
} from 'vue'
import {
  columnFilteringFeature,
  createFilteredRowModel,
  createPaginatedRowModel,
  createSortedRowModel,
  globalFilteringFeature,
  rowPaginationFeature,
  rowSortingFeature,
  tableFeatures,
  useTable,
} from '@tanstack/vue-table'
import type { ColumnDef, ColumnFiltersState, SortingState } from '@tanstack/vue-table'
import KitButton from './KitButton.vue'
import KitEmptyState from './KitEmptyState.vue'
import KitErrorState from './KitErrorState.vue'
import KitFormField from './KitFormField.vue'
import KitGlyph from './KitGlyph.vue'
import KitLoadingState from './KitLoadingState.vue'
import KitPagination from './KitPagination.vue'
import KitPopover from './KitPopover.vue'
import KitSelect from './KitSelect.vue'
import KitSpinner from './KitSpinner.vue'
import KitTextField from './KitTextField.vue'
import { compareValues, downloadCsv, fieldOf, textOf, toCsv } from './dataTable'
import type { KitColumn, KitCsvValue, KitFacet, KitSort } from './dataTable'
import { filled } from './slots'

const props = withDefaults(
  defineProps<{
    rows: T[]
    columns: KitColumn<T>[]
    /** A row's own key: the name of its field, or what gives it. */
    rowKey: string | ((row: T) => string | number)
    /** What the table holds, which names it: "Books". */
    label: string
    /** Rows on a page; every row on one page by default. */
    pageSize?: number
    /** With a server's page: how many rows there are in all. */
    total?: number
    /** With a server's page: each filtered column's values and their counts, as the server made them. */
    facets?: Readonly<Record<string, readonly KitFacet[]>>
    /** Whether it has a search box over it. */
    searchable?: boolean
    /** How a row matches what was searched, lowercased; its columns' text by default. */
    matches?: (row: T, query: string) => boolean
    /** Whether a third press on a heading puts the rows back as they came. */
    clearableSort?: boolean
    selectable?: boolean
    /** What a row is called, for its selection box: "Select Dune". Its first column by default. */
    rowLabel?: (row: T) => string
    /** The field that rows sharing it are kept together by, under a heading row. */
    groupBy?: string
    /** The CSV's file name, which adds the button that saves the rows matching as one. */
    csv?: string
    /** Whether a column's width can be changed. */
    resizable?: boolean
    /** The width, as a CSS length in `px`, `rem` or `em`, below which each row shows as a card. */
    stackBelow?: string
    loading?: boolean
    /** Why the list couldn't load, in the server's words; it is failed while this is set. */
    error?: string
    loadingLabel?: string
    errorTitle?: string
    emptyTitle?: string
    /** A line under the empty state's title, on what goes here or how to add the first. */
    emptyMessage?: string
    noMatchTitle?: string
    /** A line under the nothing-matching state's title, on what to search for instead. */
    noMatchMessage?: string
    searchLabel?: string
    /** What a filter offers for no choice: "Any". */
    anyText?: string
    /** What a group's heading says for rows with nothing in the field. */
    noGroupText?: string
    /** What the CSV button says. */
    csvLabel?: string
    /** What the button that opens the column widths says. */
    widthsLabel?: string
    /** What the column of buttons that open a row's detail is called, to a screen reader. */
    detailLabel?: string
    /** What the table's pages are, as their navigation is named; "Pages of" its label by default. */
    pagesLabel?: string
    /** What the count over the table says, given the rows matching and the rows in all. */
    countText?: (matching: number, total: number) => string
  }>(),
  {
    pageSize: undefined,
    total: undefined,
    facets: undefined,
    searchable: false,
    matches: undefined,
    clearableSort: false,
    selectable: false,
    rowLabel: undefined,
    groupBy: undefined,
    csv: undefined,
    resizable: false,
    stackBelow: undefined,
    loading: false,
    error: undefined,
    loadingLabel: 'Loading…',
    errorTitle: 'Couldn’t load the list',
    emptyTitle: 'Nothing here yet',
    emptyMessage: undefined,
    noMatchTitle: 'Nothing matches the search',
    noMatchMessage: undefined,
    searchLabel: 'Search',
    anyText: 'Any',
    noGroupText: 'None',
    csvLabel: 'Download as CSV',
    widthsLabel: 'Column widths',
    detailLabel: 'Details',
    pagesLabel: undefined,
    countText: (matching: number, total: number) => `${String(matching)} of ${String(total)}`,
  },
)

const emit = defineEmits<{
  /** The failed list's Try again was pressed. */
  retry: []
  /** With a server's page, the CSV button was pressed: the page fetches the rows for `exportCsv`. */
  download: []
}>()

const search = defineModel<string>('search', { default: '' })
const sort = defineModel<KitSort | null>('sort', { default: null })
const page = defineModel<number>('page', { default: 1 })
const selected = defineModel<(string | number)[]>('selected', { default: () => [] })
/** Each filtered column's choice, by its key; none, or "", is any. */
const filters = defineModel<Record<string, string>>('filters', { default: () => ({}) })
/** The keys of the rows whose detail is open. */
const expanded = defineModel<(string | number)[]>('expanded', { default: () => [] })
/** Each column's width in pixels, by its key, once it has been changed. */
const widths = defineModel<Record<string, number>>('widths', { default: () => ({}) })

defineSlots<
  {
    /** What the table says when the list is empty, in place of the kit's empty state. */
    empty?: () => unknown
    /** A row of totals, or anything else under the rows: `<tr>`s. */
    foot?: () => unknown
    /** The icon that says which way a column sorts, given the way or none. */
    'sort-icon'?: (props: { direction: KitSort['direction'] | null }) => unknown
    /** The icons of the empty, nothing-matching and failed states, the kit's by default. */
    'empty-icon'?: () => unknown
    'no-match-icon'?: () => unknown
    'error-icon'?: () => unknown
    /** What a row shows under it when it is opened, which makes rows open. */
    detail?: (props: { row: T }) => unknown
    /** The icon of a row's button that opens it, given whether it is open. */
    'expand-icon'?: (props: { open: boolean }) => unknown
    /** A group's heading, given its value and its rows on the page. */
    group?: (props: { value: string; rows: T[] }) => unknown
    /** The CSV button's icon. */
    'csv-icon'?: () => unknown
  } & Record<string, ((props: { row: T; value: unknown }) => unknown) | undefined>
>()

const slots = useSlots()
const fromServer = computed(() => props.total !== undefined)

function keyOf(row: T): string | number {
  if (typeof props.rowKey === 'function') {
    return props.rowKey(row)
  }
  const key = fieldOf(row, props.rowKey)
  return typeof key === 'number' ? key : textOf(key)
}

function cellText(column: KitColumn<T>, row: T): string {
  return column.text ? column.text(row) : textOf(fieldOf(row, column.key))
}

/** A column's values in a row: its own list where it gives one, else its text. */
function valuesOf(column: KitColumn<T>, row: T): readonly string[] {
  return column.values ? column.values(row) : [cellText(column, row)]
}

function columnOf(key: string): KitColumn<T> | undefined {
  return props.columns.find((column) => column.key === key)
}

/** Whether a row matches what was searched, lowercased. */
function searchHit(row: T, query: string): boolean {
  if (!query) {
    return true
  }
  if (props.matches) {
    return props.matches(row, query)
  }
  return props.columns.some(
    (column) =>
      column.searchable !== false &&
      [cellText(column, row), ...(column.values?.(row) ?? [])].some((text) =>
        text.toLowerCase().includes(query),
      ),
  )
}

// -- Filters --------------------------------------------------------------------------------------
const filterColumns = computed(() => props.columns.filter((column) => column.filter))

/** The filters with a choice, each by its column. */
const chosenFilters = computed(() =>
  filterColumns.value.flatMap((column) => {
    const value = filters.value[column.key] ?? ''
    return value ? [{ column, value }] : []
  }),
)

/** Whether a row holds each filter's choice, but `except`'s. */
function filtersHit(row: T, except?: string): boolean {
  return chosenFilters.value.every(
    ({ column, value }) => column.key === except || valuesOf(column, row).includes(value),
  )
}

const query = computed(() => search.value.trim().toLowerCase())

/**
 * Each filtered column's values, with how many rows hold each among those the search and the other
 * filters leave, most held first; from the server, as it made them.
 */
const facets = computed<Readonly<Record<string, readonly KitFacet[]>>>(() => {
  if (fromServer.value) {
    return props.facets ?? {}
  }
  return Object.fromEntries(
    filterColumns.value.map((column) => {
      const counts = new Map<string, number>()
      for (const row of props.rows) {
        if (searchHit(row, query.value) && filtersHit(row, column.key)) {
          for (const value of new Set(valuesOf(column, row))) {
            if (value) {
              counts.set(value, (counts.get(value) ?? 0) + 1)
            }
          }
        }
      }
      const shown = [...counts].map(([value, count]) => ({ value, count }))
      shown.sort((a, b) => b.count - a.count || compareValues(a.value, b.value))
      return [column.key, shown]
    }),
  )
})

// A select keeps "" for nothing chosen, so Any takes a value no row's can be.
const ANY = '\u0000'

function filterOptions(column: KitColumn<T>): { value: string; label: string }[] {
  return [
    { value: ANY, label: props.anyText },
    ...(facets.value[column.key] ?? []).map((facet) => ({
      value: facet.value,
      label: `${facet.value} (${String(facet.count)})`,
    })),
  ]
}

function choose(column: KitColumn<T>, value: string | number | undefined): void {
  const chosen = value === ANY || value === undefined ? '' : String(value)
  filters.value = { ...filters.value, [column.key]: chosen }
}

// A choice that no row holds any more, once the list has loaded, lets go: a filter that leaves
// nothing would show an empty table with no reason on screen.
watch(facets, (all) => {
  if (fromServer.value || props.loading || props.rows.length === 0) {
    return
  }
  for (const { column, value } of chosenFilters.value) {
    if (!all[column.key]?.some((facet) => facet.value === value)) {
      choose(column, ANY)
    }
  }
})

// -- The pipeline ---------------------------------------------------------------------------------
// Search, filters, sort and page; TanStack Table's row models do the work, and the markup is the
// kit's own. Global filtering, the search, rests on column filtering, which TanStack asks for
// beside it, and which the filters use too.
const features = tableFeatures({
  columnFilteringFeature,
  globalFilteringFeature,
  rowSortingFeature,
  rowPaginationFeature,
  filteredRowModel: createFilteredRowModel(),
  sortedRowModel: createSortedRowModel(),
  paginatedRowModel: createPaginatedRowModel(),
})

/** The value rows are grouped by. */
function groupValue(row: T): string {
  const key = props.groupBy ?? ''
  const column = columnOf(key)
  return column ? cellText(column, row) : textOf(fieldOf(row, key))
}

const definitions = computed<ColumnDef<typeof features, T>[]>(() => {
  const own: ColumnDef<typeof features, T>[] = props.columns.map((column) => ({
    id: column.key,
    accessorFn: (row: T) => (column.sortValue ? column.sortValue(row) : cellText(column, row)),
    // The group's own column sorts the groups, whether or not a person may sort by it.
    enableSorting: Boolean(column.sortable) || column.key === props.groupBy,
    sortDescFirst: false,
    sortFn: (a, b, id) => compareValues(a.getValue(id), b.getValue(id)),
    filterFn: (row, _id, value: string) => valuesOf(column, row.original).includes(value),
  }))
  // A group's field that no column shows still sorts the rows into their groups.
  const key = props.groupBy
  return key && !columnOf(key)
    ? [
        ...own,
        {
          id: key,
          accessorFn: groupValue,
          enableSorting: true,
          sortFn: (a, b, id) => compareValues(a.getValue(id), b.getValue(id)),
        },
      ]
    : own
})

// A copy remade whenever the rows change: TanStack looks only at whether the array is a new one,
// so rows pushed into the same array would otherwise never show.
const data = computed(() => props.rows.slice())

// Grouped, the rows sort by their group first, and by the column chosen within it.
const sorting = computed<SortingState>(() => {
  const chosen = sort.value
    ? [{ id: sort.value.key, desc: sort.value.direction === 'descending' }]
    : []
  const key = props.groupBy
  return key && sort.value?.key !== key ? [{ id: key, desc: false }, ...chosen] : chosen
})

const columnFilters = computed<ColumnFiltersState>(() =>
  chosenFilters.value.map(({ column, value }) => ({ id: column.key, value })),
)

const table = useTable<typeof features, T>({
  features,
  get data() {
    return data.value
  },
  get columns() {
    return definitions.value
  },
  state: {
    get sorting() {
      return sorting.value
    },
    get globalFilter() {
      return query.value
    },
    get columnFilters() {
      return columnFilters.value
    },
    get pagination() {
      return {
        pageIndex: Math.max(0, page.value - 1),
        pageSize: props.pageSize ?? Number.MAX_SAFE_INTEGER,
      }
    },
  },
  get manualFiltering() {
    return fromServer.value
  },
  get manualSorting() {
    return fromServer.value
  },
  get manualPagination() {
    return fromServer.value
  },
  get rowCount() {
    return props.total
  },
  getRowId: (row) => String(keyOf(row)),
  globalFilterFn: (row, _column, typed: string) => searchHit(row.original, typed),
})

/** Every row the search and the filters match, in the order shown, on every page. */
const matching = computed(() => table.getSortedRowModel().rows.map((row) => row.original))
/** The rows on the page shown. */
const shown = computed(() => table.getRowModel().rows.map((row) => row.original))
const rowCount = computed(() => props.total ?? matching.value.length)
const pageCount = computed(() =>
  props.pageSize ? Math.max(1, Math.ceil(rowCount.value / props.pageSize)) : 1,
)

// A new search, filter, sort or page size starts at page one; otherwise a page past the end comes
// back to the last, as a list that shrinks leaves it. One watcher decides, since the page is the
// page's to keep and still reads as it was until the page passes the new one back. Nothing is
// clamped while the list loads or is empty, so a page restored from the address waits for its rows.
const view = computed(
  () =>
    `${query.value}|${JSON.stringify(columnFilters.value)}|${sort.value?.key ?? ''}:${sort.value?.direction ?? ''}|${String(props.pageSize)}`,
)
function clamp(count: number): void {
  if (!props.loading && rowCount.value > 0 && page.value > count) {
    page.value = count
  }
}
watch([view, pageCount], ([nextView, count], [lastView]) => {
  if (nextView !== lastView) {
    page.value = 1
  } else {
    clamp(count)
  }
})
clamp(pageCount.value)

type Shows = 'loading' | 'failed' | 'empty' | 'no-match' | 'rows'
const shows = computed<Shows>(() => {
  if (props.loading && shown.value.length === 0) {
    return 'loading'
  }
  if (props.error !== undefined) {
    return 'failed'
  }
  if (shown.value.length > 0) {
    return 'rows'
  }
  return query.value === '' && chosenFilters.value.length === 0 ? 'empty' : 'no-match'
})

/** A list read again while it has rows: they stay, and a line says it is loading. */
const reloading = computed(() => props.loading && shows.value === 'rows')

/** The rows on the page, in their groups: each run of rows that share a group's value. */
const groups = computed(() => {
  if (!props.groupBy) {
    return [{ key: 'all', value: '', rows: shown.value }]
  }
  const runs: { key: string; value: string; rows: T[] }[] = []
  for (const row of shown.value) {
    const value = groupValue(row)
    const last = runs.at(-1)
    if (last?.value === value) {
      last.rows.push(row)
    } else {
      runs.push({ key: `${String(runs.length)}-${value}`, value, rows: [row] })
    }
  }
  return runs
})

// -- Sorting ----------------------------------------------------------------------------------------
// A press goes ascending, then descending, then back to as the list came or round.
function sortedBy(column: KitColumn<T>): KitSort['direction'] | null {
  return sort.value?.key === column.key ? sort.value.direction : null
}

function toggleSort(column: KitColumn<T>): void {
  const now = sortedBy(column)
  if (now === 'ascending') {
    sort.value = { key: column.key, direction: 'descending' }
  } else if (now === 'descending' && props.clearableSort) {
    sort.value = null
  } else {
    sort.value = { key: column.key, direction: 'ascending' }
  }
}

function sortGlyph(
  direction: KitSort['direction'] | null,
): 'sort' | 'sort-ascending' | 'sort-descending' {
  return direction ? `sort-${direction}` : 'sort'
}

// -- Selection, of every row the search matches, across the pages ---------------------------------
const chosen = computed(() => new Set(selected.value))
const allChosen = computed(
  () => matching.value.length > 0 && matching.value.every((row) => chosen.value.has(keyOf(row))),
)
const someChosen = computed(
  () => !allChosen.value && matching.value.some((row) => chosen.value.has(keyOf(row))),
)

function nameOf(row: T): string {
  if (props.rowLabel) {
    return props.rowLabel(row)
  }
  const named = props.columns.find((column) => column.rowHeader) ?? props.columns[0]
  return named ? cellText(named, row) : String(keyOf(row))
}

function toggleRow(row: T): void {
  const key = keyOf(row)
  selected.value = chosen.value.has(key)
    ? selected.value.filter((kept) => kept !== key)
    : [...selected.value, key]
}

function toggleAll(): void {
  const keys = matching.value.map((row) => keyOf(row))
  if (allChosen.value) {
    const dropped = new Set(keys)
    selected.value = selected.value.filter((kept) => !dropped.has(kept))
  } else {
    selected.value = [...new Set([...selected.value, ...keys])]
  }
}

// -- Rows that open -------------------------------------------------------------------------------
const tableId = useId()
const expandable = computed(() => slots.detail !== undefined)
const open = computed(() => new Set(expanded.value))

function toggleOpen(row: T): void {
  const key = keyOf(row)
  expanded.value = open.value.has(key)
    ? expanded.value.filter((kept) => kept !== key)
    : [...expanded.value, key]
}

function detailId(row: T): string {
  return `${tableId}-detail-${String(keyOf(row)).replace(/[^\w-]/g, '_')}`
}

// -- CSV ----------------------------------------------------------------------------------------------
/** A field as a CSV cell takes it: a number stays one, and anything else is its text. */
function csvValue(value: unknown): KitCsvValue {
  return typeof value === 'number' || typeof value === 'boolean' ? value : textOf(value)
}

/** The columns a CSV holds: each but those that say not, and a column of buttons unless it says. */
const csvColumns = computed(() =>
  props.columns.flatMap((column) => {
    const own = column.csv
    if (own === false || (!own && column.hideLabel)) {
      return []
    }
    return [
      {
        label: column.label,
        value: (row: T): KitCsvValue =>
          own ? own(row) : column.text ? column.text(row) : csvValue(fieldOf(row, column.key)),
      },
    ]
  }),
)

/** Saves every row the search and the filters match, in the order shown, as a CSV. */
/** Saves `rows`, every row matching unless told, as the CSV button does. */
function exportCsv(rows: readonly T[] = matching.value, filename = props.csv ?? props.label): void {
  downloadCsv(filename, toCsv(csvColumns.value, rows))
}

function pressCsv(): void {
  if (fromServer.value) {
    emit('download')
  } else {
    exportCsv()
  }
}

defineExpose({ exportCsv })

// -- Column widths --------------------------------------------------------------------------------
// Each heading holds its edge, a separator named "Width of" the column. A heading is named from
// what it holds, its edge's name too, so while the edge is drawn the heading takes its label as
// its own name, and a cell under it is read with "Title", not "Title Width of Title".
const MIN_WIDTH = 48
const STEP = 16
const headings = new Map<string, HTMLElement>()
/** Each heading's width as drawn, for its edge to say. */
const drawn = ref<Record<string, number>>({})

function keepHeading(key: string, element: unknown): void {
  if (element instanceof HTMLElement) {
    headings.set(key, element)
  } else {
    headings.delete(key)
  }
}

function widthOf(column: KitColumn<T>): number {
  return widths.value[column.key] ?? drawn.value[column.key] ?? MIN_WIDTH
}

function setWidth(column: KitColumn<T>, width: number): void {
  widths.value = { ...widths.value, [column.key]: Math.max(MIN_WIDTH, Math.round(width)) }
}

function resetWidth(column: KitColumn<T>): void {
  widths.value = Object.fromEntries(
    Object.entries(widths.value).filter(([key]) => key !== column.key),
  )
}

function headingStyle(column: KitColumn<T>): Record<string, string> | undefined {
  const width = widths.value[column.key]
  if (width !== undefined) {
    return { width: `${String(width)}px`, minWidth: `${String(width)}px` }
  }
  return column.width ? { width: column.width } : undefined
}

/** Which way the inline end lies: a drag or an arrow toward it widens the column. */
function towardEnd(element: Element): number {
  return getComputedStyle(element).direction === 'rtl' ? -1 : 1
}

/** A drag of a column's edge, from its width as drawn. */
function startResize(column: KitColumn<T>, event: PointerEvent): void {
  const edge = event.currentTarget as HTMLElement
  const from = event.clientX
  const start = headings.get(column.key)?.getBoundingClientRect().width ?? widthOf(column)
  const way = towardEnd(edge)
  event.preventDefault()
  edge.setPointerCapture(event.pointerId)
  const move = (moved: PointerEvent): void => {
    setWidth(column, start + (moved.clientX - from) * way)
  }
  const stop = (): void => {
    edge.removeEventListener('pointermove', move)
    edge.removeEventListener('pointerup', stop)
    edge.removeEventListener('pointercancel', stop)
  }
  edge.addEventListener('pointermove', move)
  edge.addEventListener('pointerup', stop)
  edge.addEventListener('pointercancel', stop)
}

/** The arrow keys on a column's edge widen or narrow it, Shift by more; Home puts it back. */
function resizeByKey(column: KitColumn<T>, event: KeyboardEvent): void {
  const step = (event.shiftKey ? STEP * 4 : STEP) * towardEnd(event.currentTarget as Element)
  if (event.key === 'ArrowRight') {
    setWidth(column, widthOf(column) + step)
  } else if (event.key === 'ArrowLeft') {
    setWidth(column, widthOf(column) - step)
  } else if (event.key === 'Home') {
    resetWidth(column)
  } else {
    return
  }
  event.preventDefault()
}

// -- The frame: whether it scrolls, and whether the rows show as cards -----------------------------
const root = useTemplateRef<HTMLElement>('root')
const frame = useTemplateRef<HTMLElement>('frame')
const scrolls = ref(false)
const width = ref(Number.POSITIVE_INFINITY)

/** `stackBelow` in pixels, from `px`, or `rem` and `em` at the page's own size. */
const stackAt = computed(() => {
  const found = /^(\d*\.?\d+)(px|rem|em)?$/.exec(props.stackBelow?.trim() ?? '')
  if (!found) {
    return null
  }
  const size = Number(found[1])
  return found[2] === 'px' || !found[2]
    ? size
    : size * Number.parseFloat(getComputedStyle(document.documentElement).fontSize)
})
const stacked = computed(() => stackAt.value !== null && width.value < stackAt.value)

let watcher: ResizeObserver | undefined
function measure(): void {
  const box = frame.value
  scrolls.value = box ? box.scrollWidth > box.clientWidth : false
  width.value = root.value?.clientWidth ?? Number.POSITIVE_INFINITY
  drawn.value = Object.fromEntries(
    [...headings].map(([key, heading]) => [key, Math.round(heading.getBoundingClientRect().width)]),
  )
}
onMounted(() => {
  measure()
  watcher = new ResizeObserver(measure)
  for (const watched of [root.value, frame.value]) {
    if (watched) {
      watcher.observe(watched)
    }
  }
})
onBeforeUnmount(() => {
  watcher?.disconnect()
})

const searchId = useId()
const columnSpan = computed(
  () => props.columns.length + (props.selectable ? 1 : 0) + (expandable.value ? 1 : 0),
)
const hasToolbar = computed(
  () =>
    props.searchable ||
    filterColumns.value.length > 0 ||
    props.csv !== undefined ||
    (props.resizable && !stacked.value),
)

/** A table part's role, written out where the rows are cards, which takes the table's own away. */
function role(name: string): string | undefined {
  return stacked.value ? name : undefined
}
</script>

<template>
  <div ref="root" class="kit-data-table" :class="{ 'is-stacked': stacked }">
    <div v-if="hasToolbar" class="kit-data-table__toolbar">
      <div v-if="searchable" class="kit-data-table__search">
        <label :for="searchId" class="kit-data-table__search-label">{{ searchLabel }}</label>
        <KitTextField :id="searchId" v-model="search" type="search" autocomplete="off" />
      </div>
      <KitFormField
        v-for="column in filterColumns"
        :key="column.key"
        v-slot="field"
        class="kit-data-table__filter"
        :label="column.label"
      >
        <KitSelect
          v-bind="field"
          :model-value="filters[column.key] || ANY"
          :options="filterOptions(column)"
          @update:model-value="choose(column, $event)"
        />
      </KitFormField>
      <div class="kit-data-table__actions">
        <KitButton
          v-if="csv !== undefined"
          :disabled="!fromServer && matching.length === 0"
          @click="pressCsv"
        >
          <template v-if="filled($slots['csv-icon'])" #icon><slot name="csv-icon" /></template>
          {{ csvLabel }}
        </KitButton>
        <KitPopover v-if="resizable && !stacked" align="end">
          <template #trigger>
            <KitButton>{{ widthsLabel }}</KitButton>
          </template>
          <ul class="kit-data-table__widths">
            <li v-for="column in columns" :key="column.key" class="kit-data-table__width">
              <span class="kit-data-table__width-name">{{ column.label }}</span>
              <KitButton variant="quiet" @click="setWidth(column, widthOf(column) - STEP * 4)">
                Narrower <span class="kit-data-table__hidden">{{ column.label }}</span>
              </KitButton>
              <KitButton variant="quiet" @click="setWidth(column, widthOf(column) + STEP * 4)">
                Wider <span class="kit-data-table__hidden">{{ column.label }}</span>
              </KitButton>
            </li>
          </ul>
          <KitButton
            variant="quiet"
            :disabled="Object.keys(widths).length === 0"
            @click="widths = {}"
          >
            Put the widths back
          </KitButton>
        </KitPopover>
      </div>
      <p v-if="searchable || filterColumns.length" class="kit-data-table__count" role="status">
        {{
          countText(fromServer ? rowCount : matching.length, fromServer ? rowCount : rows.length)
        }}
      </p>
    </div>
    <p v-if="reloading" class="kit-data-table__reloading">
      <KitSpinner :label="loadingLabel" />
    </p>
    <div
      ref="frame"
      class="kit-data-table__frame"
      :tabindex="scrolls ? 0 : undefined"
      :role="scrolls ? 'region' : undefined"
      :aria-label="scrolls ? label : undefined"
    >
      <table
        class="kit-data-table__table"
        :role="role('table')"
        :aria-label="stacked ? label : undefined"
        :aria-busy="loading || undefined"
      >
        <caption class="kit-data-table__hidden">
          {{
            label
          }}
        </caption>
        <thead :role="role('rowgroup')">
          <tr :role="role('row')">
            <th
              v-if="expandable"
              scope="col"
              class="kit-data-table__open"
              :role="role('columnheader')"
            >
              <span class="kit-data-table__hidden">{{ detailLabel }}</span>
            </th>
            <th
              v-if="selectable"
              scope="col"
              class="kit-data-table__choose"
              :role="role('columnheader')"
            >
              <input
                type="checkbox"
                class="kit-data-table__box"
                :checked="allChosen"
                :indeterminate="someChosen"
                :disabled="matching.length === 0"
                :aria-label="allChosen ? 'Clear the selection' : 'Select every matching row'"
                @change="toggleAll"
              />
            </th>
            <th
              v-for="column in columns"
              :key="column.key"
              :ref="(element) => keepHeading(column.key, element)"
              scope="col"
              class="kit-data-table__heading"
              :class="`kit-data-table__cell--${column.align ?? 'start'}`"
              :style="headingStyle(column)"
              :role="role('columnheader')"
              :aria-sort="column.sortable ? (sortedBy(column) ?? 'none') : undefined"
              :aria-label="resizable && !stacked ? column.label : undefined"
            >
              <button
                v-if="column.sortable"
                type="button"
                class="kit-data-table__sort"
                @click="toggleSort(column)"
              >
                <span :class="{ 'kit-data-table__hidden': column.hideLabel }">{{
                  column.label
                }}</span>
                <span class="kit-data-table__sort-icon" aria-hidden="true">
                  <slot name="sort-icon" :direction="sortedBy(column)">
                    <KitGlyph :name="sortGlyph(sortedBy(column))" />
                  </slot>
                </span>
              </button>
              <span v-else :class="{ 'kit-data-table__hidden': column.hideLabel }">
                {{ column.label }}
              </span>
              <!-- eslint-disable-next-line vuejs-accessibility/no-static-element-interactions -- a focusable separator is ARIA's widget for a splitter, moved by the arrow keys as well as dragged -->
              <span
                v-if="resizable && !stacked"
                class="kit-data-table__edge"
                role="separator"
                tabindex="0"
                aria-orientation="vertical"
                :aria-label="`Width of ${column.label}`"
                :aria-valuenow="widthOf(column)"
                :aria-valuemin="MIN_WIDTH"
                aria-valuemax="2000"
                :aria-valuetext="`${String(widthOf(column))} pixels`"
                @pointerdown="startResize(column, $event)"
                @keydown="resizeByKey(column, $event)"
                @click.stop
              ></span>
            </th>
          </tr>
        </thead>
        <tbody v-if="shows !== 'rows'" :role="role('rowgroup')">
          <tr :role="role('row')">
            <td :colspan="columnSpan" class="kit-data-table__state" :role="role('cell')">
              <KitLoadingState v-if="shows === 'loading'" :label="loadingLabel" />
              <KitErrorState
                v-else-if="shows === 'failed'"
                :title="errorTitle"
                :message="error"
                @retry="emit('retry')"
              >
                <template v-if="filled($slots['error-icon'])" #icon>
                  <slot name="error-icon" />
                </template>
              </KitErrorState>
              <slot v-else-if="shows === 'empty'" name="empty">
                <KitEmptyState :title="emptyTitle" :message="emptyMessage">
                  <template v-if="filled($slots['empty-icon'])" #icon>
                    <slot name="empty-icon" />
                  </template>
                </KitEmptyState>
              </slot>
              <KitEmptyState v-else :title="noMatchTitle" :message="noMatchMessage">
                <template v-if="filled($slots['no-match-icon'])" #icon>
                  <slot name="no-match-icon" />
                </template>
              </KitEmptyState>
            </td>
          </tr>
        </tbody>
        <template v-else>
          <tbody v-for="group in groups" :key="group.key" :role="role('rowgroup')">
            <tr v-if="groupBy" class="kit-data-table__group" :role="role('row')">
              <th :colspan="columnSpan" scope="rowgroup" :role="role('rowheader')">
                <slot name="group" :value="group.value" :rows="group.rows">
                  {{ group.value || noGroupText }}
                </slot>
              </th>
            </tr>
            <template v-for="row in group.rows" :key="keyOf(row)">
              <tr
                class="kit-data-table__row"
                :class="{ 'is-open': open.has(keyOf(row)) }"
                :role="role('row')"
              >
                <td v-if="expandable" class="kit-data-table__open" :role="role('cell')">
                  <button
                    type="button"
                    class="kit-data-table__opener"
                    :aria-label="`${detailLabel}: ${nameOf(row)}`"
                    :aria-expanded="open.has(keyOf(row)) ? 'true' : 'false'"
                    :aria-controls="open.has(keyOf(row)) ? detailId(row) : undefined"
                    @click="toggleOpen(row)"
                  >
                    <span class="kit-data-table__opener-icon" aria-hidden="true">
                      <slot name="expand-icon" :open="open.has(keyOf(row))">
                        <KitGlyph name="chevron" />
                      </slot>
                    </span>
                  </button>
                </td>
                <td v-if="selectable" class="kit-data-table__choose" :role="role('cell')">
                  <input
                    type="checkbox"
                    class="kit-data-table__box"
                    :checked="chosen.has(keyOf(row))"
                    :aria-label="`Select ${nameOf(row)}`"
                    @change="toggleRow(row)"
                  />
                </td>
                <component
                  :is="column.rowHeader ? 'th' : 'td'"
                  v-for="column in columns"
                  :key="column.key"
                  :scope="column.rowHeader ? 'row' : undefined"
                  class="kit-data-table__cell"
                  :class="[
                    `kit-data-table__cell--${column.align ?? 'start'}`,
                    { 'kit-data-table__row-header': column.rowHeader },
                  ]"
                  :role="role(column.rowHeader ? 'rowheader' : 'cell')"
                  :data-label="column.hideLabel ? undefined : column.label"
                >
                  <slot :name="`cell-${column.key}`" :row="row" :value="fieldOf(row, column.key)">
                    {{ cellText(column, row) }}
                  </slot>
                </component>
              </tr>
              <tr
                v-if="expandable && open.has(keyOf(row))"
                :id="detailId(row)"
                class="kit-data-table__detail"
                :role="role('row')"
              >
                <td :colspan="columnSpan" :role="role('cell')">
                  <slot name="detail" :row="row" />
                </td>
              </tr>
            </template>
          </tbody>
        </template>
        <tfoot v-if="filled($slots.foot)" :role="role('rowgroup')">
          <slot name="foot" />
        </tfoot>
      </table>
    </div>
    <KitPagination
      v-if="shows === 'rows'"
      v-model:page="page"
      :page-count="pageCount"
      :label="pagesLabel ?? `Pages of ${label}`"
    />
  </div>
</template>

<style scoped>
@layer kit {
  .kit-data-table {
    display: flex;
    flex-direction: column;
    gap: var(--kit-space-sm);
    min-width: 0;
  }

  .kit-data-table__toolbar {
    display: flex;
    flex-wrap: wrap;
    align-items: end;
    justify-content: space-between;
    gap: var(--kit-space-xs) var(--kit-space-md);
  }

  .kit-data-table__search {
    display: flex;
    flex: 1 1 16rem;
    flex-direction: column;
    gap: var(--kit-space-2xs);
    max-width: var(--kit-width-field);
  }

  .kit-data-table__search-label {
    font-weight: var(--kit-font-weight-strong);
  }

  .kit-data-table__count {
    margin: 0;
    color: var(--kit-text-muted);
    font-variant-numeric: tabular-nums;
  }

  /* A table wider than its panel scrolls in here, never the page. Positioned, so the words hidden
     for screen readers in a far column (absolute, as hidden words are) are held and clipped in
     here too: their containing block would otherwise be the page, which they would widen. */
  .kit-data-table__frame {
    position: relative;
    min-width: 0;
    overflow-x: auto;
  }

  .kit-data-table__frame:focus-visible {
    outline: var(--kit-focus-ring-width) solid var(--kit-focus-ring);
    outline-offset: var(--kit-focus-ring-offset);
  }

  .kit-data-table__table {
    width: 100%;
    border-collapse: collapse;
    font-variant-numeric: tabular-nums;
  }

  .kit-data-table__heading,
  .kit-data-table__cell,
  .kit-data-table__choose {
    box-sizing: border-box;
    padding: var(--kit-space-xs) var(--kit-space-sm);
    border-bottom: var(--kit-control-border-width) solid var(--kit-hairline);
    vertical-align: middle;
  }

  .kit-data-table__heading {
    position: relative;
    border-bottom-color: var(--kit-control-border);
    color: var(--kit-text-muted);
    font-size: var(--kit-text-size-sm);
    font-weight: var(--kit-font-weight-strong);
    white-space: nowrap;
  }

  /* A row's name: its own cell, bold, as a heading reads. */
  .kit-data-table__row-header {
    font-weight: var(--kit-font-weight-strong);
  }

  .kit-data-table__reloading {
    margin: 0;
  }

  .kit-data-table__cell--start {
    text-align: start;
  }

  .kit-data-table__cell--center {
    text-align: center;
  }

  .kit-data-table__cell--end {
    text-align: end;
  }

  /* A heading's button reads as the heading: its words, the full height of a touch target. */
  .kit-data-table__sort {
    display: inline-flex;
    align-items: center;
    gap: var(--kit-space-2xs);
    min-height: var(--kit-control-height);
    margin: calc(-1 * var(--kit-space-xs)) calc(-1 * var(--kit-space-sm));
    padding: var(--kit-space-xs) var(--kit-space-sm);
    border: 0;
    border-radius: var(--kit-radius-sm);
    background: transparent;
    color: inherit;
    font: inherit;
    cursor: pointer;
  }

  .kit-data-table__sort:focus-visible {
    outline: var(--kit-focus-ring-width) solid var(--kit-focus-ring);
    outline-offset: calc(-1 * var(--kit-focus-ring-width));
  }

  .kit-data-table__sort:hover {
    background: color-mix(in srgb, var(--kit-text) 6%, transparent);
    color: var(--kit-text);
  }

  .kit-data-table__sort-icon {
    display: inline-flex;
  }

  .kit-data-table__choose {
    width: var(--kit-control-height);
    text-align: center;
  }

  .kit-data-table__box {
    width: var(--kit-text-size-lg);
    height: var(--kit-text-size-lg);
    margin: 0;
    accent-color: var(--kit-accent);
    cursor: pointer;
  }

  .kit-data-table__box:focus-visible {
    outline: var(--kit-focus-ring-width) solid var(--kit-focus-ring);
    outline-offset: var(--kit-focus-ring-offset);
  }

  .kit-data-table__state {
    padding: 0;
  }

  .kit-data-table__hidden {
    position: absolute;
    width: 1px;
    height: 1px;
    margin: -1px;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
  }

  .kit-data-table__filter {
    flex: 0 1 14rem;
  }

  .kit-data-table__actions {
    display: flex;
    flex-wrap: wrap;
    gap: var(--kit-space-xs);
  }

  /* The widths panel: each column's name, then its two buttons, lined up down the panel. */
  .kit-data-table__widths {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto auto;
    gap: var(--kit-space-2xs) var(--kit-space-xs);
    margin: 0 0 var(--kit-space-sm);
    padding: 0;
    list-style: none;
  }

  .kit-data-table__width {
    display: grid;
    grid-column: 1 / -1;
    grid-template-columns: subgrid;
    align-items: center;
  }

  .kit-data-table__width-name {
    font-weight: var(--kit-font-weight-strong);
  }

  /* A column's edge: 24 px to take hold of, across the line between two headings, with a line of
     its own that shows where it is, and the accent while it is held or focused. */
  .kit-data-table__edge {
    position: absolute;
    z-index: 1;
    inset-block: 0;
    inset-inline-end: calc(-1 * var(--kit-space-sm));
    width: var(--kit-space-lg);
    cursor: col-resize;
    touch-action: none;
    user-select: none;
  }

  .kit-data-table__edge:focus-visible {
    outline: var(--kit-focus-ring-width) solid var(--kit-focus-ring);
    outline-offset: calc(-1 * var(--kit-focus-ring-width));
  }

  .kit-data-table__heading:last-child .kit-data-table__edge {
    inset-inline-end: 0;
  }

  .kit-data-table__edge::after {
    content: '';
    position: absolute;
    inset-block: 20%;
    inset-inline-start: 50%;
    width: var(--kit-control-border-width);
    background: var(--kit-control-border);
  }

  .kit-data-table__edge:hover::after,
  .kit-data-table__edge:focus-visible::after {
    width: var(--kit-focus-ring-width);
    background: var(--kit-accent);
  }

  /* A row's button that opens it: a touch target, its chevron turned while the row is open. */
  .kit-data-table__open {
    box-sizing: border-box;
    width: var(--kit-control-height);
    padding: 0;
    border-bottom: var(--kit-control-border-width) solid var(--kit-hairline);
    text-align: center;
    vertical-align: middle;
  }

  /* The headings' line runs the table's width, under the box and the opener's column too. */
  thead > tr > .kit-data-table__choose,
  thead > tr > .kit-data-table__open {
    border-bottom-color: var(--kit-control-border);
  }

  .kit-data-table__opener {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: var(--kit-control-height);
    height: var(--kit-control-height);
    border: 0;
    border-radius: var(--kit-radius-sm);
    background: transparent;
    color: inherit;
    font: inherit;
    cursor: pointer;
  }

  .kit-data-table__opener:hover {
    background: color-mix(in srgb, var(--kit-text) 6%, transparent);
  }

  .kit-data-table__opener:focus-visible {
    outline: var(--kit-focus-ring-width) solid var(--kit-focus-ring);
    outline-offset: calc(-1 * var(--kit-focus-ring-width));
  }

  .kit-data-table__opener-icon {
    display: inline-flex;
    transition: transform var(--kit-duration-quick) ease;
  }

  .kit-data-table__opener[aria-expanded='true'] .kit-data-table__opener-icon {
    transform: rotate(180deg);
  }

  /* An open row and its detail read as one: no line between them. */
  .kit-data-table__row.is-open > * {
    border-bottom-color: transparent;
  }

  .kit-data-table__detail > td {
    padding: var(--kit-space-xs) var(--kit-space-sm) var(--kit-space-sm);
    border-bottom: var(--kit-control-border-width) solid var(--kit-hairline);
  }

  /* A group's heading row, on the sunken surface so it reads apart from the rows under it. */
  .kit-data-table__group > th {
    padding: var(--kit-space-xs) var(--kit-space-sm);
    border-bottom: var(--kit-control-border-width) solid var(--kit-control-border);
    background: var(--kit-surface-sunken);
    font-weight: var(--kit-font-weight-strong);
    text-align: start;
  }

  /* Rows as cards, where the table is narrower than `stackBelow`: each row a block, each cell
     its heading's name over against what it holds. The headings stay for a screen reader, which
     reads each cell with its own; the names drawn are for the eye, so they say nothing twice. */
  .is-stacked .kit-data-table__table,
  .is-stacked tbody,
  .is-stacked tfoot {
    display: block;
  }

  .is-stacked thead {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
  }

  .is-stacked .kit-data-table__row {
    position: relative;
    display: grid;
    gap: var(--kit-space-2xs) var(--kit-space-md);
    padding: var(--kit-space-sm) 0;
    border-bottom: var(--kit-control-border-width) solid var(--kit-hairline);
  }

  .is-stacked .kit-data-table__row > * {
    display: grid;
    grid-template-columns: minmax(6rem, 9rem) minmax(0, 1fr);
    align-items: baseline;
    width: auto;
    padding: 0;
    border: 0;
    text-align: start;
  }

  .is-stacked .kit-data-table__row > * > * {
    grid-column: 2;
  }

  .is-stacked .kit-data-table__row > :not([data-label]) {
    grid-template-columns: minmax(0, 1fr);
  }

  .is-stacked .kit-data-table__row > :not([data-label]) > * {
    grid-column: 1;
  }

  .is-stacked .kit-data-table__row > [data-label]::before {
    content: attr(data-label) / '';
    color: var(--kit-text-muted);
    font-size: var(--kit-text-size-sm);
    font-weight: var(--kit-font-weight-strong);
  }

  /* A card's opener sits in its top corner, and the first line keeps clear of it. */
  .is-stacked .kit-data-table__row > .kit-data-table__open {
    position: absolute;
    inset-block-start: var(--kit-space-2xs);
    inset-inline-end: 0;
    width: auto;
  }

  .is-stacked .kit-data-table__row > .kit-data-table__open + * {
    padding-inline-end: calc(var(--kit-control-height) + var(--kit-space-xs));
  }

  .is-stacked .kit-data-table__group,
  .is-stacked .kit-data-table__detail,
  .is-stacked .kit-data-table__group > th,
  .is-stacked .kit-data-table__detail > td,
  .is-stacked tbody > tr:not(.kit-data-table__row),
  .is-stacked .kit-data-table__state {
    display: block;
  }

  @media (prefers-reduced-motion: reduce) {
    .kit-data-table__opener-icon {
      transition: none;
    }
  }
}
</style>
