import { afterEach, describe, expect, it } from 'vitest'
import { h, nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import KitButton from '../components/KitButton.vue'
import KitTextField from '../components/KitTextField.vue'
import { axeFindings, field, kept, unmountKept } from './helpers'

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

  it('puts its class and style on its edge, and every other attribute on the box', () => {
    const wrapper = kept(
      mount(KitTextField, {
        props: { modelValue: '' },
        attrs: { class: 'wide', style: 'max-width: 10rem', disabled: true },
      }),
    )
    expect(wrapper.classes()).toContain('wide')
    expect(wrapper.attributes('style')).toContain('max-width: 10rem')
    const input = wrapper.get('input')
    expect(input.classes()).not.toContain('wide')
    expect(input.attributes('disabled')).toBeDefined()
  })

  it('reads the words before and after the box with it, and hides an icon there', async () => {
    const { wrapper } = field(
      KitTextField,
      '300',
      { label: 'Price', hint: 'What a drink costs.' },
      { inputmode: 'decimal' },
      {
        before: () => h('svg', { 'aria-hidden': 'true', 'data-icon': 'coins' }),
        after: () => 'gil',
      },
    )
    const input = wrapper.get('input')
    const [before, after] = wrapper.findAll('.kit-text-field__place')
    expect(after?.text()).toBe('gil')
    expect(input.attributes('aria-describedby')).toBe(
      `${String(before?.attributes('id'))} ${String(after?.attributes('id'))} ${String(input.attributes('id'))}-hint`,
    )
    expect(await axeFindings(wrapper)).toEqual([])
  })

  it('joins a button to its end', async () => {
    const { wrapper } = field(
      KitTextField,
      '',
      { label: 'Search the books' },
      { type: 'search' },
      { button: () => h(KitButton, { type: 'submit' }, { default: () => 'Search' }) },
    )
    expect(wrapper.get('.kit-text-field__button button').text()).toBe('Search')
    expect(await axeFindings(wrapper)).toEqual([])
  })

  it('shows a password while its toggle is on, the toggle named the same either way', async () => {
    const { wrapper } = field(
      KitTextField,
      'hunter2',
      { label: 'Password' },
      { type: 'password', revealable: true, autocomplete: 'current-password' },
    )
    const input = wrapper.get('input')
    const toggle = wrapper.get('button')
    expect(input.attributes('type')).toBe('password')
    expect(toggle.attributes('aria-label')).toBe('Show password')
    expect(toggle.attributes('aria-pressed')).toBe('false')
    expect(toggle.find('[data-glyph="eye"]').exists()).toBe(true)
    expect(await axeFindings(wrapper)).toEqual([])

    await toggle.trigger('click')
    await nextTick()
    expect(input.attributes('type')).toBe('text')
    expect(toggle.attributes('aria-pressed')).toBe('true')
    expect(toggle.attributes('aria-label')).toBe('Show password')
    await toggle.trigger('click')
    await nextTick()
    expect(input.attributes('type')).toBe('password')
  })

  it('has no toggle on a box that isn’t a password’s', () => {
    const wrapper = kept(mount(KitTextField, { props: { modelValue: '', revealable: true } }))
    expect(wrapper.find('button').exists()).toBe(false)
  })
})
