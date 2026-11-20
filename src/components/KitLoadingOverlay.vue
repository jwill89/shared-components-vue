<script setup lang="ts">
// A region's content, covered while something it started is under way and must finish before the
// region is used again: a save, say. While `active`, the content can't be reached or pressed
// (inert) and is marked busy, and lies under the scrim with a panel that says, as a status a
// screen reader reads, what is under way. To cover a whole page, wrap the page's content in it.
//
// Focus that was in the content when the cover came down waits on the panel, since an inert
// element can't hold it, and goes back to where it was when the cover lifts.
import { nextTick, useTemplateRef, watch } from 'vue'
import KitSpinner from './KitSpinner.vue'

const props = defineProps<{
  /** Whether the content is covered. */
  active: boolean
  /** What is under way, as a sentence: "Saving your reading…". */
  label: string
}>()

defineSlots<{
  /** The content the cover lies over. */
  default: () => unknown
}>()

const content = useTemplateRef<HTMLElement>('content')
const panel = useTemplateRef<HTMLElement>('panel')
let waiting: HTMLElement | null = null

watch(
  () => props.active,
  async (active) => {
    if (active) {
      const focused = document.activeElement
      waiting = focused instanceof HTMLElement && content.value?.contains(focused) ? focused : null
      await nextTick()
      if (waiting) {
        panel.value?.focus()
      }
      return
    }
    const back = waiting
    waiting = null
    await nextTick()
    // Only while focus still waits, fallen to the page with the panel: focus a person moved on
    // meanwhile (into a dialog, say) is left where it is.
    if (back?.isConnected && document.activeElement === document.body) {
      back.focus()
    }
  },
)
</script>

<template>
  <div class="kit-loading-overlay">
    <div
      ref="content"
      class="kit-loading-overlay__content"
      :inert="active || undefined"
      :aria-busy="active || undefined"
    >
      <slot />
    </div>
    <div v-if="active" class="kit-loading-overlay__cover">
      <div ref="panel" class="kit-loading-overlay__panel" tabindex="-1">
        <KitSpinner :label="label" />
      </div>
    </div>
  </div>
</template>

<style scoped>
@layer kit {
  .kit-loading-overlay {
    position: relative;
  }

  /* Over the page's own content, which may set layers of its own, and under a dialog or a toast
     raised meanwhile. */
  .kit-loading-overlay__cover {
    box-sizing: border-box;
    position: absolute;
    inset: 0;
    z-index: var(--kit-layer-cover);
    display: grid;
    place-items: center;
    padding: var(--kit-space-md);
    background: var(--kit-scrim);
  }

  /* Held in view while a long region scrolls under it. */
  .kit-loading-overlay__panel {
    box-sizing: border-box;
    position: sticky;
    top: var(--kit-space-xl);
    bottom: var(--kit-space-xl);
    max-width: 100%;
    padding: var(--kit-space-md) var(--kit-space-lg);
    border-radius: var(--kit-radius-md);
    background: var(--kit-surface-raised);
    color: var(--kit-text);
    box-shadow: var(--kit-shadow-overlay);
  }

  /* The panel takes focus only to hold it for the content; the ring belongs on controls. */
  .kit-loading-overlay__panel:focus {
    outline: none;
  }
}
</style>
