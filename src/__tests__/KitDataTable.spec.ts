import { afterEach, describe, expect, it } from 'vitest'
import { defineComponent, h, nextTick, reactive } from 'vue'
import type { Component } from 'vue'
import { mount } from '@vue/test-utils'
import KitDataTable from '../components/KitDataTable.vue'
import { compareValues, textOf } from '../components/dataTable'
import type { KitColumn, KitSort } from '../components/dataTable'
import { axeFindings, kept, unmountKept } from './helpers'

afterEach(unmountKept)

interface Shelf {
  id: number
  name: string
  books: number
  room: string
}

const shelves: Shelf[] = [
  { id: 1, name: 'Shelf 10', books: 4, room: 'Study' },
  { id: 2, name: 'Shelf 9', books: 12, room: 'Hall' },
  { id: 3, name: 'Shelf 2', books: 7, room: 'Study' },
  { id: 4, name: 'Atlas shelf', books: 1, room: 'Landing' },
  { id: 5, name: 'Poetry', books: 30, room: 'Hall' },
]

const columns: KitColumn<Shelf>[] = [
  { key: 'name', label: 'Shelf', sortable: true },
  { key: 'books', label: 'Books', sortable: true, align: 'end', sortValue: (row) => row.books },
  { key: 'room', label: 'Room' },
  { key: 'actions', label: 'Actions', hideLabel: true, searchable: false },
]

// The table is generic over its rows, which a render function's `h` can't infer from props.
const Table = KitDataTable as Component

/** A table with its models kept as a page keeps them, and every retry counted. */
function table(
  props: Record<string, unknown> = {},
  slots: Record<string, unknown> = {},
  startPage = 1,
) {
  const state = reactive({
    search: '',
    sort: null as KitSort | null,
    page: startPage,
    selected: [] as (string | number)[],
    retries: 0,
  })
  const wrapper = kept(
    mount(
      defineComponent({
        setup: () => () =>
          h(
            Table,
            {
              rows: shelves,
              columns,
              rowKey: 'id',
              label: 'Shelves',
              ...props,
              search: state.search,
              'onUpdate:search': (next: string) => (state.search = next),
              sort: state.sort,
              'onUpdate:sort': (next: KitSort | null) => (state.sort = next),
              page: state.page,
              'onUpdate:page': (next: number) => (state.page = next),
              selected: state.selected,
              'onUpdate:selected': (next: (string | number)[]) => (state.selected = next),
              onRetry: () => state.retries++,
            },
            {
              'cell-actions': ({ row }: { row: Shelf }) =>
                h('button', { type: 'button' }, `Open ${row.name}`),
              ...slots,
            },
          ),
      }),
      { attachTo: document.body },
    ),
  )
  const names = (): string[] =>
    wrapper
      .findAll('tbody tr')
      .map((row) => row.findAll('td.kit-data-table__cell')[0]?.text() ?? '')
  const heading = (name: string) => wrapper.findAll('th').find((th) => th.text().startsWith(name))
  return { wrapper, state, names, heading }
}

