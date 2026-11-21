import { afterEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, nextTick, ref } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import KitMenu from '../components/KitMenu.vue'
import KitMenuItem from '../components/KitMenuItem.vue'
import KitMenuLabel from '../components/KitMenuLabel.vue'
import KitMenuRadioGroup from '../components/KitMenuRadioGroup.vue'
import KitMenuRadioItem from '../components/KitMenuRadioItem.vue'
import KitMenuSeparator from '../components/KitMenuSeparator.vue'
import { soon } from '../../shared/test/web/wait.js'
import { axeFindings, kept, unmountKept } from './helpers'

afterEach(unmountKept)

/** A shelf's menu: two actions, a separator, and a choice of order. */
function page() {
  const renamed = vi.fn()
  const deleted = vi.fn()
  const order = ref('title')
  kept(
    mount(
      defineComponent({
        setup: () => () =>
          h(KitMenu, { label: 'Shelf actions' }, () => [
            h(
              KitMenuItem,
              { onSelect: renamed },
              {
                default: () => 'Rename',
                icon: () => h('svg', { 'data-icon': 'pen' }),
              },
            ),
            h(KitMenuItem, { danger: true, onSelect: deleted }, () => 'Delete the shelf'),
            h(KitMenuSeparator),
            h(KitMenuLabel, null, () => 'Order'),
            h(
              KitMenuRadioGroup,
              {
                label: 'Order',
                modelValue: order.value,
                'onUpdate:modelValue': (next: string) => {
                  order.value = next
                },
              },
              () => [
                h(KitMenuRadioItem, { value: 'title' }, () => 'By title'),
                h(KitMenuRadioItem, { value: 'author' }, () => 'By author'),
              ],
            ),
          ]),
      }),
      { attachTo: document.body },
    ),
  )
  return { renamed, deleted, order }
}

function trigger(): HTMLButtonElement {
  const found = document.querySelector<HTMLButtonElement>('button[aria-label="Shelf actions"]')
  if (!found) {
    throw new Error('No menu button.')
  }
  return found
}

async function openMenu(): Promise<HTMLElement> {
  await nextTick()
  const button = trigger()
  button.focus()
  button.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
  await flushPromises()
  return soon(() => {
    const menu = document.querySelector<HTMLElement>('[role="menu"]')
    if (!menu) {
      throw new Error('No menu is open.')
    }
    return menu
  })
}

function item(name: string): HTMLElement {
  const found = [...document.querySelectorAll<HTMLElement>('[role^="menuitem"]')].find(
    (candidate) => candidate.textContent.trim() === name,
  )
  if (!found) {
    throw new Error(`No "${name}" item.`)
  }
  return found
}

describe('KitMenu', () => {
  it('opens from its button as a menu named alike, with nothing axe finds', async () => {
    page()
    const menu = await openMenu()
    expect(menu.getAttribute('aria-label')).toBe('Shelf actions')
    expect(trigger().getAttribute('aria-expanded')).toBe('true')
    expect(
      [...menu.querySelectorAll('[role^="menuitem"]')].map((i) => i.textContent.trim()),
    ).toEqual(['Rename', 'Delete the shelf', 'By title', 'By author'])
    expect(menu.querySelector('[role="separator"]')).not.toBeNull()
    expect(
      item('Rename').querySelector('[data-icon="pen"]')?.closest('[aria-hidden="true"]'),
    ).not.toBeNull()
    expect(item('Delete the shelf').classList).toContain('kit-option-list__item--danger')
    expect(await axeFindings(menu)).toEqual([])
  })

  it('runs an item when it is chosen, and closes', async () => {
    const { renamed } = page()
    await openMenu()
    item('Rename').click()
    await flushPromises()
    expect(renamed).toHaveBeenCalledOnce()
    await soon(() => {
      expect(document.querySelector('[role="menu"]')).toBeNull()
    })
  })

  it('holds a choice of one, checked', async () => {
    const { order } = page()
    await openMenu()
    expect(item('By title').getAttribute('aria-checked')).toBe('true')
    item('By author').click()
    await flushPromises()
    expect(order.value).toBe('author')
  })
})
