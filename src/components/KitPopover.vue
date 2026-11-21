<script setup lang="ts">
// A small panel opened by the control in the `trigger` slot, for a note or a few controls that
// belong to it. It opens on a press, so it works on a phone where a tooltip can't, and may hold
// links and buttons. Open, it takes focus, and Escape or a press outside closes it and gives focus
// back to its control. A screen reader names it by its control's words as it opens, as Reka names
// it, so those words say what it holds ("Who can see this shelf?"). Open state is its own, or the
// page's through `v-model:open`. Where its trigger is a form field's control, a color swatch say,
// `id` gives the trigger the field's id, so the field's label names it.
//
// Like KitTooltip, it is drawn beside its control rather than at the end of the page, inside the
// page's landmarks, and Reka floats it over the page; its class lands on an element of Reka's own,
// so its styles are in an unscoped block.
import { PopoverArrow, PopoverContent, PopoverRoot, PopoverTrigger } from 'reka-ui'
import PopoverTriggerId from './popoverTrigger'

withDefaults(
  defineProps<{
    /** The trigger's id, where it is a form field's control: from KitFormField. */
    id?: string
    side?: 'top' | 'right' | 'bottom' | 'left'
    align?: 'start' | 'center' | 'end'
  }>(),
  { id: undefined, side: 'bottom', align: 'center' },
)

const open = defineModel<boolean>('open', { default: false })

defineSlots<{
  /** The one control that opens it, whose words name it. */
  trigger: () => unknown
  /** What it holds. */
  default?: () => unknown
}>()
</script>

<template>
  <PopoverRoot v-model:open="open">
    <PopoverTriggerId :id="id">
      <PopoverTrigger as-child><slot name="trigger" /></PopoverTrigger>
    </PopoverTriggerId>
    <PopoverContent
      class="kit-popover"
      :side="side"
      :align="align"
      :side-offset="6"
      :collision-padding="8"
    >
      <div class="kit-popover__body"><slot /></div>
      <PopoverArrow class="kit-popover__arrow" :width="12" :height="6" />
    </PopoverContent>
  </PopoverRoot>
</template>

<style>
@layer kit {
  .kit-popover {
    box-sizing: border-box;
    z-index: var(--kit-layer-popup);
    max-width: min(calc(100vw - 2 * var(--kit-space-md)), var(--kit-width-popover));
    padding: var(--kit-space-sm) var(--kit-space-md);
    border: var(--kit-control-border-width) solid var(--kit-control-border);
    border-radius: var(--kit-radius-md);
    background: var(--kit-surface-raised);
    color: var(--kit-text);

    /* The body's own text, whatever the control it opens from sits in (a heading, say), so a
       field inside draws at the size every other field does. */
    font-family: var(--kit-font-body);
    font-size: var(--kit-text-size-base);
    font-weight: normal;
    line-height: var(--kit-line-height-prose);
    box-shadow: var(--kit-shadow-overlay);
  }

  /* Reka focuses the panel itself when it holds nothing to focus; the ring belongs on controls. */
  .kit-popover:focus {
    outline: none;
  }

  /* What the page puts in sets its own spacing inside, but none past the panel's padding. */
  .kit-popover__body > :first-child {
    margin-top: 0;
  }

  .kit-popover__body > :last-child {
    margin-bottom: 0;
  }

  .kit-popover__arrow {
    fill: var(--kit-surface-raised);
    stroke: var(--kit-control-border);
  }
}
</style>
