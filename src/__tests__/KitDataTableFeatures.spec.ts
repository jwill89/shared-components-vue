import { afterEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, nextTick, reactive } from 'vue'
import type { Component } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import KitDataTable from '../components/KitDataTable.vue'
import KitSelect from '../components/KitSelect.vue'
import { csvCell, toCsv } from '../components/dataTable'
import type { KitColumn, KitSort } from '../components/dataTable'
import { axeFindings, kept, unmountKept } from './helpers'

afterEach(() => {
  unmountKept()
  vi.restoreAllMocks()
})

interface Book {
  id: number
  title: string
  author: string
  shelf: string
  pages: number
  tags: string[]
}

const books: Book[] = [
  { id: 1, title: 'Dune', author: 'Herbert', shelf: 'Hall', pages: 412, tags: ['sf', 'classic'] },
  { id: 2, title: 'Emma', author: 'Austen', shelf: 'Study', pages: 474, tags: ['classic'] },
  { id: 3, title: 'Ubik', author: 'Dick', shelf: 'Hall', pages: 202, tags: ['sf'] },
  { id: 4, title: '=SUM(A1)', author: 'Anon, "the" writer', shelf: '', pages: -5, tags: [] },
  { id: 5, title: 'Kindred', author: 'Butler', shelf: 'Study', pages: 264, tags: ['sf'] },
]

const columns: KitColumn<Book>[] = [
  { key: 'title', label: 'Title', sortable: true, rowHeader: true },
  { key: 'author', label: 'Author', sortable: true },
  { key: 'shelf', label: 'Shelf', filter: true },
  { key: 'pages', label: 'Pages', align: 'end', sortValue: (row) => row.pages },
  {
    key: 'tags',
    label: 'Tags',
    filter: true,
    values: (row) => row.tags,
    text: (row) => row.tags.join(', '),
  },
  { key: 'actions', label: 'Actions', hideLabel: true, searchable: false },
]

const Table = KitDataTable as Component

/** What a page keeps of the table: every model, and how many downloads it was asked for. */
interface State {
  search: string
  sort: KitSort | null
  page: number
  pageSize: number | undefined
  filters: Record<string, string>
  expanded: (string | number)[]
  widths: Record<string, number>
  downloads: number
}

/** A table with every model kept as a page keeps them. */
function table(props: Record<string, unknown> = {}, slots: Record<string, unknown> = {}) {
  const state = reactive<State>({
    search: '',
    sort: null,
    page: 1,
    pageSize: props.pageSize as number | undefined,
    filters: {},
    expanded: [],
    widths: {},
    downloads: 0,
  })
  const wrapper = kept(
    mount(
      defineComponent({
        setup: () => () =>
          h(
            Table,
            {
              rows: books,
              columns,
              rowKey: 'id',
              label: 'Books',
              ...props,
              search: state.search,
              'onUpdate:search': (next: string) => (state.search = next),
              sort: state.sort,
              'onUpdate:sort': (next: KitSort | null) => (state.sort = next),
              page: state.page,
              'onUpdate:page': (next: number) => (state.page = next),
              pageSize: state.pageSize,
              'onUpdate:pageSize': (next: number | undefined) => (state.pageSize = next),
              filters: state.filters,
              'onUpdate:filters': (next: Record<string, string>) => (state.filters = next),
              expanded: state.expanded,
              'onUpdate:expanded': (next: (string | number)[]) => (state.expanded = next),
              widths: state.widths,
              'onUpdate:widths': (next: Record<string, number>) => (state.widths = next),
              onDownload: () => state.downloads++,
            },
            {
              'cell-actions': ({ row }: { row: Book }) =>
                h('button', { type: 'button' }, `Lend ${row.title}`),
              ...slots,
            },
          ),
      }),
      { attachTo: document.body },
    ),
  )
  const titles = (): string[] =>
    wrapper.findAll('tbody tr.kit-data-table__row').map((row) => row.get('th').text())
  return { wrapper, state, titles }
}

function filterSelect(wrapper: ReturnType<typeof table>['wrapper'], label: string) {
  const field = wrapper
    .findAll('.kit-form-field')
    .find((candidate) => candidate.find('.kit-form-field__label').text() === label)
  if (!field) {
    throw new Error(`No "${label}" filter.`)
  }
  return field.findComponent(KitSelect)
}