describe('KitDataTable', () => {
  it('names its table, heads each column, and shows every row, with nothing axe finds', async () => {
    const { wrapper, names } = table()
    await nextTick()
    expect(wrapper.get('caption').text()).toBe('Shelves')
    expect(wrapper.findAll('th').map((th) => th.text())).toEqual([
      'Shelf',
      'Books',
      'Room',
      'Actions',
    ])
    expect(wrapper.findAll('th')[3]?.find('.kit-data-table__hidden').exists()).toBe(true)
    expect(names()).toEqual(['Shelf 10', 'Shelf 9', 'Shelf 2', 'Atlas shelf', 'Poetry'])
    expect(wrapper.text()).toContain('Open Poetry')
    expect(await axeFindings(wrapper)).toEqual([])
  })

  it('sorts by a heading’s button, ascending then descending, and says so in aria-sort', async () => {
    const { wrapper, state, names, heading } = table({ clearableSort: true })
    await nextTick()
    expect(heading('Shelf')?.attributes('aria-sort')).toBe('none')
    expect(heading('Room')?.attributes('aria-sort')).toBeUndefined()

    await heading('Shelf')?.get('button').trigger('click')
    expect(state.sort).toEqual({ key: 'name', direction: 'ascending' })
    expect(heading('Shelf')?.attributes('aria-sort')).toBe('ascending')
    // Numbers inside text sort by size: Shelf 2, 9, then 10.
    expect(names()).toEqual(['Atlas shelf', 'Poetry', 'Shelf 2', 'Shelf 9', 'Shelf 10'])

    await heading('Shelf')?.get('button').trigger('click')
    expect(heading('Shelf')?.attributes('aria-sort')).toBe('descending')
    expect(names()[0]).toBe('Shelf 10')

    await heading('Shelf')?.get('button').trigger('click')
    expect(state.sort).toBeNull()
    expect(names()[0]).toBe('Shelf 10')

    await heading('Books')?.get('button').trigger('click')
    expect(names()).toEqual(['Atlas shelf', 'Shelf 10', 'Shelf 2', 'Shelf 9', 'Poetry'])
    expect(await axeFindings(wrapper)).toEqual([])
  })

  it('searches its rows, counts what matches, and says when nothing does', async () => {
    const { wrapper, names } = table({ searchable: true })
    await nextTick()
    const box = wrapper.get('input[type="search"]')
    expect(wrapper.get(`label[for="${box.attributes('id') ?? ''}"]`).text()).toBe('Search')
    expect(wrapper.get('[role="status"]').text()).toBe('5 of 5')

    await box.setValue('study')
    expect(names()).toEqual(['Shelf 10', 'Shelf 2'])
    expect(wrapper.get('[role="status"]').text()).toBe('2 of 5')

    await box.setValue('nothing like it')
    expect(wrapper.text()).toContain('Nothing matches the search')
    expect(wrapper.findAll('th')).toHaveLength(4)
    expect(await axeFindings(wrapper)).toEqual([])
  })

  it('pages its rows, and a new search starts at page one', async () => {
    const { wrapper, state, names } = table({ pageSize: 2, searchable: true })
    await nextTick()
    expect(names()).toEqual(['Shelf 10', 'Shelf 9'])
    expect(wrapper.find('nav[aria-label="Pages of Shelves"]').exists()).toBe(true)
    await wrapper.get('button[aria-label="Page 3"]').trigger('click')
    expect(state.page).toBe(3)
    expect(names()).toEqual(['Poetry'])

    await wrapper.get('input[type="search"]').setValue('shelf')
    await nextTick()
    expect(state.page).toBe(1)
  })

  it('keeps a page restored from the address while its rows load', async () => {
    const rows = reactive<Shelf[]>([])
    const loading = reactive({ on: true })
    const { state, names } = table(
      {
        get rows() {
          return rows
        },
        get loading() {
          return loading.on
        },
        pageSize: 2,
      },
      {},
      3,
    )
    await nextTick()
    expect(state.page).toBe(3)
    rows.push(...shelves)
    loading.on = false
    await nextTick()
    await nextTick()
    expect(state.page).toBe(3)
    expect(names()).toEqual(['Poetry'])
  })

  it('shows loading, failed and empty in its rows’ place, the headings kept', async () => {
    const loading = table({ loading: true })
    await nextTick()
    expect(loading.wrapper.get('[role="status"]').text()).toContain('Loading…')
    expect(loading.wrapper.get('table').attributes('aria-busy')).toBe('true')
    unmountKept()

    const failed = table({ error: 'The server is down for upkeep.' })
    await nextTick()
    expect(failed.wrapper.text()).toContain('Couldn’t load the list')
    expect(failed.wrapper.text()).toContain('The server is down for upkeep.')
    await failed.wrapper
      .findAll('button')
      .find((b) => b.text() === 'Try again')
      ?.trigger('click')
    expect(failed.state.retries).toBe(1)
    expect(await axeFindings(failed.wrapper)).toEqual([])
    unmountKept()

    const empty = table({ rows: [] }, { empty: () => h('p', 'No shelves yet. Add one to start.') })
    await nextTick()
    expect(empty.wrapper.text()).toContain('No shelves yet.')
    expect(empty.wrapper.findAll('th')).toHaveLength(4)
  })

  it('selects a row by its box, and every matching row, on every page, by the heading’s', async () => {
    const { wrapper, state } = table({ selectable: true, pageSize: 2, searchable: true })
    await nextTick()
    await wrapper.get('input[aria-label="Select Shelf 9"]').trigger('change')
    expect(state.selected).toEqual([2])
    const all = wrapper.get('thead input[type="checkbox"]')
    expect((all.element as HTMLInputElement).indeterminate).toBe(true)

    await wrapper.get('input[type="search"]').setValue('study')
    await all.trigger('change')
    expect(state.selected).toEqual([2, 1, 3])
    expect(all.attributes('aria-label')).toBe('Clear the selection')
    await all.trigger('change')
    expect(state.selected).toEqual([2])
    expect(await axeFindings(wrapper)).toEqual([])
  })

  it('leaves searching, sorting and paging to the server when it is given one page of a total', async () => {
    const page = shelves.slice(0, 2)
    const { wrapper, state, names, heading } = table({
      rows: page,
      total: 41,
      pageSize: 2,
      searchable: true,
    })
    await nextTick()
    expect(wrapper.get('[role="status"]').text()).toBe('41 of 41')
    expect(wrapper.find('button[aria-label="Page 21"]').exists()).toBe(true)

    await heading('Shelf')?.get('button').trigger('click')
    expect(state.sort).toEqual({ key: 'name', direction: 'ascending' })
    // The server sorts; the page it gave stays as it came until it gives another.
    expect(names()).toEqual(['Shelf 10', 'Shelf 9'])

    await wrapper.get('input[type="search"]').setValue('poetry')
    expect(state.search).toBe('poetry')
    expect(names()).toEqual(['Shelf 10', 'Shelf 9'])

    await wrapper.get('button[aria-label="Page 21"]').trigger('click')
    expect(state.page).toBe(21)
  })
})

