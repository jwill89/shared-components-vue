import { afterEach, describe, expect, it } from 'vitest'
import { h } from 'vue'
import { mount } from '@vue/test-utils'
import KitIconButton from '../components/KitIconButton.vue'
import { axeFindings, kept, unmountKept } from './helpers'

afterEach(unmountKept)

describe('KitIconButton', () => {
  it('is named by its label, which also shows as its title, and draws the app’s icon', async () => {
    const wrapper = kept(
      mount(KitIconButton, {
        props: { label: 'Remove #general' },
        slots: { default: () => h('svg', { 'data-icon': 'xmark' }) },
        attachTo: document.body,
      }),
    )
    const button = wrapper.get('button')
    expect(button.attributes('aria-label')).toBe('Remove #general')
    expect(button.attributes('title')).toBe('Remove #general')
    expect(button.attributes('type')).toBe('button')
    expect(button.classes()).toEqual(['kit-button', 'kit-button--quiet', 'kit-button--icon-only'])
    expect(wrapper.get('.kit-button__icon').attributes('aria-hidden')).toBe('true')
    expect(wrapper.get('.kit-button__icon svg').attributes('data-icon')).toBe('xmark')
    expect(await axeFindings(wrapper)).toEqual([])

    await button.trigger('click')
    expect(wrapper.emitted('click')).toHaveLength(1)
  })

  it('trades its icon for the spinner while loading, and keeps its name', async () => {
    const wrapper = kept(
      mount(KitIconButton, {
        props: { label: 'Reload', loading: true, variant: 'primary', type: 'submit' },
        slots: { default: () => h('svg') },
        attachTo: document.body,
      }),
    )
    expect(wrapper.find('.kit-button__icon').exists()).toBe(false)
    expect(wrapper.find('.kit-spinner').exists()).toBe(true)
    expect(wrapper.attributes('type')).toBe('submit')
    expect(wrapper.attributes('aria-busy')).toBe('true')
    expect(wrapper.attributes('aria-label')).toBe('Reload')
    expect(wrapper.classes()).toContain('kit-button--primary')
    expect(await axeFindings(wrapper)).toEqual([])
  })

  it('can be disabled', () => {
    const wrapper = kept(
      mount(KitIconButton, { props: { label: 'Delete', disabled: true, variant: 'danger' } }),
    )
    expect(wrapper.attributes('disabled')).toBeDefined()
    expect(wrapper.classes()).toContain('kit-button--danger')
  })
})
