<script setup lang="ts">
// Two live regions, never seen, that `announce()` writes into: one polite, one assertive. They
// are on the page, empty, from the moment it mounts, so a screen reader is already listening
// when a message arrives; a region added with its words already in it is often never read.
//
// KitToastHost holds one, and every open KitDialog another, inside it. Some screen readers
// ignore every live region outside an aria-modal dialog, and Reka hides the rest of the page
// from them besides, so a message is read from the newest announcer: the open dialog's when
// there is one.
//
// They are plain aria-live regions, without the status and alert roles, which say the same
// to a screen reader. With the roles, every open dialog would carry an empty alert, which an
// app's own test that finds "the alert" in a dialog would find first (the MathBot pilot hit it).
//
// Reka 2.11's toasts carry an announcer of their own, but it is hidden from screen readers
// (aria-hidden), so it never speaks; KitToastHost.spec.ts fails the day Reka's speaks, and
// then this one goes, so that no toast is read twice.
import { useAnnouncerRegion } from '../composables/useAnnouncer'

const { polite, assertive } = useAnnouncerRegion()
</script>

<template>
  <div class="kit-announcer">
    <span aria-live="polite" aria-atomic="true">{{ polite }}</span>
    <span aria-live="assertive" aria-atomic="true">{{ assertive }}</span>
  </div>
</template>

<style scoped>
@layer kit {
  .kit-announcer {
    position: absolute;
    width: 1px;
    height: 1px;
    margin: -1px;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
  }
}
</style>
