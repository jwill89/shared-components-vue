import { afterEach, describe, expect, it } from 'vitest'
import { nextTick } from 'vue'
import { flushPromises } from '@vue/test-utils'
import KitColorField from '../components/KitColorField.vue'
import { DISCORD_COLORS } from '../discord/embed'
import { soon } from '../../shared/test/web/wait.js'
import { axeFindings, field, unmountKept } from './helpers'

afterEach(unmountKept)

function color(value: string, props: Record<string, unknown> = {}) {
  return field(KitColorField, value, { label: 'Bar color' }, { presets: DISCORD_COLORS, ...props })
}

async function open(root: Element): Promise<HTMLElement> {
  const trigger = root.querySelector<HTMLButtonElement>('.kit-color-field__trigger')
  trigger?.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerType: 'mouse' }))
  trigger?.click()
  await flushPromises()
  return soon(() => {
    const picker = document.querySelector<HTMLElement>('.kit-color-picker')
    if (!picker) {
      throw new Error('No picker is open.')
    }
    return picker
  })
}

describe('KitColorField', () => {
  it('shows the color by its swatch and hex, named by its label, with nothing axe finds', async () => {
    const { wrapper } = color('#5865F2')
    await nextTick()
    const trigger = wrapper.get('.kit-color-field__trigger')
    expect(wrapper.get('label').attributes('for')).toBe(trigger.attributes('id'))
    expect(trigger.text()).toContain('#5865f2')
    expect(trigger.attributes('aria-describedby')).toContain(
      wrapper.get('.kit-color-field__value').attributes('id'),
    )
    expect(await axeFindings(wrapper)).toEqual([])
  })

  it('says it has none, and offers no clearing then', async () => {
    const { wrapper } = color('', { noneText: 'Discord’s own' })
    await nextTick()
    expect(wrapper.get('.kit-color-field__value').text()).toBe('Discord’s own')
    expect(wrapper.find('button[aria-label="Clear the color"]').exists()).toBe(false)
  })

  it('takes a preset picked, and a hex typed', async () => {
    const { wrapper, state } = color('')
    await nextTick()
    const picker = await open(wrapper.element)
    expect(
      picker.querySelector('[aria-label="Discord’s colors"], [aria-label="Suggested colors"]'),
    ).not.toBeNull()
    expect(await axeFindings(document.body)).toEqual([])
    const teal = picker.querySelector<HTMLElement>('[aria-label="Teal"]')
    teal?.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerType: 'mouse' }))
    teal?.click()
    await flushPromises()
    expect(state.value).toBe('#1abc9c')

    const hex = picker.querySelector<HTMLInputElement>('.kit-color-picker__input')
    if (!hex) {
      throw new Error('No hex box.')
    }
    hex.value = '#E74C3C'
    hex.dispatchEvent(new Event('input', { bubbles: true }))
    hex.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    hex.dispatchEvent(new FocusEvent('blur'))
    await flushPromises()
    expect(state.value).toBe('#e74c3c')
  })

  it('clears its color, and gives focus back to its button', async () => {
    const { wrapper, state } = color('#1abc9c', { clearLabel: 'Clear the bar’s color' })
    await nextTick()
    await wrapper.get('button[aria-label="Clear the bar’s color"]').trigger('click')
    expect(state.value).toBe('')
    expect(document.activeElement).toBe(wrapper.get('.kit-color-field__trigger').element)
  })

  it('marks itself in error, and can be turned off', async () => {
    const { wrapper } = field(
      KitColorField,
      '#1abc9c',
      { label: 'Bar color', error: 'Pick another.' },
      { disabled: true },
    )
    await nextTick()
    const trigger = wrapper.get('.kit-color-field__trigger')
    expect(trigger.attributes('aria-invalid')).toBe('true')
    expect(trigger.attributes('disabled')).toBeDefined()
    expect(wrapper.find('button[aria-label="Clear the color"]').exists()).toBe(false)
  })
})
