import { afterEach, describe, expect, it } from 'vitest'
import { defineComponent, h, nextTick } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import KitButton from '../components/KitButton.vue'
import KitHelpTip from '../components/KitHelpTip.vue'
import KitPopover from '../components/KitPopover.vue'
import { soon } from '../../shared/test/web/wait.js'
import { axeFindings, kept, unmountKept } from './helpers'

afterEach(unmountKept)

function button(name: string): HTMLButtonElement {
  const found = [...document.querySelectorAll('button')].find(
    (candidate) => (candidate.getAttribute('aria-label') ?? candidate.textContent.trim()) === name,
  )
  if (!found) {
    throw new Error(`No "${name}" button.`)
  }
  return found
}

function panel(): HTMLElement | null {
  return document.querySelector<HTMLElement>('.kit-popover')
}

async function press(target: HTMLElement): Promise<void> {
  target.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerType: 'mouse' }))
  target.click()
  await flushPromises()
  await nextTick()
}

/** A popover with its trigger and content, after what goes before it on the page. */
function popover(
  props: Record<string, unknown>,
  trigger: () => unknown,
  content: () => unknown,
  before: () => unknown = () => null,
): void {
  kept(
    mount(
      defineComponent({
        setup: () => () => [before(), h(KitPopover, props, { trigger, default: content })],
      }),
      { attachTo: document.body },
    ),
  )
}

describe('KitPopover', () => {
  it('opens on a press as a panel named by its control, and closes on Escape', async () => {
    popover(
      {},
      () => h(KitButton, null, () => 'Who can see this shelf?'),
      () => [h('p', 'Only the people you lend to.'), h('a', { href: '#rules' }, 'The rules')],
    )
    await nextTick()
    expect(panel()).toBeNull()
    const opener = button('Who can see this shelf?')
    opener.focus()
    await press(opener)
    const shown = await soon(() => {
      const found = panel()
      expect(found).not.toBeNull()
      return found
    })
    expect(shown?.getAttribute('role')).toBe('dialog')
    expect(shown?.getAttribute('aria-labelledby')).toBe(opener.id)
    expect(shown?.textContent).toContain('Only the people you lend to.')
    expect(opener.getAttribute('aria-expanded')).toBe('true')
    expect(await axeFindings(document.body)).toEqual([])

    shown?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    await soon(() => {
      expect(panel()).toBeNull()
    })
    expect(opener.getAttribute('aria-expanded')).toBe('false')
  })
})

describe('KitPopover as a field’s control', () => {
  it('gives its trigger the field’s id, so the field’s label names it', async () => {
    popover(
      { id: 'shelf-color' },
      () => h('button', { type: 'button' }, 'Teal'),
      () => h('p', 'Pick a color.'),
      () => h('label', { for: 'shelf-color' }, 'Shelf color'),
    )
    await nextTick()
    const swatch = button('Teal')
    expect(swatch.id).toBe('shelf-color')
    await press(swatch)
    const shown = await soon(() => {
      const found = panel()
      expect(found).not.toBeNull()
      return found
    })
    expect(shown?.getAttribute('aria-labelledby')).toBe('shelf-color')
    expect(await axeFindings(document.body)).toEqual([])
  })
})

describe('KitHelpTip', () => {
  it('is a question mark named about its topic, whose note is named alike', async () => {
    kept(
      mount(KitHelpTip, {
        props: { topic: 'the waitlist' },
        slots: { default: () => h('p', 'People who asked for a copy, in order.') },
        attachTo: document.body,
      }),
    )
    await nextTick()
    const help = button('About the waitlist')
    expect(help.textContent.trim()).toBe('?')
    await press(help)
    const note = await soon(() => {
      const found = panel()
      expect(found).not.toBeNull()
      return found
    })
    expect(note?.getAttribute('aria-labelledby')).toBe(help.id)
    expect(note?.textContent).toContain('People who asked for a copy, in order.')
    expect(await axeFindings(document.body)).toEqual([])
  })
})
