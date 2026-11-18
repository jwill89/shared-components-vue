import { afterEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import KitSpinner from '../components/KitSpinner.vue'
import { axeFindings, kept, unmountKept } from './helpers'

afterEach(unmountKept)

describe('KitSpinner', () => {
  it('is only a picture, hidden from screen readers, when it has no words', async () => {
    const wrapper = kept(mount(KitSpinner, { attachTo: document.body }))
    expect(wrapper.attributes('aria-hidden')).toBe('true')
    expect(wrapper.attributes('role')).toBeUndefined()
    expect(wrapper.classes()).toEqual(['kit-spinner'])
    expect(wrapper.find('.kit-spinner__label').exists()).toBe(false)
    expect(wrapper.text()).toBe('')
    expect(await axeFindings(wrapper)).toEqual([])
  })

  it('says what is loading, as a status, when given its words', async () => {
    const wrapper = kept(
      mount(KitSpinner, { props: { label: 'Loading the books…' }, attachTo: document.body }),
    )
    expect(wrapper.attributes('role')).toBe('status')
    expect(wrapper.attributes('aria-hidden')).toBeUndefined()
    expect(wrapper.classes()).toContain('kit-spinner--labelled')
    expect(wrapper.get('.kit-spinner__ring').attributes('aria-hidden')).toBe('true')
    expect(wrapper.get('.kit-spinner__label').text()).toBe('Loading the books…')
    expect(await axeFindings(wrapper)).toEqual([])
  })
})
