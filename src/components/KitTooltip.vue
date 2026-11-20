<script setup lang="ts">
// A short note on the one control in the default slot, shown while the control is hovered or
// focused, and gone on Escape or once the pointer leaves the control and the note. It adds to the
// control's name and never stands in for it: an icon-only control is named by its own label
// (KitIconButton's). Every tooltip needs Reka's TooltipProvider, which the app mounts once at
// its root; without it, the tooltip breaks the whole subtree it sits in.
//
// The note is drawn beside its control, not at the end of the page: there it would sit outside
// every landmark, which axe refuses while it is open. Reka floats it over the page all the same,
// and puts its class on an element of its own inside, which scoped styles don't reach, so its
// styles are in an unscoped block.
import { TooltipArrow, TooltipContent, TooltipRoot, TooltipTrigger } from 'reka-ui'

withDefaults(
  defineProps<{
    /** The note: "Copies the link to this shelf". */
    text: string
    side?: 'top' | 'right' | 'bottom' | 'left'
  }>(),
  { side: 'top' },
)

defineSlots<{
  /** The one control the note belongs to. */
  default: () => unknown
}>()
</script>

<template>
  <TooltipRoot>
    <TooltipTrigger as-child><slot /></TooltipTrigger>
    <TooltipContent class="kit-tooltip" :side="side" :side-offset="6" :collision-padding="8">
      {{ text }}
      <TooltipArrow class="kit-tooltip__arrow" :width="12" :height="6" />
    </TooltipContent>
  </TooltipRoot>
</template>

<style>
@layer kit {
  /* The note is drawn in the page's colors turned round: the surface's on the text's. */
  .kit-tooltip {
    box-sizing: border-box;
    z-index: var(--kit-layer-popup);
    max-width: min(calc(100vw - 2 * var(--kit-space-md)), var(--kit-width-tooltip));
    padding: var(--kit-space-2xs) var(--kit-space-xs);
    border-radius: var(--kit-radius-sm);
    background: var(--kit-text);
    color: var(--kit-surface);
    font-family: var(--kit-font-body);
    font-size: var(--kit-text-size-sm);
    line-height: var(--kit-line-height-prose);
    box-shadow: var(--kit-shadow-overlay);
  }

  .kit-tooltip__arrow {
    fill: var(--kit-text);
  }
}
</style>
