<script setup lang="ts">
// The kit's own drawn marks, for a button or a list when the app gives no icon of its own: a
// cross to close or remove, a chevron that shows a list opens, a check beside a chosen option, a
// plus to add, arrows to the previous and the next, three dots for a menu of more, a calendar that
// opens a date's, a column's sort: either way, up, or down; and for the Markdown editor's tools,
// a link, a clock, a bulleted and a numbered list, and a quote; a dash in a box partly ticked, two
// sheets for a copy, an eye that shows what a password box hides, a grip a row is moved by, and
// an arrow out of a box for a link that opens elsewhere.
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
  | 'dash'
  | 'copy'
  | 'eye'
  | 'grip'
  | 'external'

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
  dash: 'M3 7h10v2H3z',
  // The sheet behind shows only its top and its far side; the one in front is drawn whole.
  copy: 'M4.5 1H14v9.5h-1.5v-8h-8zM2 4.5h8.5V15H2zM3.5 6v7.5H9V6z',
  // An eye's outline, its white cut out, and the pupil inside drawn again.
  eye: 'M8 3c3.5 0 6.2 2.4 7.5 5-1.3 2.6-4 5-7.5 5S1.8 10.6.5 8C1.8 5.4 4.5 3 8 3zm0 1.5C5.6 4.5 3.6 6 2.2 8c1.4 2 3.4 3.5 5.8 3.5s4.4-1.5 5.8-3.5C12.4 6 10.4 4.5 8 4.5zM8 5.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5z',
  // A box open at its corner, and an arrow leaving through it.
  external: 'M2 3.5h5V5H3.5v7.5H11V9h1.5v5H2zM9 2h5v5h-1.5V4.6L8 9.1 6.9 8l4.5-4.5H9z',
  // Two columns of three dots, the mark of a thing that is picked up and moved.
  grip: 'M5.5 1.75a1.25 1.25 0 1 1 0 2.5 1.25 1.25 0 0 1 0-2.5zM5.5 6.75a1.25 1.25 0 1 1 0 2.5 1.25 1.25 0 0 1 0-2.5zM5.5 11.75a1.25 1.25 0 1 1 0 2.5 1.25 1.25 0 0 1 0-2.5zM10.5 1.75a1.25 1.25 0 1 1 0 2.5 1.25 1.25 0 0 1 0-2.5zM10.5 6.75a1.25 1.25 0 1 1 0 2.5 1.25 1.25 0 0 1 0-2.5zM10.5 11.75a1.25 1.25 0 1 1 0 2.5 1.25 1.25 0 0 1 0-2.5z',
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
