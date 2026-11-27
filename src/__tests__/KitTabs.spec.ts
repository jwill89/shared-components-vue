import { afterEach, describe, expect, it } from 'vitest'
import { defineComponent, h, nextTick, ref } from 'vue'
import { mount } from '@vue/test-utils'
import { soon } from '../../shared/test/web/wait.js'
import KitTabs from '../components/KitTabs.vue'
import { axeFindings, kept, unmountKept } from './helpers'

afterEach(unmountKept)

const tabs = [
  { key: 'books', label: 'Books' },
  { key: 'loans', label: 'Loans' },
  { key: 'notes', label: 'Notes' },
]

function page(withIcons = false) {
  const chosen = ref('books')
  const wrapper = kept(
    mount(
      defineComponent({
        setup: () => () =>
          h(
            KitTabs,
            {
              tabs,
              label: 'Shelf',
              modelValue: chosen.value,
              'onUpdate:modelValue': (next: string) => {
                chosen.value = next
              },
            },
            {
              books: () => h('p', 'Twelve books.'),
              loans: () => h('p', 'Two out on loan.'),
              notes: () => h('p', 'No notes yet.'),
              ...(withIcons
                ? {
                    icon: ({ tab }: { tab: { key: string } }) => h('svg', { 'data-icon': tab.key }),
                  }
                : {}),
            },
          ),
      }),
      { attachTo: document.body },
    ),
  )
  return { wrapper, chosen }
}

function key(element: Element, name: string): void {
  element.dispatchEvent(new KeyboardEvent('keydown', { key: name, bubbles: true }))
}

describe('KitTabs', () => {
  it('names its row of tabs and shows the chosen tab’s part, with nothing axe finds', async () => {
    const { wrapper } = page()
    await nextTick()
    const list = wrapper.get('[role="tablist"]')
    expect(list.attributes('aria-label')).toBe('Shelf')
    expect(wrapper.findAll('[role="tab"]').map((tab) => tab.text())).toEqual([
      'Books',
      'Loans',
      'Notes',
    ])
    expect(wrapper.get('[role="tab"][aria-selected="true"]').text()).toBe('Books')
    expect(wrapper.get('[role="tabpanel"][data-state="active"]').text()).toBe('Twelve books.')
    expect(await axeFindings(wrapper)).toEqual([])
  })

  it('moves along the row by the arrow keys, and chooses on Enter, not on passing', async () => {
    const { wrapper, chosen } = page()
    await nextTick()
    const [books, loans] = wrapper.findAll('[role="tab"]').map((tab) => tab.element as HTMLElement)
    books?.focus()
    if (books) {
      key(books, 'ArrowRight')
    }
    await nextTick()
    expect(document.activeElement).toBe(loans)
    expect(chosen.value).toBe('books')
    if (loans) {
      key(loans, 'Enter')
    }
    await nextTick()
    expect(chosen.value).toBe('loans')
    await soon(() => {
      expect(wrapper.get('[role="tabpanel"][data-state="active"]').text()).toBe('Two out on loan.')
    })
  })

  it('draws each tab’s icon from its slot, hidden from screen readers', async () => {
    const { wrapper } = page(true)
    await nextTick()
    const icon = wrapper.get('[data-icon="loans"]')
    expect(icon.element.closest('[aria-hidden="true"]')).not.toBeNull()
    expect(wrapper.findAll('[role="tab"]')[1]?.text()).toBe('Loans')
  })
  it('shows a tab’s count after its words, read with them', () => {
    const wrapper = kept(
      mount(KitTabs, {
        props: {
          tabs: [
            { key: 'readings', label: 'Readings', count: 1234 },
            { key: 'drafts', label: 'Drafts' },
          ],
          label: 'Journal',
          modelValue: 'readings',
        },
        slots: { readings: () => h('p', 'All of them.'), drafts: () => h('p', 'None.') },
      }),
    )
    const tabs = wrapper.findAll('[role="tab"]')
    expect(tabs.map((tab) => tab.text())).toEqual(['Readings 1,234', 'Drafts'])
    expect(tabs[0]?.get('.kit-tabs__count').text()).toBe('1,234')
  })
})
