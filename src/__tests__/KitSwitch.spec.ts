import { afterEach, describe, expect, it } from 'vitest'
import { h, nextTick } from 'vue'
import { flushPromises } from '@vue/test-utils'
import KitSegmentedControl from '../components/KitSegmentedControl.vue'
import KitSwitch from '../components/KitSwitch.vue'
import { axeFindings, field, unmountKept } from './helpers'

afterEach(unmountKept)

describe('KitSwitch', () => {
  it('is a switch named by its label, saying its state in words too', async () => {
    const { wrapper, state } = field(KitSwitch, false, { label: 'Show covers' })
    const control = wrapper.get('[role="switch"]')
    expect(wrapper.get('label').attributes('for')).toBe(control.attributes('id'))
    expect(control.attributes('aria-checked')).toBe('false')
    expect(wrapper.get('.kit-switch__state').text()).toBe('Off')
    expect(wrapper.get('.kit-switch__state').attributes('aria-hidden')).toBe('true')
    expect(await axeFindings(wrapper)).toEqual([])

    await control.trigger('click')
    expect(state.value).toBe(true)
    await nextTick()
    expect(control.attributes('aria-checked')).toBe('true')
    expect(wrapper.get('.kit-switch__state').text()).toBe('On')
  })

  it('takes its own words, an error, and can be disabled', async () => {
    const { wrapper, state } = field(
      KitSwitch,
      true,
      { label: 'Lending', error: 'Turn it on to lend.' },
      { onLabel: 'Lending', offLabel: 'Not lending', disabled: true },
    )
    const control = wrapper.get('[role="switch"]')
    expect(wrapper.get('.kit-switch__state').text()).toBe('Lending')
    expect(control.attributes('aria-invalid')).toBe('true')
    expect(control.attributes('aria-describedby')).toMatch(/-error$/)
    expect(control.attributes('disabled')).toBeDefined()
    await control.trigger('click')
    expect(state.value).toBe(true)
  })
})

const views = [
  { value: 'grid', label: 'Grid' },
  { value: 'list', label: 'List' },
  { value: 'shelf', label: 'Shelf', disabled: true },
]

describe('KitSegmentedControl', () => {
  it('is a group named by its field’s caption, with nothing axe finds', async () => {
    const { wrapper } = field(
      KitSegmentedControl,
      'grid',
      { label: 'View', group: true, hint: 'How the books are laid out.' },
      { options: views },
    )
    const group = wrapper.get('[role="group"]')
    const caption = wrapper.get('.kit-form-field__label')
    expect(caption.element.tagName).toBe('SPAN')
    expect(caption.attributes('for')).toBeUndefined()
    expect(group.attributes('aria-labelledby')).toBe(caption.attributes('id'))
    expect(group.attributes('aria-describedby')).toMatch(/-hint$/)
    expect(wrapper.find('label').exists()).toBe(false)
    const buttons = group.findAll('button')
    expect(buttons.map((button) => button.attributes('aria-pressed'))).toEqual([
      'true',
      'false',
      'false',
    ])
    expect(buttons[2]?.attributes('disabled')).toBeDefined()
    expect(await axeFindings(wrapper)).toEqual([])
  })

  it('chooses an option, and keeps the chosen one when it is pressed again', async () => {
    const { wrapper, state } = field(
      KitSegmentedControl,
      'grid',
      { label: 'View', group: true },
      { options: views },
    )
    await flushPromises()
    const [grid, list] = wrapper.findAll('button')
    await list?.trigger('click')
    expect(state.value).toBe('list')
    await nextTick()
    await list?.trigger('click')
    expect(state.value).toBe('list')
    await grid?.trigger('click')
    expect(state.value).toBe('grid')
  })

  it('draws each option’s icon from the app’s own set, and shows an error', () => {
    const { wrapper } = field(
      KitSegmentedControl,
      'grid',
      { label: 'View', group: true, error: 'Pick a view.' },
      { options: views },
      {
        icon: ({ option }: { option: { value: string } }) =>
          h('svg', { 'data-icon': option.value }),
      },
    )
    expect(wrapper.find('[data-icon="list"]').exists()).toBe(true)
    expect(wrapper.get('[role="group"]').classes()).toContain('is-invalid')
  })

  it('leaves labelledBy off a field that isn’t a group, where it would be a stray attribute', () => {
    const { wrapper } = field(KitSwitch, false, { label: 'Show covers' })
    expect(wrapper.get('[role="switch"]').attributes('labelledby')).toBeUndefined()
    expect(wrapper.find('label').exists()).toBe(true)
  })
  it('takes several at once given `multiple`, kept in the options’ order, and may hold none', async () => {
    const { wrapper, state } = field(
      KitSegmentedControl,
      ['list'],
      { label: 'Show', group: true },
      { options: views.slice(0, 2), multiple: true },
    )
    await flushPromises()
    const [grid, list] = wrapper.findAll('button')
    await grid?.trigger('click')
    expect(state.value).toEqual(['grid', 'list'])
    await nextTick()
    await list?.trigger('click')
    await nextTick()
    await grid?.trigger('click')
    expect(state.value).toEqual([])
    expect(await axeFindings(wrapper)).toEqual([])
  })
})
