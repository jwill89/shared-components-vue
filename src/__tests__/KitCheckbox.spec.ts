import { afterEach, describe, expect, it } from 'vitest'
import { h, nextTick, reactive } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import KitCheckbox from '../components/KitCheckbox.vue'
import KitCheckboxGroup from '../components/KitCheckboxGroup.vue'
import KitRadioGroup from '../components/KitRadioGroup.vue'
import { axeFindings, field, kept, unmountKept } from './helpers'

afterEach(unmountKept)

/** A lone box, its model kept in step as a page's v-model keeps it. */
function box(
  value: boolean | 'indeterminate',
  props: Record<string, unknown> = {},
  words = 'Lend to friends',
): { wrapper: ReturnType<typeof mount>; state: { value: boolean | 'indeterminate' } } {
  const state = reactive({ value })
  const wrapper = kept(
    mount(
      {
        render: () =>
          h(
            KitCheckbox,
            {
              ...props,
              modelValue: state.value,
              'onUpdate:modelValue': (next: boolean | 'indeterminate') => {
                state.value = next
              },
            },
            { default: () => words },
          ),
      },
      { attachTo: document.body },
    ),
  )
  return { wrapper, state }
}

describe('KitCheckbox', () => {
  it('is a box named by its words, ticked by a click on it or on them', async () => {
    const { wrapper, state } = box(false)
    const control = wrapper.get('[role="checkbox"]')
    const label = wrapper.get('label')
    expect(label.attributes('for')).toBe(control.attributes('id'))
    expect(control.attributes('aria-labelledby')).toBe(label.attributes('id'))
    expect(control.attributes('aria-checked')).toBe('false')
    expect(await axeFindings(wrapper)).toEqual([])

    await control.trigger('click')
    expect(state.value).toBe(true)
    await nextTick()
    expect(control.attributes('aria-checked')).toBe('true')
    expect(wrapper.find('[data-glyph="check"]').exists()).toBe(true)

    await label.trigger('click')
    expect(state.value).toBe(false)
  })

  it('reads its hint and its error with it, not as part of its name', async () => {
    const { wrapper } = box(false, {
      hint: 'Deleted when the night starts.',
      error: 'Tick it to go on.',
      describedBy: 'elsewhere',
    })
    const control = wrapper.get('[role="checkbox"]')
    const [error, hint] = wrapper.findAll('p')
    expect(error?.text()).toBe('Tick it to go on.')
    expect(hint?.text()).toBe('Deleted when the night starts.')
    expect(control.attributes('aria-describedby')).toBe(
      `${String(error?.attributes('id'))} ${String(hint?.attributes('id'))} elsewhere`,
    )
    expect(control.attributes('aria-invalid')).toBe('true')
    expect(wrapper.get('label').text()).toBe('Lend to friends')
    expect(await axeFindings(wrapper)).toEqual([])
  })

  it('shows a dash while partly ticked, which a press ticks whole', async () => {
    const { wrapper, state } = box('indeterminate', {}, 'Every book')
    const control = wrapper.get('[role="checkbox"]')
    expect(control.attributes('aria-checked')).toBe('mixed')
    expect(wrapper.find('[data-glyph="dash"]').exists()).toBe(true)
    await control.trigger('click')
    expect(state.value).toBe(true)
  })

  it('can’t be ticked while disabled', async () => {
    const { wrapper, state } = box(false, { disabled: true })
    const control = wrapper.get('[role="checkbox"]')
    expect(control.attributes('disabled')).toBeDefined()
    await control.trigger('click')
    await wrapper.get('label').trigger('click')
    expect(state.value).toBe(false)
  })
})

const events = [
  { value: 'edited', label: 'Edited', group: 'Messages' },
  { value: 'deleted', label: 'Deleted', group: 'Messages', hint: 'Its words are kept a day.' },
  { value: 'thread-made', label: 'Made', group: 'Threads' },
  { value: 'thread-closed', label: 'Closed', group: 'Threads', disabled: true },
]

describe('KitCheckboxGroup', () => {
  it('is a group named by its field’s caption, each heading a group of its own', async () => {
    const { wrapper } = field(
      KitCheckboxGroup,
      ['deleted'],
      { label: 'What to log', group: true, hint: 'Each goes to the log channel.' },
      { options: events },
    )
    const caption = wrapper.get('.kit-form-field__label')
    const outer = wrapper.get('.kit-choice-group')
    expect(outer.attributes('role')).toBe('group')
    expect(outer.attributes('aria-labelledby')).toBe(caption.attributes('id'))
    expect(outer.attributes('aria-describedby')).toMatch(/-hint$/)

    const runs = outer.findAll('.kit-choice-group__run')
    expect(runs.map((run) => run.attributes('role'))).toEqual(['group', 'group'])
    const heading = runs[0]?.get('.kit-choice-group__heading')
    expect(runs[0]?.attributes('aria-labelledby')).toBe(heading?.attributes('id'))
    expect(heading?.text()).toBe('Messages')

    const boxes = outer.findAll('[role="checkbox"]')
    expect(boxes.map((b) => b.attributes('aria-checked'))).toEqual([
      'false',
      'true',
      'false',
      'false',
    ])
    expect(boxes[3]?.attributes('disabled')).toBeDefined()
    expect(boxes[1]?.attributes('aria-describedby')).toMatch(/-hint$/)
    expect(await axeFindings(wrapper)).toEqual([])
  })

  it('keeps its list in the options’ order however they are ticked, and every box a Tab stop', async () => {
    const { wrapper, state } = field(
      KitCheckboxGroup,
      [],
      { label: 'What to log', group: true },
      { options: events },
    )
    await flushPromises()
    const boxes = wrapper.findAll('[role="checkbox"]')
    expect(boxes.map((b) => b.attributes('tabindex') ?? '0')).toEqual(['0', '0', '0', '0'])
    await boxes[2]?.trigger('click')
    await boxes[0]?.trigger('click')
    expect(state.value).toEqual(['edited', 'thread-made'])
    await nextTick()
    await boxes[2]?.trigger('click')
    expect(state.value).toEqual(['edited'])
  })

  it('makes its own id where no field gives one', () => {
    const wrapper = kept(
      mount(KitCheckboxGroup, {
        props: { modelValue: [], options: [{ value: 'a', label: 'Alone' }] },
        attachTo: document.body,
      }),
    )
    expect(wrapper.attributes('id')).toBeTruthy()
  })

  it('lays options with no heading out in one run, and marks every box when in error', () => {
    const { wrapper } = field(
      KitCheckboxGroup,
      [],
      { label: 'Days', group: true, error: 'Choose a day.' },
      {
        options: [
          { value: 'mon', label: 'Monday' },
          { value: 'tue', label: 'Tuesday' },
        ],
        inline: true,
      },
    )
    const runs = wrapper.findAll('.kit-choice-group__run')
    expect(runs).toHaveLength(1)
    expect(runs[0]?.attributes('role')).toBeUndefined()
    expect(wrapper.get('.kit-choice-group').classes()).toContain('is-inline')
    expect(wrapper.findAll('[role="checkbox"]').map((b) => b.attributes('aria-invalid'))).toEqual([
      'true',
      'true',
    ])
  })
})

