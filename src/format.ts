/**
 * How the kit writes a count, such as a text box's characters against its limit: grouped by
 * thousands in the page's language (its `<html lang>`), as the browser formats numbers for it.
 */
export function formatCount(count: number): string {
  return new Intl.NumberFormat(document.documentElement.lang || undefined).format(count)
}
