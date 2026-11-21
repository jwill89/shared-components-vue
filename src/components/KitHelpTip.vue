<script setup lang="ts">
// The one help affordance: a question mark beside a title that opens a short note on what the
// thing is for and what its buttons do. It is a KitPopover, so it opens on a press, by keyboard
// or on a phone, where a tooltip can't, and its note may hold links. The button is named "About"
// and the topic, and so is the note, by its button. The question mark is the kit's own, or the
// `icon` slot's.
import { computed } from 'vue'
import KitIconButton from './KitIconButton.vue'
import KitPopover from './KitPopover.vue'

const props = defineProps<{
  /** What the note is about, as it finishes "About …": "the waitlist". */
  topic: string
}>()

defineSlots<{
  /** The note: a sentence or two, or a short list of terms. */
  default?: () => unknown
  icon?: () => unknown
}>()

const name = computed(() => `About ${props.topic}`)
</script>

<template>
  <KitPopover>
    <template #trigger>
      <KitIconButton :label="name" variant="plain" class="kit-help-tip">
        <slot name="icon"><span class="kit-help-tip__mark">?</span></slot>
      </KitIconButton>
    </template>
    <div class="kit-help-tip__note"><slot /></div>
  </KitPopover>
</template>

<style scoped>
@layer kit {
  .kit-help-tip__mark {
    font-weight: var(--kit-font-weight-strong);
    line-height: var(--kit-line-height-heading);
  }

  /* A note reads small, as a hint does; the popover around it keeps the body's size. */
  .kit-help-tip__note {
    font-size: var(--kit-text-size-sm);
  }

  .kit-help-tip__note > :deep(:first-child) {
    margin-top: 0;
  }

  .kit-help-tip__note > :deep(:last-child) {
    margin-bottom: 0;
  }
}
</style>
