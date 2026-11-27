import { afterEach, describe, expect, it } from 'vitest'
import { h, nextTick, reactive } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import KitAccordion from '../components/KitAccordion.vue'
import KitDisclosure from '../components/KitDisclosure.vue'
import { axeFindings, kept, unmountKept } from './helpers'

afterEach(unmountKept)

/** A disclosure, its open state kept in step as a page's v-model:open keeps it. */
function disclosure(props: Record<string, unknown> = {}): {
  wrapper: ReturnType<typeof mount>
  state: { open: boolean }
} {
  const state = reactive({ open: false })
  const wrapper = kept(
    mount(
      {
        render: () =>
          h(
            KitDisclosure,
            {
              summary: 'Older releases',
              ...props,
              open: state.open,
              'onUpdate:open': (next: boolean) => {
                state.open = next
              },
            },
            { default: () => h('label', ['Note ', h('input', { type: 'text' })]) },
          ),
      },
      { attachTo: document.body },
    ),
  )
  return { wrapper, state }
}

describe('KitDisclosure', () => {
  it('opens and closes under a button that says whether it is open', async () => {
    const { wrapper, state } = disclosure()
    await nextTick()
    const button = wrapper.get('button')
    expect(button.text()).toBe('Older releases')
    expect(button.attributes('aria-expanded')).toBe('false')
    const content = wrapper.get(`[id="${String(button.attributes('aria-controls'))}"]`)
    // Closed, it stays in the page, hidden: `until-found` in a browser, for find in page to reach
    // (e2e/disclosures.spec.ts), which jsdom reads as plain `hidden`.
    expect(content.attributes('hidden')).toBeDefined()
    expect(content.find('input').exists()).toBe(true)
    expect(await axeFindings(wrapper)).toEqual([])

    await button.trigger('click')
    expect(state.open).toBe(true)
    await nextTick()
    expect(button.attributes('aria-expanded')).toBe('true')
    expect(content.attributes('hidden')).toBeUndefined()
    expect(await axeFindings(wrapper)).toEqual([])
  })

  it('keeps what was typed in it while it is closed', async () => {
    const { wrapper } = disclosure()
    const button = wrapper.get('button')
    await button.trigger('click')
    await nextTick()
    const input = wrapper.get<HTMLInputElement>('input')
    await input.setValue('Kept')
    await button.trigger('click')
    await nextTick()
    await button.trigger('click')
    await nextTick()
    expect(wrapper.get<HTMLInputElement>('input').element.value).toBe('Kept')
  })

  it('sits in a heading of the level given, and opens from the page', async () => {
    const { wrapper, state } = disclosure({ headingLevel: 2 })
    expect(wrapper.get('h2 button').text()).toBe('Older releases')
    state.open = true
    await nextTick()
    expect(wrapper.get('button').attributes('aria-expanded')).toBe('true')
  })
})

const releases = [
  { value: 'unreleased', title: 'Unreleased' },
  { value: '1.1.0', title: 'v1.1.0' },
  { value: '1.0.0', title: 'v1.0.0', disabled: true },
]

/** An accordion, its list of those open kept in step as a page's v-model keeps it. */
function accordion(
  open: string[],
  props: Record<string, unknown> = {},
): { wrapper: ReturnType<typeof mount>; state: { open: string[] } } {
  const state = reactive({ open })
  const wrapper = kept(
    mount(
      {
        render: () =>
          h(
            KitAccordion,
            {
              items: releases,
              ...props,
              modelValue: state.open,
              'onUpdate:modelValue': (next: string[]) => {
                state.open = next
              },
            },
            {
              default: ({ item }: { item: { title: string } }) => `What changed in ${item.title}.`,
            },
          ),
      },
      { attachTo: document.body },
    ),
  )
  return { wrapper, state }
}

describe('KitAccordion', () => {
  it('puts each button in a heading, and each part in a region named by its button', async () => {
    const { wrapper } = accordion(['unreleased'])
    await nextTick()
    const buttons = wrapper.findAll('h3 button')
    // Each names its part, closed or open, before it is ever pressed.
    for (const button of buttons) {
      expect(wrapper.find(`[id="${String(button.attributes('aria-controls'))}"]`).exists()).toBe(
        true,
      )
    }
    expect(buttons.map((b) => b.text())).toEqual(['Unreleased', 'v1.1.0', 'v1.0.0'])
    expect(buttons.map((b) => b.attributes('aria-expanded'))).toEqual(['true', 'false', 'false'])
    const region = wrapper.get('[role="region"]:not([hidden])')
    expect(region.attributes('aria-labelledby')).toBe(buttons[0]?.attributes('id'))
    expect(region.text()).toBe('What changed in Unreleased.')
    expect(await axeFindings(wrapper)).toEqual([])
  })

  it('opens one at a time, and closes the one open when pressed again', async () => {
    const { wrapper, state } = accordion(['unreleased'])
    await flushPromises()
    const buttons = wrapper.findAll('button')
    await buttons[1]?.trigger('click')
    expect(state.open).toEqual(['1.1.0'])
    await nextTick()
    await buttons[1]?.trigger('click')
    expect(state.open).toEqual([])
  })

  it('opens several at once, and every one that can be by Open all', async () => {
    const { wrapper, state } = accordion([], { multiple: true, toggleAll: true, headingLevel: 2 })
    await flushPromises()
    const parts = wrapper.findAll('h2 button')
    await parts[0]?.trigger('click')
    await nextTick()
    await parts[1]?.trigger('click')
    expect(state.open).toEqual(['unreleased', '1.1.0'])
    await nextTick()

    const [openAll, closeAll] = wrapper.findAll('.kit-accordion__toolbar button')
    await closeAll?.trigger('click')
    expect(state.open).toEqual([])
    await openAll?.trigger('click')
    expect(state.open).toEqual(['unreleased', '1.1.0'])
    expect(await axeFindings(wrapper)).toEqual([])
  })

  it('draws a button’s words and its chevron from the app’s slots', () => {
    const wrapper = kept(
      mount(KitAccordion, {
        props: { items: releases, modelValue: [] },
        slots: {
          title: ({ item }: { item: { title: string } }) => h('strong', item.title),
          icon: () => h('svg', { 'data-icon': 'angle' }),
        },
      }),
    )
    expect(wrapper.findAll('h3 strong').map((title) => title.text())).toEqual([
      'Unreleased',
      'v1.1.0',
      'v1.0.0',
    ])
    expect(wrapper.findAll('[data-icon="angle"]')).toHaveLength(3)
    expect(wrapper.find('[data-glyph="chevron"]').exists()).toBe(false)
  })
})

describe('KitDisclosure’s slots', () => {
  it('draws its button’s words and chevron from the app’s slots', () => {
    const wrapper = kept(
      mount(KitDisclosure, {
        slots: {
          summary: () => h('strong', 'Older releases'),
          icon: () => h('svg', { 'data-icon': 'angle' }),
          default: 'v0.1.0',
        },
      }),
    )
    expect(wrapper.get('button strong').text()).toBe('Older releases')
    expect(wrapper.find('[data-icon="angle"]').exists()).toBe(true)
    expect(wrapper.find('[data-glyph="chevron"]').exists()).toBe(false)
  })
})
