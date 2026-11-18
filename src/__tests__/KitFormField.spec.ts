import { afterEach, describe, expect, it } from 'vitest'
import { defineComponent, h, ref } from 'vue'
import { mount } from '@vue/test-utils'
import KitFormField from '../components/KitFormField.vue'
import type { KitFieldBinding } from '../components/KitFormField.vue'
import KitTextField from '../components/KitTextField.vue'
import { axeFindings, kept, unmountKept } from './helpers'

afterEach(unmountKept)

interface FieldProps {
  label: string
  id?: string
  hint?: string
  error?: string
  required?: boolean
}

/** A field holding a text box, its value kept in step as a page's v-model keeps it. */
function textField(fieldProps: FieldProps, slots: Record<string, () => unknown> = {}) {
  const value = ref('')
  const Form = defineComponent({
    setup: () => () =>
      h(KitFormField, fieldProps, {
        default: (field: KitFieldBinding) =>
          h(KitTextField, {
            ...field,
            modelValue: value.value,
            'onUpdate:modelValue': (next: string) => {
              value.value = next
            },
          }),
        ...slots,
      }),
  })
  return { wrapper: kept(mount(Form, { attachTo: document.body })), value }
}

describe('KitFormField', () => {
  it('names its control by the label, and has nothing axe finds', async () => {
    const { wrapper, value } = textField({ label: 'Title' })
    const input = wrapper.get('input')
    const label = wrapper.get('label')
    expect(label.attributes('for')).toBe(input.attributes('id'))
    expect(input.attributes('id')).toBeTruthy()
    expect(label.text()).toBe('Title')
    expect(input.attributes('aria-describedby')).toBeUndefined()
    expect(input.attributes('aria-invalid')).toBeUndefined()
    expect(await axeFindings(wrapper)).toEqual([])

    await input.setValue('Dune')
    expect(value.value).toBe('Dune')
  })

  it('takes the id it is given', () => {
    const { wrapper } = textField({ label: 'Title', id: 'book-title' })
    expect(wrapper.get('input').attributes('id')).toBe('book-title')
    expect(wrapper.get('label').attributes('for')).toBe('book-title')
  })

  it('ties its error and hint to the control, the error first, and marks it invalid', async () => {
    const { wrapper } = textField({
      label: 'Email',
      id: 'email',
      hint: 'We send the reset link here.',
      error: 'That address has no @.',
    })
    const input = wrapper.get('input')
    expect(input.attributes('aria-describedby')).toBe('email-error email-hint')
    expect(input.attributes('aria-invalid')).toBe('true')
    expect(wrapper.get('#email-error').text()).toBe('That address has no @.')
    expect(wrapper.get('#email-hint').text()).toBe('We send the reset link here.')
    expect(await axeFindings(wrapper)).toEqual([])
  })

  it('takes a hint with markup from its slot', async () => {
    const { wrapper } = textField(
      { label: 'Slug', id: 'slug' },
      { hint: () => ['Lower case. ', h('a', { href: '#slugs' }, 'What is a slug?')] },
    )
    expect(wrapper.get('input').attributes('aria-describedby')).toBe('slug-hint')
    expect(wrapper.get('#slug-hint a').text()).toBe('What is a slug?')
    expect(await axeFindings(wrapper)).toEqual([])
  })

  it('marks a required field with an asterisk, and says so in words', async () => {
    const { wrapper } = textField({ label: 'Name', required: true })
    expect(wrapper.get('.kit-form-field__required').attributes('aria-hidden')).toBe('true')
    expect(wrapper.get('.kit-form-field__required-words').text()).toBe('(required)')
    expect(wrapper.get('label').text()).toBe('Name *(required)')
    expect(await axeFindings(wrapper)).toEqual([])
  })
})
