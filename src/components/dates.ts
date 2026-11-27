// What KitDatePicker, KitDateRangePicker and KitTimeField share: the kit's text forms read into
// what Reka holds, and written back. A day is RFC 3339's full-date (`2026-06-13`); a moment its
// date-time with an offset, which the kit writes in UTC (`2026-06-13T20:00:00Z`) and shows in a
// time zone; and a time of day its partial-time (`20:00`, or `20:00:30` with seconds). Text that
// doesn't parse reads as none, rather than failing.
import {
  Time,
  getLocalTimeZone,
  now,
  parseAbsolute,
  parseDate,
  parseTime,
  toZoned,
} from '@internationalized/date'
import type { CalendarDate, DateValue, ZonedDateTime } from '@internationalized/date'

/** The zone a moment is shown in when the page names none: the browser's own. */
export function localZone(): string {
  return getLocalTimeZone()
}

/** The locale dates are written in when the page names none: the browser's own. */
export function localLocale(): string {
  return typeof navigator === 'undefined' ? 'en' : navigator.language
}

/** A `YYYY-MM-DD` day, or nothing for one empty or malformed. */
export function readDay(text: string | undefined): CalendarDate | undefined {
  if (!text) {
    return undefined
  }
  try {
    return parseDate(text)
  } catch {
    return undefined
  }
}

/** An RFC 3339 moment, offset and all, as it stands in `zone`; nothing for one without an offset. */
export function readMoment(text: string | undefined, zone: string): ZonedDateTime | undefined {
  if (!text) {
    return undefined
  }
  try {
    return parseAbsolute(text, zone)
  } catch {
    return undefined
  }
}

/** A day as `YYYY-MM-DD`, in the Gregorian calendar whatever calendar the locale shows. */
export function writeDay(value: DateValue): string {
  return value.toString().slice(0, 10)
}

/** A moment as RFC 3339 in UTC, a date and time with no zone of its own read as in `zone`. */
export function writeMoment(value: DateValue, zone: string): string {
  const zoned = 'timeZone' in value ? value : toZoned(value, zone)
  return zoned.toAbsoluteString().replace(/\.000Z$/, 'Z')
}

/** Midnight today in `zone`, which a moment's empty parts start from. */
export function midnight(zone: string): ZonedDateTime {
  return now(zone).set({ hour: 0, minute: 0, second: 0, millisecond: 0 })
}

/** A `HH:mm` or `HH:mm:ss` time of day, or nothing for one empty or malformed. */
export function readTime(text: string | undefined): Time | undefined {
  if (!text) {
    return undefined
  }
  try {
    return parseTime(text)
  } catch {
    return undefined
  }
}

/** A time of day as `HH:mm`, or `HH:mm:ss` with `seconds`. */
export function writeTime(
  value: { hour: number; minute: number; second: number },
  seconds: boolean,
): string {
  return new Time(value.hour, value.minute, value.second).toString().slice(0, seconds ? 8 : 5)
}

/** One part of a date or time, as Reka hands the parts to draw. */
interface Part {
  part: string
  value: string
}

/**
 * The words a 12-hour clock's hour is read by, bound over Reka's, which give its 24-hour value
 * with the half of the day ("13 PM", as of Reka 2.11): the hour as shown, with its half ("1 PM").
 * Nothing for any other part, or an hour not yet typed, so Reka's own words stand there.
 */
export function hourWords(parts: readonly Part[], part: Part): Record<string, string> {
  const half = parts.find((each) => each.part === 'dayPeriod')?.value
  return part.part === 'hour' && half && /^\d+$/.test(part.value)
    ? { 'aria-valuetext': `${String(Number(part.value))} ${half}` }
    : {}
}

/** The short name of `zone` at a moment, as the locale writes it ("GMT", "PST", "GMT+1"). */
export function zoneName(zone: string, locale: string, at: Date): string {
  const parts = new Intl.DateTimeFormat(locale, { timeZone: zone, timeZoneName: 'short' })
  return parts.formatToParts(at).find((part) => part.type === 'timeZoneName')?.value ?? zone
}
