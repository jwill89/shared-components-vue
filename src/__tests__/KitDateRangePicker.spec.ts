import { afterEach, describe, expect, it } from 'vitest'
import { h, nextTick, reactive } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import KitDateRangePicker from '../components/KitDateRangePicker.vue'
import KitFormField from '../components/KitFormField.vue'
import type { KitFieldBinding } from '../components/KitFormField.vue'
import { soon } from '../../shared/test/web/wait.js'
import { axeFindings, kept, unmountKept } from './helpers'

afterEach(unmountKept)

/** A range picker in a `group` field, its two models kept as a page keeps two fields. */
function range(start: string, end: string, props: Record<string, unknown> = {}) {
  const state = reactive({ start, end })
  const wrapper = kept(
    mount(KitFormField, {
      props: { label: 'Report on', group: true },
      slots: {
        default: (binding: KitFieldBinding) =>
          h(KitDateRangePicker, {
            ...binding,
            locale: 'en-GB',
            ...props,
            start: state.start,
            end: state.end,
            'onUpdate:start': (next: string) => {
              state.start = next
            },
            'onUpdate:end': (next: string) => {
              state.end = next
            },
          }),
      },
      attachTo: document.body,
    }),
  )
  return { wrapper, state }
}

function words(root: Element | null | undefined): string[] {
  return [...(root?.querySelectorAll('.kit-date-field__part') ?? [])].map((part) =>
    part.textContent.trim(),
  )
}

async function openCalendar(root: Element): Promise<HTMLElement> {
  const open = root.querySelector<HTMLButtonElement>('.kit-date-field__open')
  open?.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerType: 'mouse' }))
  open?.click()
  await flushPromises()
  return soon(() => {
    const calendar = document.querySelector<HTMLElement>('.kit-calendar')
    if (!calendar) {
      throw new Error('No calendar is open.')
    }
    return calendar
  })
}

function day(calendar: HTMLElement, text: string): HTMLElement | undefined {
  return [...calendar.querySelectorAll<HTMLElement>('.kit-calendar__day')].find(
    (cell) => cell.textContent.trim() === text && !cell.hasAttribute('data-outside-view'),
  )
}

describe('KitDateRangePicker', () => {
  it('shows each end in a group of its own, inside the field’s, with nothing axe finds', async () => {
    const { wrapper } = range('2026-11-02', '2026-11-06')
    await nextTick()
    const field = wrapper.get('.kit-date-range-picker')
    expect(field.attributes('role')).toBe('group')
    expect(
      document.getElementById(field.attributes('aria-labelledby') ?? '')?.textContent,
    ).toContain('Report on')
    const from = field.find('[role="group"][aria-label="From"]')
    const to = field.find('[role="group"][aria-label="To"]')
    expect(words(from.element)).toEqual(['02', '11', '2026'])
    expect(words(to.element)).toEqual(['06', '11', '2026'])
    expect(await axeFindings(wrapper)).toEqual([])
  })

  it('marks the run in its calendar, and a first and second press make a new one', async () => {
    const { wrapper, state } = range('2026-11-02', '2026-11-06')
    await nextTick()
    const calendar = await openCalendar(wrapper.element)
    expect(day(calendar, '2')?.hasAttribute('data-selection-start')).toBe(true)
    expect(day(calendar, '4')?.hasAttribute('data-selected')).toBe(true)
    expect(day(calendar, '6')?.hasAttribute('data-selection-end')).toBe(true)
    expect(await axeFindings(document.body)).toEqual([])

    day(calendar, '10')?.click()
    await flushPromises()
    day(calendar, '14')?.click()
    await flushPromises()
    expect(state).toEqual({ start: '2026-11-10', end: '2026-11-14' })
  })

  it('holds the run to its first and last dates', async () => {
    const { wrapper } = range('2026-11-12', '2026-11-14', { min: '2026-11-10', max: '2026-11-25' })
    await nextTick()
    const calendar = await openCalendar(wrapper.element)
    expect(day(calendar, '5')?.hasAttribute('data-disabled')).toBe(true)
    expect(day(calendar, '20')?.hasAttribute('data-disabled')).toBe(false)
    expect(day(calendar, '28')?.hasAttribute('data-disabled')).toBe(true)
  })

  it('starts empty, in the browser’s own language where the page names none', async () => {
    const { wrapper } = range('', '', { locale: undefined })
    await nextTick()
    const field = wrapper.get('.kit-date-range-picker')
    // jsdom's browser writes American dates: the month first.
    expect(
      field.findAll('.kit-date-field__part[data-placeholder]').map((part) => part.text()),
    ).toEqual(['mm', 'dd', 'yyyy', 'mm', 'dd', 'yyyy'])
  })

  it('clears an end that is cleared, and takes no time of day', async () => {
    const { wrapper, state } = range('2026-11-02', '2026-11-06')
    await nextTick()
    const day = wrapper.findAll('[aria-label="To"] .kit-date-field__part')[0]?.element
    for (const press of ['Backspace', 'Backspace']) {
      day?.dispatchEvent(new KeyboardEvent('keydown', { key: press, bubbles: true }))
    }
    await nextTick()
    expect(state).toEqual({ start: '2026-11-02', end: '' })
    expect(wrapper.find('.kit-date-field__zone').exists()).toBe(false)
  })
})
