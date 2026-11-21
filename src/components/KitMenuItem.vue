<script setup lang="ts">
// One action in a KitMenu: its words in the default slot, an icon from the `icon` slot before
// them, hidden from screen readers since the words name it. `danger` draws an action that can't
// be undone in the danger color. Choosing it emits `select` and closes the menu.
import { DropdownMenuItem } from 'reka-ui'
import { filled } from './slots'

withDefaults(
  defineProps<{
    /** Whether the action can't be undone, which its color says too. */
    danger?: boolean
    disabled?: boolean
  }>(),
  { danger: false, disabled: false },
)

const emit = defineEmits<{
  select: []
}>()

defineSlots<{
  default?: () => unknown
  icon?: () => unknown
}>()
</script>

<template>
  <DropdownMenuItem
    class="kit-option-list__item"
    :class="{ 'kit-option-list__item--danger': danger }"
    :disabled="disabled"
    @select="emit('select')"
  >
    <span v-if="filled($slots.icon)" class="kit-option-list__icon" aria-hidden="true">
      <slot name="icon" />
    </span>
    <slot />
  </DropdownMenuItem>
</template>
