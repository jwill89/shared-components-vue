import { afterEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import KitTextField from '../components/KitTextField.vue'
import { kept, unmountKept } from './helpers'

afterEach(unmountKept)

describe('KitTextField', () => {
  it('is a text box that keeps its model in step with what is typed', async () => {
    const wrapper = kept(
      mount(KitTextField, {
        props: {
          modelValue: 'Dune',
          'onUpdate:modelValue': (value: string) => wrapper.setProps({ modelValue: value }),
        },
      }),
    )
    const input = wrapper.get('input')
    expect(input.element.value).toBe('Dune')
    expect(input.attributes('type')).toBe('text')
    await input.setValue('Dune Messiah')
    expect(wrapper.props('modelValue')).toBe('Dune Messiah')
  })

  it('passes its type and any other input attribute through to the box', () => {
    const wrapper = kept(
      mount(KitTextField, {
        props: { modelValue: '', type: 'email' },
        attrs: { autocomplete: 'email', placeholder: 'you@example.com', name: 'email' },
      }),
    )
    const input = wrapper.get('input')
    expect(input.attributes('type')).toBe('email')
    expect(input.attributes('autocomplete')).toBe('email')
    expect(input.attributes('placeholder')).toBe('you@example.com')
    expect(input.attributes('name')).toBe('email')
  })

  it('says it is in error, and what describes it', () => {
    const wrapper = kept(
      mount(KitTextField, {
        props: { modelValue: '', id: 'email', describedBy: 'email-error', invalid: true },
      }),
    )
    const input = wrapper.get('input')
    expect(input.attributes('id')).toBe('email')
    expect(input.attributes('aria-describedby')).toBe('email-error')
    expect(input.attributes('aria-invalid')).toBe('true')
  })
})
