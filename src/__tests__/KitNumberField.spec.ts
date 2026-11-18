import { afterEach, describe, expect, it } from 'vitest'
import { h, nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import KitFormField from '../components/KitFormField.vue'
import type { KitFieldBinding } from '../components/KitFormField.vue'
import KitNumberField from '../components/KitNumberField.vue'
import { axeFindings, kept, unmountKept } from './helpers'

afterEach(unmountKept)

/**
 * A click of a mouse on a step button, as Reka reads it: a press on the button and a release
 * anywhere. Test Utils' own trigger leaves out the pointer's type, which Reka takes for a touch
 * held down.
 */
async function press(button: Element | undefined): Promise<void> {
  button?.dispatchEvent(
    new PointerEvent('pointerdown', {
      button: 0,
      pointerId: 1,
      pointerType: 'mouse',
      bubbles: true,
    }),
  )
  window.dispatchEvent(new PointerEvent('pointerup', { pointerId: 1, pointerType: 'mouse' }))
  await nextTick()
}

/** A number box, its model kept in step as a page's v-model keeps it. */
function numberField(props: Record<string, unknown>, slots: Record<string, () => unknown> = {}) {
  const wrapper = kept(
    mount(KitNumberField, {
      props: {
        ...props,
        'onUpdate:modelValue': (value: number | undefined) =>
          wrapper.setProps({ modelValue: value }),
      },
      slots,
      attachTo: document.body,
    }),
  )
  return wrapper
}

describe('KitNumberField', () => {
  it('puts its id on the number box, and names its step buttons', () => {
    const wrapper = numberField({ modelValue: 3, id: 'copies' })
    const input = wrapper.get('input')
    expect(input.attributes('id')).toBe('copies')
    expect(input.element.value).toBe('3')
    const [decrease, increase] = wrapper.findAll('button')
    expect(decrease?.attributes('aria-label')).toBe('Decrease')
    expect(increase?.attributes('aria-label')).toBe('Increase')
    // The arrow keys do the buttons' work, so Tab passes them by.
    expect(decrease?.attributes('tabindex')).toBe('-1')
    expect(increase?.attributes('tabindex')).toBe('-1')
  })

  it('steps with the arrow keys and holds to its bounds', async () => {
    const wrapper = numberField({ modelValue: 9, min: 0, max: 10, step: 1 })
    const input = wrapper.get('input')
    await input.trigger('keydown', { key: 'ArrowUp' })
    expect(wrapper.props('modelValue')).toBe(10)
    await input.trigger('keydown', { key: 'ArrowUp' })
    expect(wrapper.props('modelValue')).toBe(10)
    await input.trigger('keydown', { key: 'Home' })
    expect(wrapper.props('modelValue')).toBe(0)
  })

  it('steps with its buttons', async () => {
    const wrapper = numberField({ modelValue: 2, step: 2 })
    // Reka listens for the press once the buttons are in place, a tick after mounting.
    await nextTick()
    const [decrease, increase] = wrapper.findAll('button')
    await press(increase?.element)
    expect(wrapper.props('modelValue')).toBe(4)
    await press(decrease?.element)
    expect(wrapper.props('modelValue')).toBe(2)
  })

  it('groups thousands unless told how to write the number', () => {
    expect(numberField({ modelValue: 1969 }).get('input').element.value).toBe('1,969')
    const year = numberField({ modelValue: 1969, formatOptions: { useGrouping: false } })
    expect(year.get('input').element.value).toBe('1969')
    const share = numberField({ modelValue: 0.25, step: 0.01, formatOptions: { style: 'percent' } })
    expect(share.get('input').element.value).toBe('25%')
  })

  it('says it is in error, and what describes it', () => {
    const wrapper = numberField({ modelValue: 1, describedBy: 'copies-error', invalid: true })
    expect(wrapper.classes()).toContain('is-invalid')
    const input = wrapper.get('input')
    expect(input.attributes('aria-describedby')).toBe('copies-error')
    expect(input.attributes('aria-invalid')).toBe('true')
  })

  it('draws the app’s icons on its step buttons when given them', () => {
    const wrapper = numberField(
      { modelValue: 1 },
      {
        decrease: () => h('svg', { 'data-icon': 'minus' }),
        increase: () => h('svg', { 'data-icon': 'plus' }),
      },
    )
    expect(wrapper.find('[data-icon="minus"]').exists()).toBe(true)
    expect(wrapper.find('[data-icon="plus"]').exists()).toBe(true)
  })

  it('can be disabled', () => {
    const wrapper = numberField({ modelValue: 1, disabled: true })
    expect(wrapper.get('input').attributes('disabled')).toBeDefined()
    for (const button of wrapper.findAll('button')) {
      expect(button.attributes('disabled')).toBeDefined()
    }
  })

  it('sits in a KitFormField, named by its label, with nothing axe finds', async () => {
    const wrapper = kept(
      mount(KitFormField, {
        props: { label: 'Copies', error: 'At least one copy.' },
        slots: {
          default: (field: KitFieldBinding) =>
            h(KitNumberField, { ...field, modelValue: 0, min: 0 }),
        },
        attachTo: document.body,
      }),
    )
    const input = wrapper.get('input')
    expect(wrapper.get('label').attributes('for')).toBe(input.attributes('id'))
    expect(input.attributes('aria-describedby')).toMatch(/-error$/)
    expect(input.attributes('aria-invalid')).toBe('true')
    expect(await axeFindings(wrapper)).toEqual([])
  })
})
