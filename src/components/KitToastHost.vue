<script setup lang="ts">
// Where toasts show. The app mounts it once, at its root, and raises a toast with `useToast()`.
// Toasts float at the screen's top edge, above any dialog, each for a few seconds: hovering or
// focusing one holds it, F8 moves focus to them, and a swipe or its Dismiss button closes one.
// A press on a toast leaves an open dialog open. A screen reader hears each toast through the
// kit's own announcer, from inside the open dialog when there is one: errors and warnings at
// once, the rest when it next pauses. Each tone's icon comes from the `icon` slot, given the
// tone, from the app's own icon set; with none, the kit draws each tone's own shape, so color
// is never the only cue. An app with a fixed bar along the top maps --kit-toast-inset-top to
// its height, so toasts start below it.
import { ToastProvider, ToastViewport } from 'reka-ui'
import { toastManager } from '../composables/useToast'
import type { KitToastTone } from '../composables/useToast'
import KitAnnouncer from './KitAnnouncer.vue'
import KitToastList from './KitToastList.vue'

defineSlots<{
  icon?: (props: { tone: KitToastTone }) => unknown
}>()
</script>

<template>
  <ToastProvider :toast-manager="toastManager" label="Notification">
    <KitToastList>
      <template v-if="$slots.icon" #icon="{ tone }"><slot name="icon" :tone="tone" /></template>
    </KitToastList>
    <ToastViewport class="kit-toast-stack" label="Notifications ({hotkey})" />
  </ToastProvider>
  <!-- Where a toast is read out when no dialog is open; an open dialog reads it from its own. -->
  <KitAnnouncer />
</template>
