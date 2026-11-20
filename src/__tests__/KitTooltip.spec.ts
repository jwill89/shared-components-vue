import { afterEach, describe, expect, it } from 'vitest'
import { defineComponent, h, nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import { TooltipProvider } from 'reka-ui'
import KitButton from '../components/KitButton.vue'
import KitTooltip from '../components/KitTooltip.vue'
import { soon } from '../../shared/test/web/wait.js'
import { axeFindings, kept, unmountKept } from './helpers'

afterEach(unmountKept)

/** A button with a tooltip, under the TooltipProvider an app mounts at its root. */
function page(): HTMLButtonElement {
  kept(
    mount(
      defineComponent({
        setup: () => () =>
          h(TooltipProvider, null, () =>
            h(KitTooltip, { text: 'Copies the link to this shelf' }, () =>
              h(KitButton, null, () => 'Copy the link'),
            ),
          ),
      }),
      { attachTo: document.body },
    ),
  )
  const button = document.querySelector('button')
  if (!button) {
    throw new Error('No button.')
  }
  return button
}

/** The note a screen reader finds, by its role, wherever Reka drew it. */
function note(): Element | null {
  return document.querySelector('[role="tooltip"]')
}

describe('KitTooltip', () => {
  it('shows its note while its control has focus, and describes the control by it', async () => {
    const button = page()
    await nextTick()
    expect(note()).toBeNull()

    button.focus()
    const shown = await soon(() => {
      const found = note()
      expect(found?.textContent).toContain('Copies the link to this shelf')
      return found
    })
    // The note adds to the control's name and never replaces it.
    expect(button.textContent.trim()).toBe('Copy the link')
    expect(button.getAttribute('aria-describedby')).toBe(shown?.id)
    expect(await axeFindings(document.body)).toEqual([])
  })

  it('goes on Escape', async () => {
    const button = page()
    await nextTick()
    button.focus()
    await soon(() => {
      expect(note()).not.toBeNull()
    })
    button.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    await soon(() => {
      expect(note()).toBeNull()
    })
  })
})
