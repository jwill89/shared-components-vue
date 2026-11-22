<script setup lang="ts">
// The kit's own drawn marks, for a button or a list when the app gives no icon of its own: a
// cross to close or remove, a chevron that shows a list opens, a check beside a chosen option, a
// plus to add, arrows to the previous and the next, three dots for a menu of more, a calendar that
// opens a date's, a column's sort: either way, up, or down; and for the Markdown editor's tools,
// a link, a clock, a bulleted and a numbered list, and a quote.
// Each takes the size and color of the text around it, and is hidden from screen readers, since
// the control it sits in names what it does.
export type KitGlyphName =
  | 'cross'
  | 'chevron'
  | 'check'
  | 'plus'
  | 'previous'
  | 'next'
  | 'more'
  | 'calendar'
  | 'sort'
  | 'sort-ascending'
  | 'sort-descending'
  | 'link'
  | 'clock'
  | 'list'
  | 'list-numbered'
  | 'quote'

defineProps<{
  name: KitGlyphName
}>()

const shapes: Record<KitGlyphName, string> = {
  cross:
    'M3.5 2.1 8 6.6l4.5-4.5 1.4 1.4L9.4 8l4.5 4.5-1.4 1.4L8 9.4l-4.5 4.5-1.4-1.4L6.6 8 2.1 3.5z',
  chevron: 'M2.6 5.4 8 10.8l5.4-5.4 1.1 1.1L8 13 1.5 6.5z',
  check: 'M13.3 3.3 14.7 4.7 6.5 12.9 1.3 7.7l1.4-1.4 3.8 3.8z',
  plus: 'M7 2h2v5h5v2H9v5H7V9H2V7h5z',
  previous: 'M10.6 2.6 5.2 8l5.4 5.4-1.1 1.1L3 8l6.5-6.5z',
  next: 'M5.4 2.6 10.8 8l-5.4 5.4 1.1 1.1L13 8 6.5 1.5z',
  more: 'M8 1.5a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3zm0 5a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3zm0 5a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3z',
  calendar: 'M5 1h1.5v2h3V1H11v2h3v12H2V3h3zM3.5 6.5v7h9v-7z',
  sort: 'M8 2l4 4.5H4zm0 12-4-4.5h8z',
  'sort-ascending': 'M8 3l5 6.5H3z',
  'sort-descending': 'M8 13 3 6.5h10z',
  // Two links of a chain, each wound against its own hole, so where they cross both stay drawn.
  link: 'M4 4.5H6.5a3.5 3.5 0 0 1 0 7H4a3.5 3.5 0 0 1 0-7zm0 2a1.5 1.5 0 0 0 0 3h2.5a1.5 1.5 0 0 0 0-3zM9.5 4.5H12a3.5 3.5 0 0 1 0 7H9.5a3.5 3.5 0 0 1 0-7zm0 2a1.5 1.5 0 0 0 0 3H12a1.5 1.5 0 0 0 0-3z',
  clock:
    'M8 1a7 7 0 1 1 0 14A7 7 0 0 1 8 1zm0 1.5a5.5 5.5 0 1 1 0 11 5.5 5.5 0 0 1 0-11zM7.25 4h1.5v3.69l2.28 2.28-1.06 1.06-2.72-2.72z',
  list: 'M1 2.5h2.5V5H1zm0 4.25h2.5v2.5H1zM1 11h2.5v2.5H1zm4.5-8.25H15v2H5.5zm0 4.25H15v2H5.5zm0 4.25H15v2H5.5z',
  'list-numbered':
    'M2 1h1.25v4H2V2.4l-.9.45V1.7zM.75 6.5h2.5v2.25H2v.75h1.25v1H.75V8.25H2V7.5H.75zm0 5h2.5V16H.75v-1H2v-.5H1v-1h1V12.5H.75zm4.75-8.75H15v2H5.5zm0 4.25H15v2H5.5zm0 4.25H15v2H5.5z',
  quote:
    'M1.5 3h5v5c0 2.8-1.7 4.6-4.2 5l-.5-1.4C3.2 11.2 4 10 4.1 8.5H1.5zm8 0h5v5c0 2.8-1.7 4.6-4.2 5l-.5-1.4c1.4-.4 2.2-1.6 2.3-3.1H9.5z',
}

/** Shapes that cross themselves, whose holes come from their winding rather than even-odd. */
const nonzero = new Set<KitGlyphName>(['link'])
</script>

<template>
  <svg
    viewBox="0 0 16 16"
    width="1em"
    height="1em"
    fill="currentColor"
    aria-hidden="true"
    :data-glyph="name"
  >
    <!-- Even-odd, so a shape drawn inside another, as the calendar's page is, is cut out of it. -->
    <path :d="shapes[name]" :fill-rule="nonzero.has(name) ? 'nonzero' : 'evenodd'" />
  </svg>
</template>