/** The choices a filter offers. KitSelect is generic, so its props read as `never` from outside. */
function optionsOf(wrapper: ReturnType<typeof table>['wrapper'], label: string): unknown {
  return (filterSelect(wrapper, label).props() as { options: unknown }).options
}

describe('KitDataTable’s rows that open', () => {
  it('opens a row by its own button to show its detail under it', async () => {
    const { wrapper, state } = table(
      {},
      {
        detail: ({ row }: { row: Book }) => h('p', `${row.title} has ${String(row.pages)} pages.`),
      },
    )
    await nextTick()
    const opener = wrapper.get('button[aria-label="Details: Dune"]')
    expect(opener.attributes('aria-expanded')).toBe('false')
    expect(opener.attributes('aria-controls')).toBeUndefined()
    expect(wrapper.get('thead th').text()).toBe('Details')

    await opener.trigger('click')
    expect(state.expanded).toEqual([1])
    const detail = wrapper.get('tr.kit-data-table__detail')
    expect(detail.text()).toBe('Dune has 412 pages.')
    expect(opener.attributes('aria-expanded')).toBe('true')
    expect(opener.attributes('aria-controls')).toBe(detail.attributes('id'))
    expect(detail.get('td').attributes('colspan')).toBe(String(columns.length + 1))
    expect(await axeFindings(wrapper)).toEqual([])

    await opener.trigger('click')
    expect(state.expanded).toEqual([])
    expect(wrapper.find('tr.kit-data-table__detail').exists()).toBe(false)
  })
})

describe('KitDataTable’s filters', () => {
  it('offers each filtered column’s values with their counts, and filters by the one chosen', async () => {
    const { wrapper, state, titles } = table()
    await nextTick()
    const shelf = filterSelect(wrapper, 'Shelf')
    expect(optionsOf(wrapper, 'Shelf')).toEqual([
      { value: '\u0000', label: 'Any' },
      { value: 'Hall', label: 'Hall (2)' },
      { value: 'Study', label: 'Study (2)' },
    ])
    expect(optionsOf(wrapper, 'Tags')).toEqual([
      { value: '\u0000', label: 'Any' },
      { value: 'sf', label: 'sf (3)' },
      { value: 'classic', label: 'classic (2)' },
    ])
    expect(await axeFindings(wrapper)).toEqual([])

    state.page = 2
    shelf.vm.$emit('update:modelValue', 'Hall')
    await nextTick()
    await nextTick()
    expect(state.filters).toEqual({ shelf: 'Hall' })
    expect(titles()).toEqual(['Dune', 'Ubik'])
    expect(state.page).toBe(1)
    expect(wrapper.get('[role="status"]').text()).toBe('2 of 5')
    // The other filter counts only among the rows this one leaves.
    expect(optionsOf(wrapper, 'Tags')).toEqual([
      { value: '\u0000', label: 'Any' },
      { value: 'sf', label: 'sf (2)' },
      { value: 'classic', label: 'classic (1)' },
    ])
    filterSelect(wrapper, 'Tags').vm.$emit('update:modelValue', 'classic')
    await nextTick()
    expect(titles()).toEqual(['Dune'])
    filterSelect(wrapper, 'Shelf').vm.$emit('update:modelValue', '\u0000')
    await nextTick()
    expect(state.filters).toEqual({ shelf: '', tags: 'classic' })
    expect(titles()).toEqual(['Dune', 'Emma'])
  })

  it('lets go of a choice no row holds any more, and says when nothing matches', async () => {
    const { wrapper, state } = table()
    state.filters = { shelf: 'Cellar' }
    await nextTick()
    await nextTick()
    expect(state.filters).toEqual({ shelf: '' })
    expect(wrapper.findAll('tbody tr.kit-data-table__row')).toHaveLength(5)

    state.search = 'zzz'
    await nextTick()
    expect(wrapper.text()).toContain('Nothing matches the search')
  })

  it('shows the server’s counts where the server pages the list, and filters nothing itself', async () => {
    const { wrapper, titles } = table({
      total: 40,
      facets: { shelf: [{ value: 'Attic', count: 9 }] },
    })
    await nextTick()
    filterSelect(wrapper, 'Shelf').vm.$emit('update:modelValue', 'Attic')
    await nextTick()
    expect(optionsOf(wrapper, 'Shelf')).toContainEqual({
      value: 'Attic',
      label: 'Attic (9)',
    })
    expect(titles()).toHaveLength(5)
  })
})

