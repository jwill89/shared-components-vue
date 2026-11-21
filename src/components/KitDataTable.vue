<script setup lang="ts" generic="T extends object">
// The one table a list of records sits in. Given the whole list, it searches, sorts and pages it
// itself, in that order, so a sort orders every row and not only the page on screen. Given one page
// the server made (`total`, the count of every row), it leaves all three to the server and says,
// through its models, what to fetch; a list that does so records it as a departure. Search, sort
// and page are models the page keeps in its address, and a new search or sort starts at page one.
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
import { computed, onBeforeUnmount, onMounted, ref, useId, useTemplateRef, watch } from 'vue'
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
import type { ColumnDef, SortingState } from '@tanstack/vue-table'
import KitEmptyState from './KitEmptyState.vue'
import KitErrorState from './KitErrorState.vue'
import KitGlyph from './KitGlyph.vue'
import KitLoadingState from './KitLoadingState.vue'
import KitPagination from './KitPagination.vue'
import KitSpinner from './KitSpinner.vue'
import KitTextField from './KitTextField.vue'
import { compareValues, fieldOf, textOf } from './dataTable'
import type { KitColumn, KitSort } from './dataTable'
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
    /** Whether it has a search box over it. */
    searchable?: boolean
    /** How a row matches what was searched, lowercased; its columns' text by default. */
    matches?: (row: T, query: string) => boolean
    /** Whether a third press on a heading puts the rows back as they came. */
    clearableSort?: boolean
    selectable?: boolean
    /** What a row is called, for its selection box: "Select Dune". Its first column by default. */
    rowLabel?: (row: T) => string
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
    /** What the table's pages are, as their navigation is named; "Pages of" its label by default. */
    pagesLabel?: string
    /** What the count over the table says, given the rows matching and the rows in all. */
    countText?: (matching: number, total: number) => string
  }>(),
  {
    pageSize: undefined,
    total: undefined,
    searchable: false,
    matches: undefined,
    clearableSort: false,
    selectable: false,
    rowLabel: undefined,
    loading: false,
    error: undefined,
    loadingLabel: 'Loading…',
    errorTitle: 'Couldn’t load the list',
    emptyTitle: 'Nothing here yet',
    emptyMessage: undefined,
    noMatchTitle: 'Nothing matches the search',
    noMatchMessage: undefined,
    searchLabel: 'Search',
    pagesLabel: undefined,
    countText: (matching: number, total: number) => `${String(matching)} of ${String(total)}`,
  },
)

const emit = defineEmits<{
  /** The failed list's Try again was pressed. */
  retry: []
}>()

const search = defineModel<string>('search', { default: '' })
const sort = defineModel<KitSort | null>('sort', { default: null })
const page = defineModel<number>('page', { default: 1 })
const selected = defineModel<(string | number)[]>('selected', { default: () => [] })

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
  } & Record<string, ((props: { row: T; value: unknown }) => unknown) | undefined>
>()

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

// The pipeline: search, then sort, then page. TanStack Table's row models do the work; the markup
// is the kit's own.
// Global filtering, the search, rests on column filtering, which TanStack asks for beside it.
const features = tableFeatures({
  columnFilteringFeature,
  globalFilteringFeature,
  rowSortingFeature,
  rowPaginationFeature,
  filteredRowModel: createFilteredRowModel(),
  sortedRowModel: createSortedRowModel(),
  paginatedRowModel: createPaginatedRowModel(),
})

const definitions = computed<ColumnDef<typeof features, T>[]>(() =>
  props.columns.map((column) => ({
    id: column.key,
    accessorFn: (row: T) => (column.sortValue ? column.sortValue(row) : cellText(column, row)),
    enableSorting: Boolean(column.sortable),
    sortDescFirst: false,
    sortFn: (a, b, id) => compareValues(a.getValue(id), b.getValue(id)),
  })),
)

// A copy remade whenever the rows change: TanStack looks only at whether the array is a new one,
// so rows pushed into the same array would otherwise never show.
const data = computed(() => props.rows.slice())

