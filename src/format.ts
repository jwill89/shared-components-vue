/** The language the kit writes in: the page's own, from its `<html lang>`, or the browser's. */
function language(): string | undefined {
  return document.documentElement.lang || undefined
}

/**
 * How the kit writes a count, such as a text box's characters against its limit: grouped by
 * thousands in the page's language (its `<html lang>`), as the browser formats numbers for it.
 */
export function formatCount(count: number): string {
  return new Intl.NumberFormat(language()).format(count)
}

const BYTE_UNITS = ['byte', 'kilobyte', 'megabyte', 'gigabyte'] as const

/**
 * A file's size in the page's language, in the largest unit that keeps it at one or more, each
 * 1,024 of the one below as a computer counts them: "512 bytes", "12 kB", "3.4 MB". Below ten
 * it keeps one decimal, and above, none.
 */
export function formatBytes(bytes: number): string {
  let value = bytes
  let at = 0
  while (value >= 1024 && at < BYTE_UNITS.length - 1) {
    value /= 1024
    at += 1
  }
  return new Intl.NumberFormat(language(), {
    style: 'unit',
    unit: BYTE_UNITS[at],
    unitDisplay: at === 0 ? 'long' : 'short',
    maximumFractionDigits: at > 0 && value < 10 ? 1 : 0,
  }).format(value)
}

/** Words as a list in the page's language: "PNG, JPEG, and WebP", or "…, or WebP". */
export function formatList(words: readonly string[], type: 'conjunction' | 'disjunction'): string {
  return new Intl.ListFormat(language(), { type }).format(words)
}

/**
 * A day in the page's language, as RFC 3339 gives it ("13 Jun 2026", "Jun 13, 2026"), in the
 * browser's own time zone; text that isn't a date comes back as it was.
 */
export function formatDay(moment: string): string {
  const day = new Date(moment)
  return Number.isNaN(day.getTime())
    ? moment
    : new Intl.DateTimeFormat(language(), { dateStyle: 'medium' }).format(day)
}
