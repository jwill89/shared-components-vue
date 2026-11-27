<script setup lang="ts">
// A button that shows only an icon, drawn by the app's own icon set. It can't be made without
// `label`, which names it to a screen reader and shows as the browser's own tooltip, so no one
// has to guess what it does. While `loading` the spinner takes the icon's place. Given `pressed`,
// it is a toggle, as KitButton is: its label stays the same, and its icon is given `pressed`.
import KitButton from './KitButton.vue'
import type { KitButtonSize, KitButtonVariant } from './KitButton.vue'

withDefaults(
  defineProps<{
    /** What the button does, in words: "Remove #general". */
    label: string
    variant?: KitButtonVariant
    /** How large it is drawn; a small one is still pressed over 44 px. */
    size?: KitButtonSize
    type?: 'button' | 'submit' | 'reset'
    loading?: boolean
    disabled?: boolean
    /** Whether a toggle is on; a button that is no toggle leaves it out. */
    pressed?: boolean
  }>(),
  {
    variant: 'quiet',
    size: 'default',
    type: 'button',
    loading: false,
    disabled: false,
    pressed: undefined,
  },
)

defineSlots<{
  /** The icon, given whether a toggle is on. */
  default?: (props: { pressed: boolean }) => unknown
}>()
</script>

<template>
  <KitButton
    class="kit-button--icon-only"
    :variant="variant"
    :size="size"
    :type="type"
    :loading="loading"
    :disabled="disabled"
    :pressed="pressed"
    :aria-label="label"
    :title="label"
  >
    <template #icon="{ pressed: on }"><slot :pressed="on" /></template>
  </KitButton>
</template>
