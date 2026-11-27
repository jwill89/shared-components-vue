import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { h, nextTick, reactive } from 'vue'
import { mount } from '@vue/test-utils'
import KitReorderList from '../components/KitReorderList.vue'
import { announce } from '../composables/useAnnouncer'
import { axeFindings, kept, unmountKept } from './helpers'

vi.mock(import('../composables/useAnnouncer'), async (original) => ({
  ...(await original()),
  announce: vi.fn(),
}))

afterEach(unmountKept)
beforeEach(() => {
  vi.mocked(announce).mockClear()
})

interface Page {
  id: number
  title: string
}

/** A list of three pages, its model kept as a page keeps it. */
function pages(props: Record<string, unknown> = {}) {
  const state = reactive({
    rows: [
      { id: 1, title: 'Welcome' },
      { id: 2, title: 'Rules' },
      { id: 3, title: 'Menu' },
    ] as Page[],
  })
  const moves: [Page, number, number][] = []
  const wrapper = kept(
    mount(
      {
        render: () =>
          h(KitReorderList<Page>, {
            label: 'Pages',
            rowKey: 'id',
            rowLabel: 'title',
            ...props,
            modelValue: state.rows,
            'onUpdate:modelValue': (next: Page[]) => {
              state.rows = next
            },
            onMove: (row: Page, from: number, to: number) => {
              moves.push([row, from, to])
            },
          }),
      },
      { attachTo: document.body },
    ),
  )
  return { wrapper, state, moves }
}

function titles(state: { rows: Page[] }): string[] {
  return state.rows.map((row) => row.title)
}

function button(name: string): HTMLButtonElement {
  const found = [...document.querySelectorAll<HTMLButtonElement>('button')].find(
    (candidate) => candidate.getAttribute('aria-label') === name,
  )
  if (!found) {
    throw new Error(`No button is named “${name}”.`)
  }
  return found
}

function key(target: Element, name: string): KeyboardEvent {
  const event = new KeyboardEvent('keydown', { key: name, bubbles: true, cancelable: true })
  target.dispatchEvent(event)
  return event
}

function pointer(target: Element, type: string, clientY: number): void {
  target.dispatchEvent(
    new PointerEvent(type, { bubbles: true, pointerType: 'mouse', button: 0, clientY }),
  )
}

/** Lays the rows out 44 px apart from the top, as a browser would, for a drag to measure. */
function layOut(wrapper: ReturnType<typeof pages>['wrapper']): void {
  const rows = wrapper.findAll('li')
  wrapper.get('ol').element.getBoundingClientRect = () => new DOMRect(0, 0, 300, rows.length * 44)
  rows.forEach((row, index) => {
    row.element.getBoundingClientRect = () => new DOMRect(0, index * 44, 300, 44)
  })
}

/** Where each row is drawn while one is in hand: how far it is moved from its own place. */
function shifts(wrapper: ReturnType<typeof pages>['wrapper']): string[] {
  return wrapper.findAll('li').map((row) => row.element.style.transform)
}

