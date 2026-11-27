import { afterEach, describe, expect, it } from 'vitest'
import { nextTick } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import KitProgress from '../components/KitProgress.vue'
import KitSlider from '../components/KitSlider.vue'
import { axeFindings, field, kept, unmountKept } from './helpers'

afterEach(unmountKept)

const percent = (value: number): string => `${String(Math.round(value * 100))}%`

describe('KitSlider', () => {
  it('is a slider named by its caption, saying its value in words as it shows it', async () => {
    const { wrapper } = field(
      KitSlider,
      0.4,
      { label: 'Opacity', group: true, hint: 'How much of the layer shows.' },
      { min: 0, max: 1, step: 0.05, valueText: percent },
    )
    await flushPromises()
    const thumb = wrapper.get('[role="slider"]')
    expect(thumb.attributes('aria-labelledby')).toBe(
      wrapper.get('.kit-form-field__label').attributes('id'),
    )
    expect(thumb.attributes('aria-describedby')).toMatch(/-hint$/)
    expect(thumb.attributes('aria-valuenow')).toBe('0.4')
    expect(thumb.attributes('aria-valuemin')).toBe('0')
    expect(thumb.attributes('aria-valuemax')).toBe('1')
    expect(thumb.attributes('aria-valuetext')).toBe('40%')
    expect(wrapper.get('.kit-slider__value').text()).toBe('40%')
    expect(await axeFindings(wrapper)).toEqual([])
  })

  it('moves a step by key, changing as it goes and committing each move', async () => {
    const { wrapper, state } = field(
      KitSlider,
      10,
      { label: 'Size', group: true },
      { min: 0, max: 20, step: 2 },
    )
    await flushPromises()
    const thumb = wrapper.get('[role="slider"]')
    expect(thumb.attributes('aria-valuetext')).toBeUndefined()
    await thumb.trigger('keydown', { key: 'ArrowRight' })
    expect(state.value).toBe(12)
    await nextTick()
    expect(wrapper.get('.kit-slider__value').text()).toBe('12')
    await thumb.trigger('keydown', { key: 'End' })
    expect(state.value).toBe(20)
    const slider = wrapper.findComponent(KitSlider)
    expect(slider.emitted('commit')).toEqual([[12], [20]])
  })

  it('marks an error, and can’t be moved while disabled', async () => {
    const { wrapper, state } = field(
      KitSlider,
      5,
      { label: 'Size', group: true, error: 'Too small to read.' },
      { disabled: true, showValue: false },
    )
    await flushPromises()
    const thumb = wrapper.get('[role="slider"]')
    expect(thumb.attributes('aria-invalid')).toBe('true')
    expect(wrapper.find('.kit-slider__value').exists()).toBe(false)
    await thumb.trigger('keydown', { key: 'ArrowRight' })
    expect(state.value).toBe(5)
  })
})

describe('KitProgress', () => {
  it('is a bar named by what the job is, saying how far in words', async () => {
    const wrapper = kept(
      mount(KitProgress, {
        props: {
          label: 'Looking up covers',
          value: 3,
          max: 8,
          valueText: (value: number, max: number) => `${String(value)} of ${String(max)} books`,
        },
        slots: { default: '3 done, 5 to go.' },
        attachTo: document.body,
      }),
    )
    const bar = wrapper.get('[role="progressbar"]')
    expect(bar.attributes('aria-labelledby')).toBe(
      wrapper.get('.kit-progress__label').attributes('id'),
    )
    expect(bar.attributes('aria-label')).toBeUndefined()
    expect(bar.attributes('aria-valuenow')).toBe('3')
    expect(bar.attributes('aria-valuemax')).toBe('8')
    expect(bar.attributes('aria-valuetext')).toBe('3 of 8 books')
    expect(wrapper.get('.kit-progress__value').text()).toBe('3 of 8 books')
    expect(wrapper.get('.kit-progress__note').text()).toBe('3 done, 5 to go.')
    expect(await axeFindings(wrapper)).toEqual([])
  })

  it('says its share of the whole without words of its own', () => {
    const wrapper = kept(
      mount(KitProgress, { props: { label: 'Upload', value: 40 }, attachTo: document.body }),
    )
    expect(wrapper.get('[role="progressbar"]').attributes('aria-valuetext')).toBe('40%')
    expect(wrapper.get('.kit-progress__value').text()).toBe('40%')
    expect(wrapper.find('.kit-progress__note').exists()).toBe(false)
  })

  it('says nothing of how far while it can’t, and its name may be read but not shown', async () => {
    const wrapper = kept(
      mount(KitProgress, {
        props: { label: 'Loading the page', value: null, labelHidden: true },
        attachTo: document.body,
      }),
    )
    const bar = wrapper.get('[role="progressbar"]')
    expect(bar.attributes('aria-valuenow')).toBeUndefined()
    expect(bar.attributes('aria-valuetext')).toBeUndefined()
    expect(wrapper.classes()).toContain('is-unknown')
    expect(wrapper.get('.kit-progress__head').classes()).toContain('is-hidden')
    expect(await axeFindings(wrapper)).toEqual([])
  })
})
