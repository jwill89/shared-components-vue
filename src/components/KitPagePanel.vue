<script setup lang="ts">
// The one panel a page's content sits in: a raised surface with an optional heading (a
// section named by it), a line under the heading, buttons at the heading's end, and a footer
// set apart by a rule. Panels sit under the page's h1, so their headings are h2 unless one
// nests in another, which takes `level` 3.
import { useId } from 'vue'
import { filled } from './slots'

withDefaults(
  defineProps<{
    title?: string
    description?: string
    /** The heading's level: 2, or 3 for a panel inside a panel. */
    level?: 2 | 3
  }>(),
  { title: undefined, description: undefined, level: 2 },
)

defineSlots<{
  default?: () => unknown
  /** Buttons at the heading's end. */
  actions?: () => unknown
  footer?: () => unknown
}>()

const headingId = useId()
</script>

<template>
  <section class="kit-page-panel" :aria-labelledby="title ? headingId : undefined">
    <header v-if="title || filled($slots.actions)" class="kit-page-panel__header">
      <div class="kit-page-panel__words">
        <component
          :is="`h${String(level)}`"
          v-if="title"
          :id="headingId"
          class="kit-page-panel__title"
        >
          {{ title }}
        </component>
        <p v-if="description" class="kit-page-panel__description">{{ description }}</p>
      </div>
      <div v-if="filled($slots.actions)" class="kit-page-panel__actions">
        <slot name="actions" />
      </div>
    </header>
    <div v-if="filled($slots.default)" class="kit-page-panel__body"><slot /></div>
    <footer v-if="filled($slots.footer)" class="kit-page-panel__footer">
      <slot name="footer" />
    </footer>
  </section>
</template>

<style scoped>
@layer kit {
  .kit-page-panel {
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    gap: var(--kit-space-md);
    min-width: 0;
    padding: var(--kit-space-lg);
    border: var(--kit-control-border-width) solid var(--kit-hairline);
    border-radius: var(--kit-radius-md);
    background: var(--kit-surface-raised);
    color: var(--kit-text);
  }

  .kit-page-panel__header {
    display: flex;
    flex-wrap: wrap;
    align-items: flex-start;
    justify-content: space-between;
    gap: var(--kit-space-sm);
  }

  .kit-page-panel__words {
    min-width: 0;
  }

  .kit-page-panel__title {
    margin: 0;
    font-family: var(--kit-font-heading);
    font-size: var(--kit-text-size-lg);
    line-height: var(--kit-line-height-heading);
  }

  .kit-page-panel__description {
    max-width: var(--kit-measure-prose);
    margin: var(--kit-space-2xs) 0 0;
    color: var(--kit-text-muted);
  }

  .kit-page-panel__actions,
  .kit-page-panel__footer {
    display: flex;
    flex-wrap: wrap;
    gap: var(--kit-space-xs);
  }

  .kit-page-panel__body {
    min-width: 0;
  }

  .kit-page-panel__footer {
    justify-content: flex-end;
    padding-block-start: var(--kit-space-md);
    border-block-start: var(--kit-control-border-width) solid var(--kit-hairline);
  }

  /* On a phone the panel gives its padding back to the content. */
  @media (width < 40rem) {
    .kit-page-panel {
      padding: var(--kit-space-md);
    }
  }
}
</style>
