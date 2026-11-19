<script setup lang="ts">
// The drawn mark for a tone, when the app gives no icon of its own: a ring around an i, a tick
// or a cross, and a triangle around an exclamation. Each tone has its own shape, so color is
// never the only thing that tells a warning from a success. It takes the size and color of the
// text around it.
import type { KitToastTone } from '../composables/useToast'

defineProps<{
  tone: KitToastTone
}>()

const shapes: Record<KitToastTone, string> = {
  info: 'M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1zm0 1.5a5.5 5.5 0 1 1 0 11 5.5 5.5 0 0 1 0-11zM7.25 7h1.5v4.5h-1.5zM8 4.2a.9.9 0 1 1 0 1.8.9.9 0 0 1 0-1.8z',
  success:
    'M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1zm0 1.5a5.5 5.5 0 1 1 0 11 5.5 5.5 0 0 1 0-11zm2.97 2.97L7 9.44 5.03 7.47 3.97 8.53 7 11.56l5.03-5.03z',
  warning: 'M8 1 15.5 14.5H.5zm0 3.1L3.1 13h9.8zM7.25 7h1.5v3h-1.5zm0 3.75h1.5v1.5h-1.5z',
  error:
    'M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1zm0 1.5a5.5 5.5 0 1 1 0 11 5.5 5.5 0 0 1 0-11zM5.53 4.47 8 6.94l2.47-2.47 1.06 1.06L9.06 8l2.47 2.47-1.06 1.06L8 9.06l-2.47 2.47-1.06-1.06L6.94 8 4.47 5.53z',
}
</script>

<template>
  <svg
    viewBox="0 0 16 16"
    width="1em"
    height="1em"
    fill="currentColor"
    fill-rule="evenodd"
    aria-hidden="true"
    :data-tone="tone"
  >
    <path :d="shapes[tone]" />
  </svg>
</template>