const reasons = [
  { value: 'scan', label: 'Scan artefact', hint: 'Dust, scratches or glare on the image.' },
  { value: 'crooked', label: 'Cropped or crooked' },
  { value: 'wrong', label: 'Wrong card', hint: 'The image isn’t the card named.' },
]

describe('KitRadioGroup', () => {
  it('is a radio group named by its caption, each answer named by its words and described by its hint', async () => {
    const { wrapper } = field(
      KitRadioGroup,
      null,
      { label: 'What’s wrong?', group: true },
      { options: reasons },
    )
    const caption = wrapper.get('.kit-form-field__label')
    const group = wrapper.get('[role="radiogroup"]')
    expect(group.attributes('aria-labelledby')).toBe(caption.attributes('id'))
    const radios = group.findAll('[role="radio"]')
    expect(radios.map((r) => r.attributes('aria-checked'))).toEqual(['false', 'false', 'false'])
    const first = radios[0]
    const label = wrapper.get(`[for="${String(first?.attributes('id'))}"]`)
    expect(first?.attributes('aria-labelledby')).toBe(label.attributes('id'))
    expect(label.text()).toBe('Scan artefact')
    expect(wrapper.get(`[id="${String(first?.attributes('aria-describedby'))}"]`).text()).toBe(
      'Dust, scratches or glare on the image.',
    )
    expect(radios[1]?.attributes('aria-describedby')).toBeUndefined()
    expect(await axeFindings(wrapper)).toEqual([])
  })

  it('chooses an answer by a click on its ring or its words', async () => {
    const { wrapper, state } = field(
      KitRadioGroup,
      null,
      { label: 'What’s wrong?', group: true },
      { options: reasons },
    )
    await flushPromises()
    const radios = wrapper.findAll('[role="radio"]')
    await radios[1]?.trigger('click')
    expect(state.value).toBe('crooked')
    await nextTick()
    expect(radios[1]?.attributes('aria-checked')).toBe('true')
    await wrapper.get(`[for="${String(radios[2]?.attributes('id'))}"]`).trigger('click')
    expect(state.value).toBe('wrong')
  })

  it('chooses the answer an arrow key moves to, however briefly the key is held', async () => {
    const { wrapper, state } = field(
      KitRadioGroup,
      'scan',
      { label: 'What’s wrong?', group: true },
      { options: reasons },
    )
    await flushPromises()
    wrapper.findAll<HTMLElement>('[role="radio"]')[1]?.element.focus()
    await wrapper.get('[role="radiogroup"]').trigger('keydown', { key: 'ArrowDown' })
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(state.value).toBe('crooked')
  })

  it('chooses nothing for a key that is no arrow, nor while it is disabled', async () => {
    const { wrapper, state } = field(
      KitRadioGroup,
      'scan',
      { label: 'What’s wrong?', group: true },
      { options: reasons },
    )
    await flushPromises()
    const group = wrapper.get('[role="radiogroup"]')
    wrapper.findAll<HTMLElement>('[role="radio"]')[1]?.element.focus()
    await group.trigger('keydown', { key: 'a' })
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(state.value).toBe('scan')

    const disabled = field(
      KitRadioGroup,
      'scan',
      { label: 'What’s wrong?', group: true },
      { options: reasons, disabled: true },
    )
    await flushPromises()
    await disabled.wrapper.get('[role="radiogroup"]').trigger('keydown', { key: 'ArrowDown' })
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(disabled.state.value).toBe('scan')
  })

  it('marks the group when in error, and gathers answers under headings', () => {
    const { wrapper } = field(
      KitRadioGroup,
      'a',
      { label: 'Seat', group: true, error: 'That seat is taken.' },
      {
        options: [
          { value: 'a', label: 'A1', group: 'Front' },
          { value: 'b', label: 'B1', group: 'Back' },
        ],
      },
    )
    const group = wrapper.get('[role="radiogroup"]')
    expect(group.attributes('aria-invalid')).toBe('true')
    expect(group.attributes('aria-describedby')).toMatch(/-error$/)
    expect(
      group.findAll('[role="group"]').map((run) => run.get('.kit-choice-group__heading').text()),
    ).toEqual(['Front', 'Back'])
  })
})
