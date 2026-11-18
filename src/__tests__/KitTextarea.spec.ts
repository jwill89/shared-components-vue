import { afterEach, describe, expect, it } from 'vitest'
import { h } from 'vue'
import { mount } from '@vue/test-utils'
import type { VueWrapper } from '@vue/test-utils'
import KitFormField from '../components/KitFormField.vue'
import type { KitFieldBinding } from '../components/KitFormField.vue'
import KitTextarea from '../components/KitTextarea.vue'
import { formatCount } from '../format'
import { axeFindings, kept, unmountKept } from './helpers'

afterEach(() => {
  unmountKept()
  document.documentElement.lang = ''
})

type TextareaWrapper = VueWrapper<InstanceType<typeof KitTextarea>>

interface TextareaProps {
  modelValue: string
  id?: string
  describedBy?: string
  invalid?: boolean
  limit?: number
}

/** A text box of several lines, its model kept in step with what is typed. */
function textarea(props: TextareaProps, attrs: Record<string, unknown> = {}): TextareaWrapper {
  const wrapper: TextareaWrapper = kept(
    mount(KitTextarea, {
      props: {
        ...props,
        'onUpdate:modelValue': (value: string) => wrapper.setProps({ modelValue: value }),
      },
      attrs,
      attachTo: document.body,
    }),
  )
  return wrapper
}

describe('KitTextarea', () => {
  it('is a text box of several lines, with no count when it has no limit', async () => {
    const wrapper = textarea(
      { modelValue: '', id: 'notes', describedBy: 'notes-hint' },
      { placeholder: 'Anything to remember', name: 'notes' },
    )
    const box = wrapper.get('textarea')
    expect(box.attributes('rows')).toBe('4')
    expect(box.attributes('id')).toBe('notes')
    expect(box.attributes('aria-describedby')).toBe('notes-hint')
    expect(box.attributes('placeholder')).toBe('Anything to remember')
    expect(box.attributes('name')).toBe('notes')
    expect(wrapper.attributes('placeholder')).toBeUndefined()
    expect(wrapper.find('.kit-textarea__count').exists()).toBe(false)

    await box.setValue('Lent to Sam')
    expect(wrapper.props('modelValue')).toBe('Lent to Sam')
  })

  it('counts against its limit, and is described by the count', () => {
    const wrapper = textarea({ modelValue: 'Hello', limit: 100, describedBy: 'bio-hint' })
    const count = wrapper.get('.kit-textarea__count')
    expect(count.text()).toBe('5 / 100')
    expect(wrapper.get('textarea').attributes('aria-describedby')).toBe(
      `bio-hint ${count.attributes('id') ?? ''}`,
    )
    expect(wrapper.get('.kit-textarea__announcement').text()).toBe('')
  })

  it('counts an emoji once', () => {
    const wrapper = textarea({ modelValue: '📚📚', limit: 10 })
    expect(wrapper.get('.kit-textarea__count').text()).toBe('2 / 10')
  })

  it('says how many are left once the remainder runs low', async () => {
    const wrapper = textarea({ modelValue: '', limit: 30 })
    await wrapper.get('textarea').setValue('a'.repeat(15))
    expect(wrapper.get('.kit-textarea__announcement').text()).toBe('15 characters left')
    expect(wrapper.get('textarea').attributes('aria-invalid')).toBeUndefined()
  })

  it('keeps text past the limit, marked as over and in error', async () => {
    const wrapper = textarea({ modelValue: 'a'.repeat(12), limit: 10 }, { 'aria-label': 'Bio' })
    expect(wrapper.get('.kit-textarea__count').text()).toBe('12 / 10 (2 over)')
    expect(wrapper.get('.kit-textarea__count').classes()).toContain('is-over')
    expect(wrapper.get('.kit-textarea__announcement').text()).toBe('2 characters over the limit')
    expect(wrapper.get('textarea').attributes('aria-invalid')).toBe('true')
    expect(wrapper.props('modelValue')).toHaveLength(12)
    expect(await axeFindings(wrapper)).toEqual([])
  })

  it('is in error when its field says so', () => {
    const wrapper = textarea({ modelValue: '', invalid: true })
    expect(wrapper.get('textarea').attributes('aria-invalid')).toBe('true')
  })

  it('sits in a KitFormField, named by its label', async () => {
    const wrapper = kept(
      mount(KitFormField, {
        props: { label: 'About you', hint: 'Shown on your profile.' },
        slots: {
          default: (field: KitFieldBinding) =>
            h(KitTextarea, { ...field, modelValue: '', limit: 200 }),
        },
        attachTo: document.body,
      }),
    )
    const box = wrapper.get('textarea')
    expect(wrapper.get('label').attributes('for')).toBe(box.attributes('id'))
    expect(box.attributes('aria-describedby')).toMatch(/-hint .+-count$/)
    expect(await axeFindings(wrapper)).toEqual([])
  })
})

describe('formatCount', () => {
  it('groups thousands in the page’s language', () => {
    expect(formatCount(1234)).toBe('1,234')
    document.documentElement.lang = 'de'
    expect(formatCount(1234)).toBe('1.234')
  })
})
