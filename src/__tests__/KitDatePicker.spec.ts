import { afterEach, describe, expect, it } from 'vitest'
import { nextTick } from 'vue'
import { flushPromises } from '@vue/test-utils'
import KitDatePicker from '../components/KitDatePicker.vue'
import { soon } from '../../shared/test/web/wait.js'
import { axeFindings, field, unmountKept } from './helpers'

afterEach(unmountKept)

/** A picker in a `group` field, as a page puts one, in a locale written day/month/year. */
function picker(value: string, props: Record<string, unknown> = {}, fieldProps = {}) {
  return field(
    KitDatePicker,
    value,
    { label: 'Lent on', group: true, ...fieldProps },
    { locale: 'en-GB', ...props },
  )
}

function parts(root: Element): string[] {
  return [...root.querySelectorAll('.kit-date-field__part')].map((part) => part.textContent.trim())
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

describe('KitDatePicker', () => {
  it('shows the date in its parts, named by its field’s caption, with nothing axe finds', async () => {
    const { wrapper } = picker('2026-11-20')
    await nextTick()
    expect(parts(wrapper.element)).toEqual(['20', '11', '2026'])
    const group = wrapper.get('.kit-date-picker')
    expect(group.attributes('role')).toBe('group')
    const caption = document.getElementById(group.attributes('aria-labelledby') ?? '')
    expect(caption?.textContent).toContain('Lent on')
    expect(wrapper.find('button[aria-label="Choose a date"]').exists()).toBe(true)
    expect(await axeFindings(wrapper)).toEqual([])
  })

  it('opens a month’s calendar beside it, and a day picked becomes the date', async () => {
    const { wrapper, state } = picker('2026-11-20')
    await nextTick()
    const calendar = await openCalendar(wrapper.element)
    expect(calendar.querySelector('.kit-calendar__heading')?.textContent).toContain('November 2026')
    expect(calendar.querySelector('[data-selected]')?.textContent.trim()).toBe('20')
    expect(calendar.closest('.kit-form-field')).not.toBeNull()
    expect(await axeFindings(document.body)).toEqual([])

    const day = [...calendar.querySelectorAll<HTMLElement>('.kit-calendar__day')].find(
      (cell) => cell.textContent.trim() === '24' && !cell.hasAttribute('data-outside-view'),
    )
    day?.click()
    await flushPromises()
    expect(state.value).toBe('2026-11-24')
  })

  it('holds its calendar to its first and last dates', async () => {
    const { wrapper } = picker('2026-11-20', { min: '2026-11-10', max: '2026-11-25' })
    await nextTick()
    const calendar = await openCalendar(wrapper.element)
    const day = (text: string): HTMLElement | undefined =>
      [...calendar.querySelectorAll<HTMLElement>('.kit-calendar__day')].find(
        (cell) => cell.textContent.trim() === text && !cell.hasAttribute('data-outside-view'),
      )
    expect(day('5')?.hasAttribute('data-disabled')).toBe(true)
    expect(day('15')?.hasAttribute('data-disabled')).toBe(false)
    expect(day('28')?.hasAttribute('data-disabled')).toBe(true)
  })

  it('reads a date it can’t parse as none, rather than failing', async () => {
    const { wrapper } = picker('2026-13-45')
    await nextTick()
    expect(
      wrapper
        .findAll('.kit-date-field__part')
        .every((part) => part.attributes('data-placeholder') !== undefined),
    ).toBe(true)
  })

  it('is empty with no date, and marked in each part when its field is in error', async () => {
    const { wrapper } = picker('', {}, { error: 'Say when it was lent.' })
    await nextTick()
    const group = wrapper.get('.kit-date-picker')
    expect(group.classes()).toContain('is-invalid')
    expect(
      wrapper
        .findAll('.kit-date-field__part')
        .every((part) => part.attributes('aria-invalid') === 'true'),
    ).toBe(true)
    const described = document.getElementById(group.attributes('aria-describedby') ?? '')
    expect(described?.textContent).toContain('Say when it was lent.')
  })

  it('takes a time with `time`, showing a moment in its zone and naming the zone', async () => {
    const { wrapper, state } = picker('2026-06-13T20:00:00.000Z', {
      time: true,
      timeZone: 'Europe/London',
    })
    await nextTick()
    expect(parts(wrapper.element)).toEqual(['13', '06', '2026', '21', '00'])
    const group = wrapper.get('.kit-date-picker')
    const zone = wrapper.get('.kit-date-field__zone')
    expect(zone.text()).toBe('BST')
    expect(group.attributes('aria-describedby')).toBe(zone.attributes('id'))
    expect(await axeFindings(wrapper)).toEqual([])

    const hour = wrapper.findAll('.kit-date-field__part')[3]
    hour?.element.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }))
    await nextTick()
    expect(state.value).toBe('2026-06-13T21:00:00Z')
  })

  it('writes nothing once a part is cleared', async () => {
    const { wrapper, state } = picker('2026-11-20')
    await nextTick()
    const day = wrapper.findAll('.kit-date-field__part')[0]?.element
    for (const press of ['Backspace', 'Backspace']) {
      day?.dispatchEvent(new KeyboardEvent('keydown', { key: press, bubbles: true }))
    }
    await nextTick()
    expect(state.value).toBe('')
  })

  it('shows a moment in the browser’s own zone where the page names none', async () => {
    const { wrapper } = picker('2026-06-13T20:00:00Z', { time: true })
    await nextTick()
    const hour = new Date('2026-06-13T20:00:00Z').getHours()
    expect(parts(wrapper.element)[3]).toBe(String(hour).padStart(2, '0'))
    expect(wrapper.get('.kit-date-field__zone').text()).not.toBe('')
  })

  it('reads a moment without an offset as none, and starts its parts in its zone', async () => {
    const { wrapper, state } = picker('2026-06-13T20:00', { time: true, timeZone: 'Asia/Tokyo' })
    await nextTick()
    const all = wrapper.findAll('.kit-date-field__part')
    expect(all.every((part) => part.attributes('data-placeholder') !== undefined)).toBe(true)
    for (const part of all) {
      part.element.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }))
      await nextTick()
    }
    // Every part filled from midnight in Tokyo, nine hours ahead of UTC, makes a moment there.
    expect(String(state.value)).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:00Z$/)
  })
})
