<script setup lang="ts">
// Each tone of toast, raised with useToast() as a page raises one after an action.
import { KitButton, useToast } from '@jwill89/shared-components-vue'

const toast = useToast()
</script>

<template>
  <section class="playground-section" aria-labelledby="toasts-heading">
    <h2 id="toasts-heading">Toasts</h2>

    <h3>KitToastHost and useToast()</h3>
    <p class="playground-note">
      Each tone, at the screen's top edge. Hover or focus one to hold it; F8 moves focus to them.
    </p>
    <div class="playground-row">
      <KitButton @click="toast.success('Saved the shelf')">Show a success</KitButton>
      <KitButton
        @click="toast.error('That didn’t save', 'The server said: the shelf was deleted.')"
      >
        Show an error
      </KitButton>
      <KitButton @click="toast.warning('Nearly full', 'Two places left on the shelf.')">
        Show a warning
      </KitButton>
      <KitButton @click="toast.info('The shelf is shared with Sam')">Show a note</KitButton>
    </div>
  </section>
</template>
