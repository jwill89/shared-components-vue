import { afterEach, describe, expect, it } from 'vitest'
import { nextTick } from 'vue'
import { CalendarDateTime } from '@internationalized/date'
import KitTimeField from '../components/KitTimeField.vue'
import { readMoment, readTime, writeMoment, writeTime } from '../components/dates'
import { axeFindings, field, unmountKept } from './helpers'

afterEach(unmountKept)

/** A time field in a `group` field, as a page puts one, in a locale written on a 24-hour clock. */
function clock(value: string, props: Record<string, unknown> = {}, fieldProps = {}) {
  return field(
    KitTimeField,
    value,
    { label: 'Opens at', group: true, ...fieldProps },
    { locale: 'en-GB', ...props },
  )
}

function parts(root: Element): HTMLElement[] {
  return [...root.querySelectorAll<HTMLElement>('.kit-date-field__part')]
}

function press(part: HTMLElement | undefined, key: string): void {
  part?.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }))
}

describe('KitTimeField', () => {
  it('shows the time in its parts, named by its field’s caption, with nothing axe finds', async () => {
    const { wrapper } = clock('20:30')
    await nextTick()
    expect(parts(wrapper.element).map((part) => part.textContent.trim())).toEqual(['20', '30'])
    const group = wrapper.get('.kit-time-field')
    expect(group.attributes('role')).toBe('group')
    const caption = document.getElementById(group.attributes('aria-labelledby') ?? '')
    expect(caption?.textContent).toContain('Opens at')
    expect(await axeFindings(wrapper)).toEqual([])
  })

  it('writes the time a key moves it to as `HH:mm`', async () => {
    const { wrapper, state } = clock('20:30')
    await nextTick()
    press(parts(wrapper.element)[1], 'ArrowUp')
    await nextTick()
    expect(state.value).toBe('20:31')
  })

  it('takes seconds, and writes them', async () => {
    const { wrapper, state } = clock('20:30:15', { seconds: true })
    await nextTick()
    expect(parts(wrapper.element)).toHaveLength(3)
    press(parts(wrapper.element)[2], 'ArrowUp')
    await nextTick()
    expect(state.value).toBe('20:30:16')
  })

  it('shows the half of the day on a 12-hour clock', async () => {
    const { wrapper } = clock('20:30', { hourCycle: 12 })
    await nextTick()
    expect(wrapper.get('[data-reka-time-field-segment="dayPeriod"]').text()).toBe('PM')
    expect(parts(wrapper.element)[0]?.textContent.trim()).toBe('8')
    // Reka reads the hour as "20 PM"; the kit reads it as shown.
    expect(parts(wrapper.element)[0]?.getAttribute('aria-valuetext')).toBe('8 PM')
    expect(parts(wrapper.element)[1]?.getAttribute('aria-valuetext')).toBe('30')
  })

  it('writes nothing once a part is cleared, and takes the browser’s locale by default', async () => {
    const { wrapper, state } = clock('20:30', { locale: undefined })
    await nextTick()
    // jsdom's browser speaks American English, which keeps a 12-hour clock.
    expect(wrapper.find('[data-reka-time-field-segment="dayPeriod"]').exists()).toBe(true)
    press(parts(wrapper.element)[0], 'Backspace')
    press(parts(wrapper.element)[0], 'Backspace')
    await nextTick()
    expect(state.value).toBe('')
  })

  it('marks a time outside its first and last as invalid', async () => {
    const { wrapper } = clock('07:00', { min: '08:00', max: '22:00' })
    await nextTick()
    expect(wrapper.get('.kit-time-field').attributes('data-invalid')).toBe('')
  })

  it('reads a time it can’t parse as none, and is marked in each part when its field is in error', async () => {
    const { wrapper } = clock('25:99', {}, { error: 'Say when it opens.' })
    await nextTick()
    const group = wrapper.get('.kit-time-field')
    expect(group.classes()).toContain('is-invalid')
    expect(parts(wrapper.element).every((part) => part.hasAttribute('data-placeholder'))).toBe(true)
    expect(
      parts(wrapper.element).every((part) => part.getAttribute('aria-invalid') === 'true'),
    ).toBe(true)
    const described = document.getElementById(group.attributes('aria-describedby') ?? '')
    expect(described?.textContent).toContain('Say when it opens.')
  })
})

describe('the kit’s date and time text', () => {
  it('reads a moment only with its offset, and writes it in UTC without fractions', () => {
    expect(readMoment('2026-06-13 20:00', 'UTC')).toBeUndefined()
    expect(readMoment('', 'UTC')).toBeUndefined()
    const moment = readMoment('2026-06-13T22:00:00.000+02:00', 'Europe/London')
    expect(moment?.hour).toBe(21)
    expect(moment && writeMoment(moment, 'Europe/London')).toBe('2026-06-13T20:00:00Z')
  })

  it('writes a date and time with no zone of its own as standing in the zone given', () => {
    expect(writeMoment(new CalendarDateTime(2026, 1, 13, 9, 30), 'America/New_York')).toBe(
      '2026-01-13T14:30:00Z',
    )
  })

  it('writes a time of day to the minute, or to the second', () => {
    const time = readTime('07:05:09')
    expect(time && writeTime(time, false)).toBe('07:05')
    expect(time && writeTime(time, true)).toBe('07:05:09')
    expect(readTime('')).toBeUndefined()
  })
})
