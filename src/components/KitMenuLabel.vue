<script setup lang="ts">
// A caption over a part of a KitMenu, such as the choices of a KitMenuRadioGroup below it.
import { DropdownMenuLabel } from 'reka-ui'

defineSlots<{
  default?: () => unknown
}>()
</script>

<template>
  <DropdownMenuLabel class="kit-option-list__group-label"><slot /></DropdownMenuLabel>
</template>
