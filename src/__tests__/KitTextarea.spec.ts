import { afterEach, describe, expect, it, vi } from 'vitest'
import { h, nextTick } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import type { VueWrapper } from '@vue/test-utils'
import KitFormField from '../components/KitFormField.vue'
import type { KitFieldBinding } from '../components/KitFormField.vue'
import KitTextarea from '../components/KitTextarea.vue'
import { formatBytes, formatCount, formatList } from '../format'
import { axeFindings, kept, unmountKept } from './helpers'

afterEach(() => {
  unmountKept()
  vi.restoreAllMocks()
  document.documentElement.lang = ''
})

type TextareaWrapper = VueWrapper<InstanceType<typeof KitTextarea>>

interface TextareaProps {
  modelValue: string
  id?: string
  describedBy?: string
  invalid?: boolean
  limit?: number
  rows?: number
  grow?: boolean
  maxRows?: number
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

describe('KitTextarea growing', () => {
  it('grows with its text between its rows and its most, measured where the browser can’t', async () => {
    // A browser with no field-sizing, where the box is measured. (jsdom says yes to any
    // property, and lays nothing out, so its height is given here.)
    vi.spyOn(CSS, 'supports').mockReturnValue(false)
    const wrapper = textarea({ modelValue: 'One line', grow: true, rows: 2, maxRows: 6 })
    const box = wrapper.get('textarea')
    expect(box.classes()).toContain('is-growing')
    expect(box.attributes('style')).toContain('--kit-textarea-rows: 2')
    expect(box.attributes('style')).toContain('--kit-textarea-max-rows: 6')
    Object.defineProperty(box.element, 'scrollHeight', { configurable: true, get: () => 120 })
    await box.setValue('One line\nand another\nand a third')
    await flushPromises()
    expect(box.element.style.height).toBe('120px')
  })

  it('leaves the growing to the browser where it can size the box to its text', async () => {
    const wrapper = textarea({ modelValue: '', grow: true })
    const box = wrapper.get('textarea')
    await box.setValue('Some words')
    await flushPromises()
    expect(box.element.style.height).toBe('')
  })

  it('keeps its own height where it doesn’t grow', async () => {
    const wrapper = textarea({ modelValue: '' })
    const box = wrapper.get('textarea')
    await box.setValue('Some words')
    await nextTick()
    expect(box.classes()).not.toContain('is-growing')
    expect(box.element.style.height).toBe('')
  })
})

describe('formatBytes and formatList', () => {
  it('writes a size in the largest unit that keeps it at one or more', () => {
    expect(formatBytes(512)).toBe('512 bytes')
    expect(formatBytes(1536)).toBe('1.5 kB')
    expect(formatBytes(10 * 1024 * 1024)).toBe('10 MB')
    expect(formatBytes(25 * 1024 * 1024)).toBe('25 MB')
  })

  it('writes a list in the page’s language, with and or with or', () => {
    expect(formatList(['PNG', 'JPEG', 'WebP'], 'disjunction')).toBe('PNG, JPEG, or WebP')
    expect(formatList(['a.png', 'b.png'], 'conjunction')).toBe('a.png and b.png')
  })
})

describe('formatCount', () => {
  it('groups thousands in the page’s language', () => {
    expect(formatCount(1234)).toBe('1,234')
    document.documentElement.lang = 'de'
    expect(formatCount(1234)).toBe('1.234')
  })
})
