<script setup lang="ts">
// One row of a KitDescriptionList: its term, from `term` or the `term` slot when it needs
// markup, and what it names in the default slot.
import { filled } from './slots'

defineProps<{
  term?: string
}>()

defineSlots<{
  /** What the term names. */
  default?: () => unknown
  /** The term, when it needs markup. */
  term?: () => unknown
}>()
</script>

<template>
  <div class="kit-description-list__item">
    <dt class="kit-description-list__term">
      <slot v-if="filled($slots.term)" name="term" />
      <template v-else>{{ term }}</template>
    </dt>
    <dd class="kit-description-list__detail"><slot /></dd>
  </div>
</template>
