<script setup lang="ts">
// The kit's own drawn marks, for a button or a list when the app gives no icon of its own: a
// cross to close or remove, a chevron that shows a list opens, a check beside a chosen option, a
// plus to add, and arrows to the previous and the next.
// Each takes the size and color of the text around it, and is hidden from screen readers, since
// the control it sits in names what it does.
export type KitGlyphName = 'cross' | 'chevron' | 'check' | 'plus' | 'previous' | 'next'

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
}
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
    <path :d="shapes[name]" />
  </svg>
</template>
