import { afterEach, describe, expect, it } from 'vitest'
import { defineComponent, h } from 'vue'
import { mount } from '@vue/test-utils'
import KitButton from '../components/KitButton.vue'
import { axeFindings, kept, unmountKept } from './helpers'

afterEach(unmountKept)

/** An app's own icon component, as Font Awesome's <font-awesome-icon> would be. */
const AppIcon = defineComponent({
  props: { name: { type: String, required: true } },
  setup: (props) => () => h('svg', { 'data-icon': props.name, 'aria-hidden': 'true' }),
})

describe('KitButton', () => {
  it('is a plain button by default, named by its words, with nothing axe finds', async () => {
    const wrapper = kept(
      mount(KitButton, { slots: { default: () => 'Save' }, attachTo: document.body }),
    )
    const button = wrapper.get('button')
    expect(button.attributes('type')).toBe('button')
    expect(button.classes()).toEqual(['kit-button', 'kit-button--secondary'])
    expect(button.text()).toBe('Save')
    expect(button.attributes('disabled')).toBeUndefined()
    expect(button.attributes('aria-busy')).toBeUndefined()
    expect(wrapper.find('.kit-button__icon').exists()).toBe(false)
    expect(await axeFindings(wrapper)).toEqual([])

    await button.trigger('click')
    expect(wrapper.emitted('click')).toHaveLength(1)
  })

  it('draws the app’s own icon component, hidden from screen readers', async () => {
    const wrapper = kept(
      mount(KitButton, {
        props: { variant: 'primary' },
        slots: { default: () => 'Add a book', icon: () => h(AppIcon, { name: 'plus' }) },
        attachTo: document.body,
      }),
    )
    const icon = wrapper.get('.kit-button__icon')
    expect(icon.attributes('aria-hidden')).toBe('true')
    expect(icon.get('svg').attributes('data-icon')).toBe('plus')
    expect(wrapper.classes()).toContain('kit-button--primary')
    expect(await axeFindings(wrapper)).toEqual([])
  })

  it('takes each variant and the native types', () => {
    for (const variant of ['primary', 'secondary', 'danger', 'quiet'] as const) {
      const wrapper = kept(mount(KitButton, { props: { variant }, slots: { default: () => 'Go' } }))
      expect(wrapper.classes()).toContain(`kit-button--${variant}`)
    }
    const submit = kept(mount(KitButton, { props: { type: 'submit' } }))
    expect(submit.attributes('type')).toBe('submit')
  })

  it('shows a spinner in its icon’s place, says it is busy, and can’t be pressed while loading', async () => {
    const wrapper = kept(
      mount(KitButton, {
        props: { loading: true },
        slots: { default: () => 'Save', icon: () => h(AppIcon, { name: 'floppy-disk' }) },
        attachTo: document.body,
      }),
    )
    expect(wrapper.find('.kit-spinner').exists()).toBe(true)
    expect(wrapper.find('.kit-button__icon').exists()).toBe(false)
    expect(wrapper.text()).toBe('Save')
    expect(wrapper.attributes('disabled')).toBeDefined()
    expect(wrapper.attributes('aria-busy')).toBe('true')
    expect(await axeFindings(wrapper)).toEqual([])

    await wrapper.trigger('click')
    expect(wrapper.emitted('click')).toBeUndefined()
  })

  it('can be disabled without loading', async () => {
    const wrapper = kept(mount(KitButton, { props: { disabled: true } }))
    expect(wrapper.attributes('disabled')).toBeDefined()
    expect(wrapper.attributes('aria-busy')).toBeUndefined()
    await wrapper.trigger('click')
    expect(wrapper.emitted('click')).toBeUndefined()
  })

  it('is a link that looks like the button when it leads somewhere', async () => {
    const wrapper = kept(
      mount(KitButton, {
        props: { href: '/auth/discord/start', variant: 'primary' },
        attrs: { target: '_blank' },
        slots: {
          default: () => 'Continue with Discord',
          icon: () => h(AppIcon, { name: 'discord' }),
        },
        attachTo: document.body,
      }),
    )
    const link = wrapper.get('a')
    expect(link.attributes('href')).toBe('/auth/discord/start')
    expect(link.attributes('target')).toBe('_blank')
    expect(link.attributes('type')).toBeUndefined()
    expect(link.classes()).toEqual(['kit-button', 'kit-button--primary'])
    expect(link.get('.kit-button__icon').attributes('aria-hidden')).toBe('true')
    expect(link.text()).toBe('Continue with Discord')
    expect(wrapper.find('button').exists()).toBe(false)
    expect(await axeFindings(wrapper)).toEqual([])

    const bare = kept(mount(KitButton, { props: { href: '/x' }, slots: { default: () => 'Go' } }))
    expect(bare.find('.kit-button__icon').exists()).toBe(false)
  })
})