describe('KitReorderList', () => {
  it('names the list and each row’s buttons, with the ends’ buttons off, and nothing axe finds', async () => {
    const { wrapper } = pages()
    expect(wrapper.get('ol').attributes('aria-label')).toBe('Pages')
    expect(
      wrapper.findAll('li').map((row) => row.find('.kit-reorder-list__content').text()),
    ).toEqual(['Welcome', 'Rules', 'Menu'])
    expect(button('Move Welcome up').disabled).toBe(true)
    expect(button('Move Menu down').disabled).toBe(true)
    expect(button('Move Rules: drag, or press the up and down arrow keys').disabled).toBe(false)
    expect(await axeFindings(wrapper)).toEqual([])
  })

  it('moves a row by its buttons, the focus going with it, and says where it went', async () => {
    const { state, moves } = pages()
    button('Move Welcome down').click()
    await nextTick()
    await nextTick()
    expect(titles(state)).toEqual(['Rules', 'Welcome', 'Menu'])
    expect(moves).toEqual([[{ id: 1, title: 'Welcome' }, 0, 1]])
    expect(announce).toHaveBeenCalledWith('Welcome, 2 of 3', 'polite')
    expect(document.activeElement).toBe(button('Move Welcome down'))

    button('Move Welcome down').click()
    await nextTick()
    await nextTick()
    expect(titles(state)).toEqual(['Rules', 'Menu', 'Welcome'])
    // At the end, its Down is off, so the focus rests on its handle.
    expect(document.activeElement?.getAttribute('data-move')).toBe('handle')
  })

  it('moves a row by the arrow keys on its handle, and Home and End take it to either end', async () => {
    const { state } = pages()
    const handle = button('Move Menu: drag, or press the up and down arrow keys')
    expect(key(handle, 'ArrowUp').defaultPrevented).toBe(true)
    await nextTick()
    await nextTick()
    expect(titles(state)).toEqual(['Welcome', 'Menu', 'Rules'])
    expect(document.activeElement).toBe(
      button('Move Menu: drag, or press the up and down arrow keys'),
    )

    key(button('Move Menu: drag, or press the up and down arrow keys'), 'Home')
    await nextTick()
    expect(titles(state)).toEqual(['Menu', 'Welcome', 'Rules'])
    key(button('Move Menu: drag, or press the up and down arrow keys'), 'End')
    await nextTick()
    expect(titles(state)).toEqual(['Welcome', 'Rules', 'Menu'])
    // A key past the end, or one it doesn't use, leaves the list and the key alone.
    expect(
      key(button('Move Menu: drag, or press the up and down arrow keys'), 'ArrowDown')
        .defaultPrevented,
    ).toBe(true)
    expect(
      key(button('Move Menu: drag, or press the up and down arrow keys'), 'a').defaultPrevented,
    ).toBe(false)
    expect(titles(state)).toEqual(['Welcome', 'Rules', 'Menu'])
  })

  it('carries a dragged row with the pointer, the rows it passes moving aside to make its room', async () => {
    const { wrapper, state } = pages()
    layOut(wrapper)
    const handle = wrapper.findAll('.kit-reorder-list__handle')[0]?.element as HTMLElement
    pointer(handle, 'pointerdown', 20)
    pointer(handle, 'pointermove', 60)
    await nextTick()
    expect(wrapper.get('ol').classes()).toContain('kit-reorder-list--moving')
    expect(wrapper.findAll('li')[0]?.classes()).toContain('kit-reorder-list__row--held')
    // 40 px down, its bottom past the second row's middle: the second moves up into its place.
    expect(shifts(wrapper)).toEqual(['translateY(40px)', 'translateY(-44px)', 'translateY(0px)'])

    // Carried past the list's end, it stops at the bottom, and the rows above it close up.
    pointer(handle, 'pointermove', 400)
    await nextTick()
    expect(shifts(wrapper)).toEqual(['translateY(88px)', 'translateY(-44px)', 'translateY(-44px)'])
    pointer(handle, 'pointerup', 400)
    await nextTick()
    expect(titles(state)).toEqual(['Rules', 'Menu', 'Welcome'])
    expect(wrapper.find('.kit-reorder-list__row--held').exists()).toBe(false)
    expect(shifts(wrapper)).toEqual(['', '', ''])
  })

  it('puts a dragged row back on Escape, and takes no drag while off', async () => {
    const { wrapper, state } = pages()
    layOut(wrapper)
    const handle = wrapper.findAll('.kit-reorder-list__handle')[2]?.element as HTMLElement
    pointer(handle, 'pointerdown', 110)
    pointer(handle, 'pointermove', 10)
    await nextTick()
    // Held against the top, it would land first, the two rows above it moving down.
    expect(shifts(wrapper)).toEqual(['translateY(44px)', 'translateY(44px)', 'translateY(-88px)'])
    key(handle, 'Escape')
    pointer(handle, 'pointerup', 10)
    await nextTick()
    expect(titles(state)).toEqual(['Welcome', 'Rules', 'Menu'])

    await wrapper.setProps({})
    const off = pages({ disabled: true })
    const offHandle = off.wrapper.findAll('.kit-reorder-list__handle')[0]?.element as HTMLElement
    expect((offHandle as HTMLButtonElement).disabled).toBe(true)
    pointer(offHandle, 'pointerdown', 20)
    pointer(offHandle, 'pointermove', 120)
    pointer(offHandle, 'pointerup', 120)
    key(offHandle, 'ArrowDown')
    await nextTick()
    expect(titles(off.state)).toEqual(['Welcome', 'Rules', 'Menu'])
  })

  it('moves a row up by its Up button, and leaves the list as it was when a drag goes nowhere', async () => {
    const { wrapper, state } = pages()
    button('Move Menu up').click()
    await nextTick()
    await nextTick()
    expect(titles(state)).toEqual(['Welcome', 'Menu', 'Rules'])
    expect(document.activeElement).toBe(button('Move Menu up'))

    layOut(wrapper)
    const handle = wrapper.findAll('.kit-reorder-list__handle')[0]?.element as HTMLElement
    pointer(handle, 'pointerdown', 20)
    pointer(handle, 'pointerup', 20)
    pointer(handle, 'pointerdown', 20)
    pointer(handle, 'pointermove', 120)
    pointer(handle, 'pointercancel', 120)
    pointer(handle, 'pointerup', 120)
    await nextTick()
    expect(titles(state)).toEqual(['Welcome', 'Menu', 'Rules'])
  })

  it('scrolls the frame it sits in, where one scrolls, when a row is held near its edge', async () => {
    const frame = document.createElement('div')
    frame.style.overflowY = 'auto'
    Object.defineProperty(frame, 'scrollHeight', { value: 400 })
    Object.defineProperty(frame, 'clientHeight', { value: 100 })
    frame.getBoundingClientRect = () => new DOMRect(0, 200, 300, 100)
    const scrolled = vi.fn()
    frame.scrollBy = scrolled
    document.body.append(frame)
    const wrapper = kept(
      mount(KitReorderList<Page>, {
        props: {
          label: 'Pages',
          rowKey: 'id',
          rowLabel: 'title',
          modelValue: [
            { id: 1, title: 'Welcome' },
            { id: 2, title: 'Rules' },
          ],
        },
        attachTo: frame,
      }),
    )
    const handle = wrapper.findAll('.kit-reorder-list__handle')[0]?.element as HTMLElement
    pointer(handle, 'pointerdown', 220)
    pointer(handle, 'pointermove', 210)
    pointer(handle, 'pointermove', 290)
    pointer(handle, 'pointerup', 290)
    expect(scrolled).toHaveBeenNthCalledWith(1, 0, -16)
    expect(scrolled).toHaveBeenNthCalledWith(2, 0, 16)
    wrapper.unmount()
    frame.remove()
  })

  it('scrolls the page when a row is held near its edge', async () => {
    const { wrapper } = pages()
    layOut(wrapper)
    const scrolled = vi.fn()
    const page = document.scrollingElement ?? document.documentElement
    page.scrollBy = scrolled
    const handle = wrapper.findAll('.kit-reorder-list__handle')[1]?.element as HTMLElement
    pointer(handle, 'pointerdown', 60)
    pointer(handle, 'pointermove', 4)
    pointer(handle, 'pointermove', window.innerHeight - 4)
    pointer(handle, 'pointerup', window.innerHeight - 4)
    expect(scrolled).toHaveBeenNthCalledWith(1, 0, -16)
    expect(scrolled).toHaveBeenNthCalledWith(2, 0, 16)
  })

  it('takes a row’s content from its slot, and its key and name from functions', () => {
    const wrapper = kept(
      mount(KitReorderList<Page>, {
        props: {
          label: 'Pages',
          rowKey: (row: Page) => `page-${String(row.id)}`,
          rowLabel: (row: Page) => row.title.toUpperCase(),
          modelValue: [{ id: 1, title: 'Welcome' }],
        },
        slots: { row: ({ row }: { row: Page }) => h('strong', row.title) },
      }),
    )
    expect(wrapper.find('strong').text()).toBe('Welcome')
    expect(wrapper.find('[data-move="up"]').attributes('aria-label')).toBe('Move WELCOME up')
  })
})
