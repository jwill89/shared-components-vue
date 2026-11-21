<script setup lang="ts">
// A panel the full height of the screen, against one side of it, for what belongs beside the page
// rather than in its way: a record's history, a list's filters, the navigation on a phone. It is a
// modal, as KitDialog is: it holds focus, locks the page behind it, closes on Escape, a press
// outside or its Close button, and gives focus back to what opened it. It stands at the `side`
// it is given, the end of the line by default (the right, in a left-to-right page). Its title and
// Close sit at the top and its `footer` at the bottom, staying in view while the body between them
// scrolls. Open it with `v-model:open`, or put the button that opens it in the `trigger` slot.
import { computed } from 'vue'
import {
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogOverlay,
  DialogPortal,
  DialogRoot,
  DialogTitle,
  DialogTrigger,
} from 'reka-ui'
import KitAnnouncer from './KitAnnouncer.vue'
import KitGlyph from './KitGlyph.vue'
import KitIconButton from './KitIconButton.vue'
import { filled } from './slots'

const props = withDefaults(
  defineProps<{
    title: string
    /** A line under the title on what the panel is for. */
    description?: string
    /** The side it stands against: the line's start, or its end. */
    side?: 'start' | 'end'
    closeLabel?: string
  }>(),
  { description: undefined, side: 'end', closeLabel: 'Close' },
)

const open = defineModel<boolean>('open', { default: false })

defineSlots<{
  /** The body. */
  default?: () => unknown
  /** The buttons at its foot. */
  footer?: () => unknown
  trigger?: () => unknown
  /** The Close button's icon, a drawn cross by default. */
  'close-icon'?: () => unknown
}>()

const sideClass = computed(() => `kit-drawer--${props.side}`)
</script>

<template>
  <DialogRoot v-model:open="open">
    <DialogTrigger v-if="$slots.trigger" as-child>
      <slot name="trigger" />
    </DialogTrigger>
    <DialogPortal>
      <DialogOverlay class="kit-drawer__overlay" />
      <DialogContent
        class="kit-drawer"
        :class="sideClass"
        aria-modal="true"
        v-bind="description ? {} : { 'aria-describedby': undefined }"
      >
        <header class="kit-drawer__header">
          <DialogTitle class="kit-drawer__title">{{ title }}</DialogTitle>
          <DialogClose as-child>
            <KitIconButton class="kit-drawer__close" :label="closeLabel" variant="plain">
              <slot name="close-icon"><KitGlyph name="cross" /></slot>
            </KitIconButton>
          </DialogClose>
        </header>
        <DialogDescription v-if="description" class="kit-drawer__description">
          {{ description }}
        </DialogDescription>
        <div v-if="filled($slots.default)" class="kit-drawer__body"><slot /></div>
        <footer v-if="filled($slots.footer)" class="kit-drawer__footer">
          <slot name="footer" />
        </footer>
        <!-- While it is open, a toast is read out from here: some screen readers hear no live
             region outside an aria-modal dialog. -->
        <KitAnnouncer />
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>

<style scoped>
@layer kit {
  .kit-drawer__overlay {
    position: fixed;
    inset: 0;
    z-index: var(--kit-layer-dialog);
    background: var(--kit-scrim);
  }

  .kit-drawer {
    box-sizing: border-box;
    position: fixed;
    inset-block: 0;
    z-index: var(--kit-layer-dialog);
    display: flex;
    flex-direction: column;
    gap: var(--kit-space-md);
    width: min(calc(100% - var(--kit-space-xl)), var(--kit-width-drawer));
    padding: var(--kit-space-lg);
    background: var(--kit-surface-raised);
    color: var(--kit-text);
    box-shadow: var(--kit-shadow-overlay);
  }

  .kit-drawer--end {
    inset-inline-end: 0;
    border-inline-start: var(--kit-control-border-width) solid var(--kit-control-border);
  }

  .kit-drawer--start {
    inset-inline-start: 0;
    border-inline-end: var(--kit-control-border-width) solid var(--kit-control-border);
  }

  .kit-drawer:focus {
    outline: none;
  }

  .kit-drawer__header {
    display: flex;
    flex: none;
    align-items: flex-start;
    justify-content: space-between;
    gap: var(--kit-space-sm);
  }

  .kit-drawer__title {
    margin: 0;
    font-family: var(--kit-font-heading);
    font-size: var(--kit-text-size-lg);
    line-height: var(--kit-line-height-heading);
  }

  /* The Close button sits in the corner, its touch target reaching into the padding. */
  .kit-drawer__close {
    flex: none;
    margin: calc(-1 * var(--kit-space-sm)) calc(-1 * var(--kit-space-sm)) 0 0;
  }

  .kit-drawer__description {
    flex: none;
    margin: 0;
  }

  /* The body scrolls between the header and the footer, which stay in view. */
  .kit-drawer__body {
    flex: 1;
    min-height: 0;
    margin: calc(-1 * var(--kit-focus-ring-width) - var(--kit-focus-ring-offset));
    padding: calc(var(--kit-focus-ring-width) + var(--kit-focus-ring-offset));
    overflow-y: auto;
  }

  .kit-drawer__footer {
    display: flex;
    flex: none;
    flex-wrap: wrap;
    justify-content: flex-end;
    gap: var(--kit-space-xs);
  }
}
</style>