const sorting = computed<SortingState>(() =>
  sort.value ? [{ id: sort.value.key, desc: sort.value.direction === 'descending' }] : [],
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
      return search.value.trim().toLowerCase()
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
  globalFilterFn: (row, _column, query: string) => {
    if (!query) {
      return true
    }
    if (props.matches) {
      return props.matches(row.original, query)
    }
    return props.columns.some(
      (column) =>
        column.searchable !== false && cellText(column, row.original).toLowerCase().includes(query),
    )
  },
})

/** Every row the search matches, in the order shown, on every page. */
const matching = computed(() => table.getSortedRowModel().rows.map((row) => row.original))
/** The rows on the page shown. */
const shown = computed(() => table.getRowModel().rows.map((row) => row.original))
const rowCount = computed(() => props.total ?? matching.value.length)
const pageCount = computed(() =>
  props.pageSize ? Math.max(1, Math.ceil(rowCount.value / props.pageSize)) : 1,
)

// A new search, sort or page size starts at page one; otherwise a page past the end comes back to
// the last, as a list that shrinks leaves it. One watcher decides, since the page is the page's to
// keep and still reads as it was until the page passes the new one back. Nothing is clamped while
// the list loads or is empty, so a page restored from the address waits for its rows.
const view = computed(
  () =>
    `${search.value.trim()}|${sort.value?.key ?? ''}:${sort.value?.direction ?? ''}|${String(props.pageSize)}`,
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
  return search.value.trim() === '' ? 'empty' : 'no-match'
})

/** A list read again while it has rows: they stay, and a line says it is loading. */
const reloading = computed(() => props.loading && shows.value === 'rows')

// Sorting: a press goes ascending, then descending, then back to as the list came or round.
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

// Selection, of every row the search matches, across the pages.
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

// A frame wider than its panel scrolls, and only then takes focus, named by the table.
const frame = useTemplateRef<HTMLElement>('frame')
const scrolls = ref(false)
let watcher: ResizeObserver | undefined
function measure(): void {
  const box = frame.value
  scrolls.value = box ? box.scrollWidth > box.clientWidth : false
}
onMounted(() => {
  measure()
  watcher = new ResizeObserver(measure)
  if (frame.value) {
    watcher.observe(frame.value)
  }
})
onBeforeUnmount(() => {
  watcher?.disconnect()
})

const searchId = useId()
const columnSpan = computed(() => props.columns.length + (props.selectable ? 1 : 0))
</script>

<template>
  <div class="kit-data-table">
    <div v-if="searchable" class="kit-data-table__toolbar">
      <div class="kit-data-table__search">
        <label :for="searchId" class="kit-data-table__search-label">{{ searchLabel }}</label>
        <KitTextField :id="searchId" v-model="search" type="search" autocomplete="off" />
      </div>
      <p class="kit-data-table__count" role="status">
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
      <table class="kit-data-table__table" :aria-busy="loading || undefined">
        <caption class="kit-data-table__hidden">
          {{
            label
          }}
        </caption>
        <thead>
          <tr>
            <th v-if="selectable" scope="col" class="kit-data-table__choose">
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
              scope="col"
              class="kit-data-table__heading"
              :class="`kit-data-table__cell--${column.align ?? 'start'}`"
              :style="column.width ? { width: column.width } : undefined"
              :aria-sort="column.sortable ? (sortedBy(column) ?? 'none') : undefined"
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
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="shows !== 'rows'">
            <td :colspan="columnSpan" class="kit-data-table__state">
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
          <template v-else>
            <tr v-for="row in shown" :key="keyOf(row)" class="kit-data-table__row">
              <td v-if="selectable" class="kit-data-table__choose">
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
              >
                <slot :name="`cell-${column.key}`" :row="row" :value="fieldOf(row, column.key)">
                  {{ cellText(column, row) }}
                </slot>
              </component>
            </tr>
          </template>
        </tbody>
        <tfoot v-if="filled($slots.foot)">
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
}
</style>