describe('KitDataTable, told more', () => {
  it('takes a row’s key, a column’s text, its search and a row’s name from the page', async () => {
    const titled: KitColumn<Shelf>[] = [
      { key: 'name', label: 'Shelf', text: (row) => row.name.toUpperCase() },
      { key: 'room', label: 'Room' },
    ]
    const { wrapper, state, names } = table({
      columns: titled,
      rowKey: (row: Shelf) => `shelf-${String(row.id)}`,
      rowLabel: (row: Shelf) => `the ${row.name} shelf`,
      matches: (row: Shelf, query: string) => row.room.toLowerCase() === query,
      searchable: true,
      selectable: true,
    })
    await nextTick()
    expect(names()[0]).toBe('SHELF 10')
    await wrapper.get('input[type="search"]').setValue('hall')
    expect(names()).toEqual(['SHELF 9', 'POETRY'])

    const box = wrapper.get('input[aria-label="Select the Poetry shelf"]')
    await box.trigger('change')
    expect(state.selected).toEqual(['shelf-5'])
    await box.trigger('change')
    expect(state.selected).toEqual([])
  })

  it('says it is empty in the kit’s words when the page gives none of its own', async () => {
    const { wrapper } = table({ rows: [], emptyTitle: 'No shelves yet' })
    await nextTick()
    expect(wrapper.text()).toContain('No shelves yet')
    expect(wrapper.find('nav').exists()).toBe(false)
  })
})

describe('a table’s values', () => {
  it('read as text, an object as its JSON and nothing as nothing', () => {
    expect(textOf(null)).toBe('')
    expect(textOf(12)).toBe('12')
    expect(textOf(true)).toBe('true')
    expect(textOf({ a: 1 })).toBe('{"a":1}')
  })

  it('order numbers by size, text with its numbers by size, and nothing last', () => {
    expect([10, 9, 2].sort(compareValues)).toEqual([2, 9, 10])
    expect(['Shelf 10', 'shelf 9', 'Shelf 2'].sort(compareValues)).toEqual([
      'Shelf 2',
      'shelf 9',
      'Shelf 10',
    ])
    expect(['b', null, 'a', ''].sort(compareValues)).toEqual(['a', 'b', null, ''])
  })
})
