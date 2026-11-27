<script setup lang="ts">
// Answers openLightbox() with the app's one KitLightbox, for pages that open the viewer from
// anywhere without one of their own. The app mounts it once, at its root; its labels and slots
// are the viewer's, such as the bar's own buttons in `actions`.
import { lightbox } from '../composables/useLightbox'
import KitLightbox from './KitLightbox.vue'
import type { KitLightboxImage } from './lightbox'

defineSlots<{
  /** The app's own buttons in the bar, given the image on screen and its place among the rest. */
  actions?: (props: { image: KitLightboxImage; index: number }) => unknown
  'close-icon'?: () => unknown
  'previous-icon'?: () => unknown
  'next-icon'?: () => unknown
  'original-icon'?: () => unknown
}>()
</script>

<template>
  <KitLightbox
    v-model:open="lightbox.open"
    v-model:index="lightbox.index"
    :images="lightbox.images"
  >
    <template v-if="$slots.actions" #actions="scope"
      ><slot name="actions" v-bind="scope"
    /></template>
    <template v-if="$slots['close-icon']" #close-icon><slot name="close-icon" /></template>
    <template v-if="$slots['previous-icon']" #previous-icon><slot name="previous-icon" /></template>
    <template v-if="$slots['next-icon']" #next-icon><slot name="next-icon" /></template>
    <template v-if="$slots['original-icon']" #original-icon><slot name="original-icon" /></template>
  </KitLightbox>
</template>
