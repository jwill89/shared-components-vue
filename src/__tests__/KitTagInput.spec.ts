import { afterEach, describe, expect, it } from 'vitest'
import { nextTick } from 'vue'
import { flushPromises } from '@vue/test-utils'
import KitTagInput from '../components/KitTagInput.vue'
import { axeFindings, field, unmountKept } from './helpers'

afterEach(unmountKept)

const lower = (typed: string): string => typed.trim().toLowerCase()

/** Types `text` into the box and presses `key`, as a person does. */
async function type(input: HTMLInputElement, text: string, key = 'Enter'): Promise<void> {
  input.value = text
  input.dispatchEvent(new Event('input', { bubbles: true }))
  input.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }))
  await flushPromises()
}

function box(root: Element): HTMLInputElement {
  const found = root.querySelector('input')
  if (!found) {
    throw new Error('No box.')
  }
  return found
}

function chips(root: Element): string[] {
  return [...root.querySelectorAll('.kit-chip__label')].map((chip) => chip.textContent.trim())
}

describe('KitTagInput', () => {
  it('adds what is typed on Enter as the app keeps it, and drops a repeat', async () => {
    const { wrapper, state } = field(KitTagInput, [], { label: 'Tags' }, { normalize: lower })
    const input = box(wrapper.element)
    expect(wrapper.get('label').attributes('for')).toBe(input.id)

    await type(input, ' Career ')
    await type(input, 'travel')
    await type(input, 'CAREER')
    expect(state.value).toEqual(['career', 'travel'])
    expect(chips(wrapper.element)).toEqual(['career', 'travel'])
    expect(await axeFindings(wrapper)).toEqual([])
  })

  it('splits what is added whole at its commas', async () => {
    const { wrapper, state } = field(KitTagInput, [], { label: 'Tags' })
    const input = box(wrapper.element)
    input.value = 'love, luck,,'
    input.dispatchEvent(new Event('input', { bubbles: true }))
    input.dispatchEvent(new FocusEvent('blur'))
    await flushPromises()
    expect(state.value).toEqual(['love', 'luck'])
  })

  it('removes a tag by its own Remove button, or by Backspace twice in the empty box', async () => {
    const { wrapper, state } = field(KitTagInput, ['career', 'travel', 'love'], { label: 'Tags' })
    const remove = wrapper.get('button[aria-label="Remove travel"]')
    await remove.trigger('click')
    expect(state.value).toEqual(['career', 'love'])

    const input = box(wrapper.element)
    input.focus()
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Backspace', bubbles: true }))
    await nextTick()
    expect(wrapper.get('.kit-chip[data-state="active"]').text()).toContain('love')
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Backspace', bubbles: true }))
    await flushPromises()
    expect(state.value).toEqual(['career'])
  })

  it('offers its suggestions that hold what is typed, and adds one with a press', async () => {
    const { wrapper, state } = field(
      KitTagInput,
      ['career'],
      { label: 'Tags' },
      { suggestions: ['career', 'travel', 'luck', 'love', 'health'], suggestionLimit: 2 },
    )
    const offered = (): string[] =>
      wrapper.findAll('.kit-tag-input__suggestions button').map((b) => b.text())
    // The chosen tag isn't offered again, and only the first two show.
    expect(offered()).toEqual(['travel', 'luck'])
    const group = wrapper.get('[role="group"]')
    expect(
      document.getElementById(group.attributes('aria-labelledby') ?? '')?.textContent,
    ).toContain('Suggestions')
    expect(await axeFindings(wrapper)).toEqual([])

    const input = box(wrapper.element)
    input.value = 'lo'
    input.dispatchEvent(new Event('input', { bubbles: true }))
    await nextTick()
    expect(offered()).toEqual(['love'])

    await wrapper.get('button[aria-label="Add love"]').trigger('click')
    expect(state.value).toEqual(['career', 'love'])
    expect(input.value).toBe('')
    expect(document.activeElement).toBe(input)
  })

  it('offers nothing once it holds its most, and refuses more', async () => {
    const { wrapper, state } = field(
      KitTagInput,
      ['career', 'travel'],
      { label: 'Tags' },
      { max: 2, suggestions: ['luck'] },
    )
    expect(wrapper.find('.kit-tag-input__suggestions').exists()).toBe(false)
    await type(box(wrapper.element), 'luck')
    expect(state.value).toEqual(['career', 'travel'])
  })

  it('asks for its suggestions when the box takes focus', async () => {
    const { wrapper } = field(KitTagInput, [], { label: 'Tags' })
    await wrapper.get('input').trigger('focus')
    expect(wrapper.findComponent(KitTagInput).emitted('wantSuggestions')).toHaveLength(1)
  })

  it('is described by its field, and marked when the field is in error', () => {
    const { wrapper } = field(KitTagInput, [], { label: 'Tags', error: 'Add a tag.' })
    const input = wrapper.get('input')
    expect(input.attributes('aria-invalid')).toBe('true')
    const described = document.getElementById(input.attributes('aria-describedby') ?? '')
    expect(described?.textContent).toContain('Add a tag.')
    expect(wrapper.get('.kit-tag-input__box').classes()).toContain('is-invalid')
  })
})
