<script setup lang="ts">
// One action in a KitMenu: its words in the default slot, an icon from the `icon` slot before
// them, hidden from screen readers since the words name it. `danger` draws an action that can't
// be undone in the danger color. Choosing it emits `select` and closes the menu.
//
// Given `to`, a page of the app's own (through RouterLink where the app has Vue Router), or
// `href`, it is a link: chosen, it goes there, and it opens in a new tab as any link does, which
// an item that calls the router when chosen can't.
import { DropdownMenuItem } from 'reka-ui'
import { appRouterLink, linkBinding } from './links'
import type { KitLinkTarget } from './links'
import { filled } from './slots'

const props = withDefaults(
  defineProps<{
    /** Whether the action can't be undone, which its color says too. */
    danger?: boolean
    disabled?: boolean
    /** A page of the app's own it leads to, a RouterLink's `to`, which makes it a link. */
    to?: KitLinkTarget
    /** Where it leads, which makes it a link. */
    href?: string
  }>(),
  { danger: false, disabled: false, to: undefined, href: undefined },
)

const emit = defineEmits<{
  select: []
}>()

const routerLink = appRouterLink()

/** What the item's link binds, where it is one. */
function link(): Record<string, unknown> {
  return props.to === undefined ? { href: props.href } : linkBinding(routerLink, props.to)
}

defineSlots<{
  default?: () => unknown
  icon?: () => unknown
}>()
</script>

<template>
  <DropdownMenuItem
    v-if="to !== undefined || href"
    as-child
    class="kit-option-list__item"
    :class="{ 'kit-option-list__item--danger': danger }"
    :disabled="disabled"
    @select="emit('select')"
  >
    <component :is="to === undefined ? 'a' : (routerLink ?? 'a')" v-bind="link()">
      <span v-if="filled($slots.icon)" class="kit-option-list__icon" aria-hidden="true">
        <slot name="icon" />
      </span>
      <slot />
    </component>
  </DropdownMenuItem>
  <DropdownMenuItem
    v-else
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
