<script setup lang="ts">
// A list of actions behind one button, for those a row has no room for: KitMenuItems in the
// default slot, with KitMenuLabel, KitMenuSeparator and a KitMenuRadioGroup for a choice among
// them. The button is an icon button named by `label`, its icon the `trigger-icon` slot's or the
// kit's three dots, or the `trigger` slot's own control. Open, the arrow keys move through the
// items, typing jumps to one, Enter or a press runs it, and Escape closes it and gives focus back
// to the button. It reads like an open select's list, from the same global styles.
import {
  DropdownMenuContent,
  DropdownMenuPortal,
  DropdownMenuRoot,
  DropdownMenuTrigger,
} from 'reka-ui'
import KitGlyph from './KitGlyph.vue'
import KitIconButton from './KitIconButton.vue'

withDefaults(
  defineProps<{
    /** What the button opens, which names it and the menu: "More actions". */
    label?: string
    align?: 'start' | 'center' | 'end'
  }>(),
  { label: 'More actions', align: 'end' },
)

const open = defineModel<boolean>('open', { default: false })

defineSlots<{
  /** The items. */
  default?: () => unknown
  /** A control of the page's own in place of the kit's button. */
  trigger?: () => unknown
  'trigger-icon'?: () => unknown
}>()
</script>

<template>
  <DropdownMenuRoot v-model:open="open">
    <DropdownMenuTrigger as-child>
      <slot name="trigger">
        <KitIconButton :label="label" variant="plain">
          <slot name="trigger-icon"><KitGlyph name="more" /></slot>
        </KitIconButton>
      </slot>
    </DropdownMenuTrigger>
    <DropdownMenuPortal>
      <DropdownMenuContent
        class="kit-option-list kit-menu"
        :aria-label="label"
        :align="align"
        :side-offset="4"
        :collision-padding="8"
      >
        <div class="kit-option-list__viewport">
          <slot />
        </div>
      </DropdownMenuContent>
    </DropdownMenuPortal>
  </DropdownMenuRoot>
</template>

<style>
@layer kit {
  /* A menu is as wide as its longest item, within the option list's own limit. */
  .kit-menu {
    min-width: var(--kit-width-menu);
  }
}
</style>