describe('KitDataTable’s groups', () => {
  it('keeps the rows of a group together under its heading, sorted within it', async () => {
    const { wrapper, state } = table({ groupBy: 'shelf' })
    await nextTick()
    const read = () =>
      wrapper
        .findAll('tbody')
        .map((group) => [
          group.get('tr.kit-data-table__group th').text(),
          ...group.findAll('tr.kit-data-table__row').map((row) => row.get('th').text()),
        ])
    expect(read()).toEqual([
      ['Hall', 'Dune', 'Ubik'],
      ['Study', 'Emma', 'Kindred'],
      // Rows with nothing in the field come last, as nothing sorts last.
      ['None', '=SUM(A1)'],
    ])
    const heading = wrapper.get('tr.kit-data-table__group th')
    expect(heading.attributes('scope')).toBe('rowgroup')
    expect(heading.attributes('colspan')).toBe(String(columns.length))
    state.sort = { key: 'title', direction: 'descending' }
    await nextTick()
    expect(read()).toEqual([
      ['Hall', 'Ubik', 'Dune'],
      ['Study', 'Kindred', 'Emma'],
      ['None', '=SUM(A1)'],
    ])
    expect(await axeFindings(wrapper)).toEqual([])
  })

  it('groups by a field no column shows, under the app’s own heading', async () => {
    const { wrapper } = table(
      { groupBy: 'author', columns: columns.filter((column) => column.key !== 'author') },
      {
        group: ({ value, rows }: { value: string; rows: Book[] }) =>
          `${value}: ${String(rows.length)}`,
      },
    )
    await nextTick()
    expect(wrapper.findAll('tr.kit-data-table__group th').map((th) => th.text())).toEqual([
      'Anon, "the" writer: 1',
      'Austen: 1',
      'Butler: 1',
      'Dick: 1',
      'Herbert: 1',
    ])
  })
})

describe('KitDataTable’s CSV', () => {
  it('saves every row matching, in the order shown, each column as it reads', async () => {
    const saved: Blob[] = []
    vi.spyOn(URL, 'createObjectURL').mockImplementation((blob) => {
      saved.push(blob as Blob)
      return 'blob:rows'
    })
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined)
    const clicked = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => undefined)
    const { wrapper, state } = table({ csv: 'books', pageSize: 2 })
    state.sort = { key: 'title', direction: 'ascending' }
    state.search = 'e'
    await nextTick()
    const button = wrapper.findAll('button').find((b) => b.text() === 'Download as CSV')
    await button?.trigger('click')
    expect(clicked).toHaveBeenCalledOnce()
    expect((clicked.mock.contexts[0] as HTMLAnchorElement).download).toBe('books.csv')
    // The file starts with a byte-order mark, which reading it as text takes off.
    const bytes = new Uint8Array((await saved[0]?.arrayBuffer()) ?? new ArrayBuffer(0))
    expect([...bytes.slice(0, 3)]).toEqual([0xef, 0xbb, 0xbf])
    const text = await saved[0]?.text()
    expect(text).toBe(
      'Title,Author,Shelf,Pages,Tags\r\n' +
        '\'=SUM(A1),"Anon, ""the"" writer",,-5,\r\n' +
        'Dune,Herbert,Hall,412,"sf, classic"\r\n' +
        'Emma,Austen,Study,474,classic\r\n' +
        'Kindred,Butler,Study,264,sf\r\n',
    )
  })

  it('has the page fetch the rows where the server pages the list, and can’t save nothing', async () => {
    const saved: Blob[] = []
    vi.spyOn(URL, 'createObjectURL').mockImplementation((blob) => {
      saved.push(blob as Blob)
      return 'blob:rows'
    })
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined)
    const clicked = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => undefined)
    const server = table({ csv: 'books', total: 99 })
    await nextTick()
    await server.wrapper
      .findAll('button')
      .find((b) => b.text() === 'Download as CSV')
      ?.trigger('click')
    expect(server.state.downloads).toBe(1)
    expect(clicked).not.toHaveBeenCalled()
    // The page hands the rows it fetched back, and they're saved with the table's own columns.
    const exposed = server.wrapper.findComponent(Table).vm as unknown as {
      exportCsv: (rows: readonly Book[], filename?: string) => void
    }
    exposed.exportCsv(books.slice(1, 2), 'shelf.CSV')
    expect((clicked.mock.contexts[0] as HTMLAnchorElement).download).toBe('shelf.CSV')
    expect(await saved[0]?.text()).toBe(
      'Title,Author,Shelf,Pages,Tags\r\nEmma,Austen,Study,474,classic\r\n',
    )

    const empty = table({ csv: 'books', rows: [] })
    await nextTick()
    const button = empty.wrapper.findAll('button').find((b) => b.text() === 'Download as CSV')
    expect(button?.attributes('disabled')).toBeDefined()
  })

  it('writes a cell as RFC 4180 does, a formula’s words as words and a number as a number', () => {
    expect(csvCell(undefined)).toBe('')
    expect(csvCell(-3)).toBe('-3')
    expect(csvCell('-3')).toBe("'-3")
    expect(csvCell('@user')).toBe("'@user")
    expect(csvCell('a\nb')).toBe('"a\nb"')
    expect(csvCell(true)).toBe('true')
    expect(toCsv([{ label: 'A', value: (row: number) => row }], [1, 2])).toBe('A\r\n1\r\n2\r\n')
  })
})

