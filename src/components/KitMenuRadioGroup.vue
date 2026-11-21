<script setup lang="ts">
// A choice of one inside a KitMenu, such as a theme: KitMenuRadioItems in the default slot, the
// chosen one checked. Its model is the chosen item's value; choosing one closes the menu. It is
// named by `label`, or by the KitMenuLabel above it.
import { DropdownMenuRadioGroup } from 'reka-ui'

defineProps<{
  /** What the choice is, as a screen reader names it: "Theme". */
  label: string
}>()

const model = defineModel<string>({ required: true })

defineSlots<{
  default?: () => unknown
}>()
</script>

<template>
  <DropdownMenuRadioGroup v-model="model" :aria-label="label">
    <slot />
  </DropdownMenuRadioGroup>
</template>
