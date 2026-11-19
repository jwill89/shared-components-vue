import { afterEach, describe, expect, it } from 'vitest'
import { h } from 'vue'
import { flushPromises } from '@vue/test-utils'
import KitSelect from '../components/KitSelect.vue'
import { axeFindings, field, openOptions, option, unmountKept } from './helpers'

afterEach(unmountKept)

const sizes = [
  { value: 'small', label: 'Small' },
  { value: 'medium', label: 'Medium' },
  { value: 'large', label: 'Large', disabled: true },
]

describe('KitSelect', () => {
  it('is named by its label, opens from the keyboard and sets the option’s own value', async () => {
    const { wrapper, state } = field(KitSelect, undefined, { label: 'Size' }, { options: sizes })
    const trigger = wrapper.get('[role="combobox"]')
    expect(wrapper.get('label').attributes('for')).toBe(trigger.attributes('id'))
    expect(trigger.text()).toBe('Choose one')
    expect(await axeFindings(wrapper)).toEqual([])

    await trigger.trigger('keydown', { key: 'Enter' })
    await flushPromises()
    expect(openOptions()).toEqual(['Small', 'Medium', 'Large'])
    expect(option('Large').getAttribute('aria-disabled')).toBe('true')
    expect(document.querySelector('.kit-option-list [data-glyph="check"]')).toBeNull()
    expect(await axeFindings(document.body)).toEqual([])

    option('Medium').dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    await flushPromises()
    expect(state.value).toBe('medium')
  })

  it('shows the chosen label, its check in the list, and an error on the trigger', async () => {
    const { wrapper } = field(
      KitSelect,
      'small',
      { label: 'Size', error: 'Pick another.' },
      { options: sizes, placeholder: 'Any size' },
    )
    await flushPromises()
    const trigger = wrapper.get('[role="combobox"]')
    expect(trigger.text()).toBe('Small')
    expect(trigger.classes()).toContain('is-invalid')
    expect(trigger.attributes('aria-invalid')).toBe('true')
    expect(trigger.attributes('aria-describedby')).toMatch(/-error$/)

    await trigger.trigger('keydown', { key: 'Enter' })
    await flushPromises()
    expect(option('Small').querySelector('[data-glyph="check"]')).not.toBeNull()
  })

  it('takes the app’s own chevron and check, and can be disabled', async () => {
    const { wrapper } = field(
      KitSelect,
      'small',
      { label: 'Size' },
      { options: sizes, disabled: true },
      {
        chevron: () => h('svg', { 'data-icon': 'caret' }),
        check: () => h('svg', { 'data-icon': 'tick' }),
      },
    )
    await flushPromises()
    const trigger = wrapper.get('[role="combobox"]')
    expect(trigger.find('[data-icon="caret"]').exists()).toBe(true)
    expect(trigger.attributes('disabled')).toBeDefined()
  })
})
