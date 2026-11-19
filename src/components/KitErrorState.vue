<script setup lang="ts">
// What a list or page shows when its data failed to load: "Couldn't load …", the server's own
// words on why when it gave any, as they arrived, and a Try again button. Never KitEmptyState,
// which would say there is nothing when nobody knows. It is an alert, read out as it appears,
// washed in the danger tone like KitAlert's error and flat in the page like it.
import KitButton from './KitButton.vue'
import KitToneIcon from './KitToneIcon.vue'

withDefaults(
  defineProps<{
    /** What failed: "Couldn't load the shelves". */
    title: string
    /** The server's own words on why, as they arrived. */
    message?: string
    /** Whether the retry is running. */
    retrying?: boolean
    retryLabel?: string
  }>(),
  { message: undefined, retrying: false, retryLabel: 'Try again' },
)

const emit = defineEmits<{
  /** The person asked to load it again. */
  retry: []
}>()

defineSlots<{
  icon?: () => unknown
}>()
</script>

<template>
  <div class="kit-error-state" role="alert">
    <span class="kit-error-state__icon" aria-hidden="true">
      <slot name="icon"><KitToneIcon tone="error" /></slot>
    </span>
    <p class="kit-error-state__title">{{ title }}</p>
    <p v-if="message" class="kit-error-state__message">{{ message }}</p>
    <KitButton :loading="retrying" @click="emit('retry')">{{ retryLabel }}</KitButton>
  </div>
</template>

<style scoped>
@layer kit {
  .kit-error-state {
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--kit-space-xs);
    padding: var(--kit-space-xl) var(--kit-space-md);
    border-radius: var(--kit-radius-md);
    background: color-mix(in srgb, var(--kit-surface-raised) 93%, var(--kit-danger));
    color: var(--kit-text);
    text-align: center;
  }

  .kit-error-state__icon {
    display: inline-flex;
    color: var(--kit-danger);
    font-size: var(--kit-text-size-xl);
  }

  .kit-error-state__title {
    margin: 0;
    font-size: var(--kit-text-size-lg);
    font-weight: var(--kit-font-weight-strong);
  }

  .kit-error-state__message {
    max-width: var(--kit-measure-prose);
    margin: 0 0 var(--kit-space-xs);
    overflow-wrap: anywhere;
  }
}
</style>
