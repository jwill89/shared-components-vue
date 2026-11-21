import { afterEach, describe, expect, it } from 'vitest'
import { defineComponent, h, nextTick, ref } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import KitButton from '../components/KitButton.vue'
import KitDrawer from '../components/KitDrawer.vue'
import { axeFindings, kept, unmountKept } from './helpers'

afterEach(unmountKept)

function page(props: Record<string, unknown> = {}) {
  const open = ref(false)
  kept(
    mount(
      defineComponent({
        setup: () => () =>
          h(
            KitDrawer,
            {
              title: 'History',
              ...props,
              open: open.value,
              'onUpdate:open': (next: boolean) => {
                open.value = next
              },
            },
            {
              trigger: () => h(KitButton, null, () => 'Show the history'),
              default: () => h('p', 'Renamed to Living room, an hour ago.'),
              footer: () => h(KitButton, null, () => 'Load more'),
            },
          ),
      }),
      { attachTo: document.body },
    ),
  )
  return { open }
}

function button(name: string): HTMLButtonElement {
  const found = [...document.querySelectorAll('button')].find(
    (candidate) => (candidate.getAttribute('aria-label') ?? candidate.textContent.trim()) === name,
  )
  if (!found) {
    throw new Error(`No "${name}" button.`)
  }
  return found
}

function drawer(): HTMLElement {
  const found = document.querySelector<HTMLElement>('[role="dialog"]')
  if (!found) {
    throw new Error('No drawer is open.')
  }
  return found
}

async function openIt(): Promise<HTMLButtonElement> {
  const opener = button('Show the history')
  opener.focus()
  opener.click()
  await flushPromises()
  await nextTick()
  return opener
}

describe('KitDrawer', () => {
  it('opens as a modal named by its title, at the end of the line, with nothing axe finds', async () => {
    page({ description: 'Every change to this shelf.' })
    await openIt()
    const panel = drawer()
    expect(panel.getAttribute('aria-modal')).toBe('true')
    expect(panel.classList).toContain('kit-drawer--end')
    expect(document.getElementById(panel.getAttribute('aria-labelledby') ?? '')?.textContent).toBe(
      'History',
    )
    expect(
      document.getElementById(panel.getAttribute('aria-describedby') ?? '')?.textContent.trim(),
    ).toBe('Every change to this shelf.')
    expect(panel.querySelector('.kit-drawer__body')?.textContent).toContain('Renamed')
    expect(panel.querySelector('.kit-drawer__footer')?.textContent).toContain('Load more')
    expect(await axeFindings(document.body)).toEqual([])
  })

  it('stands at the start of the line when asked, and names no description it hasn’t', async () => {
    page({ side: 'start' })
    await openIt()
    expect(drawer().classList).toContain('kit-drawer--start')
    expect(drawer().hasAttribute('aria-describedby')).toBe(false)
  })

  it('closes on its Close button and gives focus back to what opened it', async () => {
    const { open } = page()
    const opener = await openIt()
    button('Close').click()
    await flushPromises()
    expect(open.value).toBe(false)
    expect(document.querySelector('[role="dialog"]')).toBeNull()
    expect(document.activeElement).toBe(opener)
  })

  it('opens from the page alone, with no trigger of its own', async () => {
    kept(
      mount(KitDrawer, {
        props: { title: 'Filters', open: true },
        slots: { default: () => h('p', 'Only shelves with room.') },
        attachTo: document.body,
      }),
    )
    await flushPromises()
    expect(drawer().textContent).toContain('Only shelves with room.')
    expect(document.querySelector('[aria-haspopup="dialog"]')).toBeNull()
  })

  it('closes on Escape and on a press outside it', async () => {
    const { open } = page()
    await openIt()
    drawer().dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    await flushPromises()
    expect(open.value).toBe(false)

    await openIt()
    document.body.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))
    await flushPromises()
    expect(open.value).toBe(false)
  })
})
