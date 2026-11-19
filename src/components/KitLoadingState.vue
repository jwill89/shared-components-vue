<script setup lang="ts">
// What a list or page shows while its data is on the way: a spinner and, in words, what is
// loading, read once by a screen reader as a status. A list that is still loading never says it
// is empty (KitEmptyState) or that it failed (KitErrorState).
import KitSpinner from './KitSpinner.vue'

withDefaults(
  defineProps<{
    /** What is loading, as a sentence: "Loading the shelves…". */
    label?: string
  }>(),
  { label: 'Loading…' },
)
</script>

<template>
  <div class="kit-loading-state">
    <KitSpinner class="kit-loading-state__spinner" :label="label" />
  </div>
</template>

<style scoped>
@layer kit {
  .kit-loading-state {
    display: flex;
    justify-content: center;
    padding: var(--kit-space-xl) var(--kit-space-md);
  }

  /* The ring is drawn large; the words beside it stay at the size of the text around them. */
  .kit-loading-state__spinner :deep(.kit-spinner__ring) {
    font-size: var(--kit-text-size-lg);
  }
}
</style>
