<script setup lang="ts">
// A button that shows only an icon, drawn by the app's own icon set. It can't be made without
// `label`, which names it to a screen reader and shows as the browser's own tooltip, so no one
// has to guess what it does. While `loading` the spinner takes the icon's place.
import KitButton from './KitButton.vue'
import type { KitButtonVariant } from './KitButton.vue'

withDefaults(
  defineProps<{
    /** What the button does, in words: "Remove #general". */
    label: string
    variant?: KitButtonVariant
    type?: 'button' | 'submit' | 'reset'
    loading?: boolean
    disabled?: boolean
  }>(),
  { variant: 'quiet', type: 'button', loading: false, disabled: false },
)

defineSlots<{
  /** The icon. */
  default?: () => unknown
}>()
</script>

<template>
  <KitButton
    class="kit-button--icon-only"
    :variant="variant"
    :type="type"
    :loading="loading"
    :disabled="disabled"
    :aria-label="label"
    :title="label"
  >
    <template #icon><slot /></template>
  </KitButton>
</template>