describe('KitDataTable’s column widths', () => {
  it('widens and narrows a column by the keys on its edge, and puts it back', async () => {
    const { wrapper, state } = table({ resizable: true })
    state.widths = { title: 100 }
    await nextTick()
    const edges = wrapper.findAll('[role="separator"]')
    expect(edges).toHaveLength(columns.length)
    const title = edges[0]
    if (!title) {
      throw new Error('No edge.')
    }
    expect(title.attributes()).toMatchObject({
      'aria-label': 'Width of Title',
      'aria-orientation': 'vertical',
      tabindex: '0',
      'aria-valuemin': '48',
    })
    // The heading is named by its label alone, not with its edge's name after it.
    expect(wrapper.get('thead th').attributes('aria-label')).toBe('Title')
    await title.trigger('keydown', { key: 'ArrowRight' })
    expect(state.widths).toEqual({ title: 116 })
    await title.trigger('keydown', { key: 'ArrowRight', shiftKey: true })
    expect(state.widths).toEqual({ title: 180 })
    await title.trigger('keydown', { key: 'ArrowLeft' })
    expect(state.widths).toEqual({ title: 164 })
    expect(wrapper.get('thead th').attributes('style')).toContain('width: 164px')
    expect(title.attributes('aria-valuenow')).toBe('164')
    await title.trigger('keydown', { key: 'a' })
    await title.trigger('keydown', { key: 'Home' })
    expect(state.widths).toEqual({})
    expect(await axeFindings(wrapper)).toEqual([])
  })

  it('follows a drag of a column’s edge from its width as drawn', async () => {
    const { wrapper, state } = table({ resizable: true })
    await nextTick()
    const edge = wrapper.get('[role="separator"]').element as HTMLElement
    Object.assign(edge, { setPointerCapture: () => undefined })
    vi.spyOn(edge.closest('th') as HTMLElement, 'getBoundingClientRect').mockReturnValue(
      new DOMRect(0, 0, 200, 40),
    )
    edge.dispatchEvent(
      new PointerEvent('pointerdown', { clientX: 100, pointerId: 1, bubbles: true }),
    )
    edge.dispatchEvent(new PointerEvent('pointermove', { clientX: 150, pointerId: 1 }))
    expect(state.widths).toEqual({ title: 250 })
    edge.dispatchEvent(new PointerEvent('pointermove', { clientX: -500, pointerId: 1 }))
    expect(state.widths).toEqual({ title: 48 })
    edge.dispatchEvent(new PointerEvent('pointerup', { pointerId: 1 }))
    edge.dispatchEvent(new PointerEvent('pointermove', { clientX: 300, pointerId: 1 }))
    expect(state.widths).toEqual({ title: 48 })
  })

  it('offers each column’s width to a single press as well, in its panel', async () => {
    const { wrapper, state } = table({ resizable: true })
    state.widths = { author: 100 }
    await nextTick()
    const opener = wrapper.findAll('button').find((b) => b.text() === 'Column widths')
    opener?.element.dispatchEvent(
      new PointerEvent('pointerdown', { bubbles: true, pointerType: 'mouse' }),
    )
    await opener?.trigger('click')
    await flushPromises()
    const press = (words: string): void => {
      const found = [...document.querySelectorAll<HTMLButtonElement>('.kit-popover button')].find(
        (b) => b.textContent.replace(/\s+/g, ' ').trim() === words,
      )
      found?.click()
    }
    press('Wider Author')
    await nextTick()
    expect(state.widths.author).toBe(164)
    press('Narrower Author')
    await nextTick()
    press('Narrower Author')
    await nextTick()
    expect(state.widths.author).toBe(48)
    press('Put the widths back')
    await nextTick()
    expect(state.widths).toEqual({})
  })
})

