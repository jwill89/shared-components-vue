<script setup lang="ts">
// One choice in a KitMenuRadioGroup: its words in the default slot, and a check before them while
// it is the one chosen, the `check` slot's or the kit's own. The check holds its place when it
// isn't shown, so the choices' words line up.
import { DropdownMenuItemIndicator, DropdownMenuRadioItem } from 'reka-ui'
import KitGlyph from './KitGlyph.vue'

defineProps<{
  value: string
  disabled?: boolean
}>()

defineSlots<{
  default?: () => unknown
  check?: () => unknown
}>()
</script>

<template>
  <DropdownMenuRadioItem :value="value" :disabled="disabled" class="kit-option-list__item">
    <DropdownMenuItemIndicator class="kit-option-list__check">
      <slot name="check"><KitGlyph name="check" /></slot>
    </DropdownMenuItemIndicator>
    <slot />
  </DropdownMenuRadioItem>
</template>