describe('KitDataTable’s cards', () => {
  it('shows each row as a card, each cell named, where it is narrower than `stackBelow`', async () => {
    vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(500)
    const { wrapper } = table({ stackBelow: '40rem', resizable: true })
    await nextTick()
    expect(wrapper.get('.kit-data-table').classes()).toContain('is-stacked')
    expect(wrapper.get('table').attributes()).toMatchObject({
      role: 'table',
      'aria-label': 'Books',
    })
    const row = wrapper.get('tr.kit-data-table__row')
    expect(row.attributes('role')).toBe('row')
    expect(row.get('th').attributes()).toMatchObject({ role: 'rowheader', 'data-label': 'Title' })
    expect(row.findAll('td')[0]?.attributes()).toMatchObject({
      role: 'cell',
      'data-label': 'Author',
    })
    expect(row.findAll('td').at(-1)?.attributes('data-label')).toBeUndefined()
    expect(wrapper.find('[role="separator"]').exists()).toBe(false)
    expect(wrapper.findAll('button').some((b) => b.text() === 'Column widths')).toBe(false)
    expect(await axeFindings(wrapper)).toEqual([])
  })

  it('stays a table where it is wider, or `stackBelow` says nothing a length can be', async () => {
    vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(1000)
    const wide = table({ stackBelow: '640px' })
    const unread = table({ stackBelow: 'wide' })
    const bare = table({ stackBelow: '2000' })
    await nextTick()
    expect(wide.wrapper.find('.is-stacked').exists()).toBe(false)
    expect(unread.wrapper.find('.is-stacked').exists()).toBe(false)
    expect(bare.wrapper.get('table').attributes('role')).toBe('table')
  })
})

describe('KitDataTable’s pages and toolbar', () => {
  it('offers a choice of rows on a page, which starts the pages again from the first', async () => {
    const { wrapper, state, titles } = table({ pageSizes: [2, 4], pageSize: 2 })
    state.page = 2
    await flushPromises()
    expect(titles()).toEqual(['Ubik', '=SUM(A1)'])
    const size = filterSelect(wrapper, 'Rows on a page')
    expect((size.props() as { options: unknown }).options).toEqual([
      { value: 2, label: '2' },
      { value: 4, label: '4' },
    ])
    size.vm.$emit('update:modelValue', 4)
    await flushPromises()
    expect(state.pageSize).toBe(4)
    expect(state.page).toBe(1)
    expect(titles()).toEqual(['Dune', 'Emma', 'Ubik', '=SUM(A1)'])
    expect(await axeFindings(wrapper)).toEqual([])
  })

  it('shows its pages over the rows as well, each navigation named apart', async () => {
    const { wrapper } = table({ pageSize: 2, pagesAbove: true })
    await flushPromises()
    const navs = wrapper.findAll('nav')
    expect(navs.map((nav) => nav.attributes('aria-label'))).toEqual([
      'Pages of Books',
      'Pages of Books, under the rows',
    ])
    expect(await axeFindings(wrapper)).toEqual([])
  })

  it('puts the app’s own buttons in its toolbar', () => {
    const { wrapper } = table({}, { toolbar: () => h('button', { type: 'button' }, 'Add a book') })
    expect(wrapper.get('.kit-data-table__toolbar .kit-data-table__actions button').text()).toBe(
      'Add a book',
    )
  })
})
