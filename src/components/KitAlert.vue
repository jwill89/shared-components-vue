<script setup lang="ts">
// A condition to know of or act on, sat flat in the page where it applies and staying until it
// is resolved: a permission the bot lacks, a question to answer, a job that failed. It never
// looks like a toast, which floats: an alert has no border, no edge and no shadow, only a wash
// of its tone and its icon. Its words stay in the text color; the tone shows in the wash and
// in the icon, whose shape differs by tone (the app's own from the `icon` slot, or the kit's
// drawn one). The buttons that resolve it go in `actions`.
//
// An alert that can appear while the page is open is `live`, so a screen reader says it at
// once, an error assertively; one already there when the page opens is read in its place.
import KitToneIcon from './KitToneIcon.vue'
import { filled } from './slots'

export type KitAlertTone = 'info' | 'success' | 'warning' | 'error'

withDefaults(
  defineProps<{
    tone?: KitAlertTone
    /** The condition in a few words, read before the rest. */
    title?: string
    /** Whether it can appear while the page is open, and is said when it does. */
    live?: boolean
  }>(),
  { tone: 'info', title: undefined, live: false },
)

defineSlots<{
  default?: () => unknown
  icon?: () => unknown
  actions?: () => unknown
}>()
</script>

<template>
  <div
    class="kit-alert"
    :class="`kit-alert--${tone}`"
    :role="live ? (tone === 'error' ? 'alert' : 'status') : undefined"
  >
    <span class="kit-alert__icon" aria-hidden="true">
      <slot name="icon"><KitToneIcon :tone="tone" /></slot>
    </span>
    <div class="kit-alert__body">
      <p v-if="title" class="kit-alert__title">{{ title }}</p>
      <div v-if="filled($slots.default)" class="kit-alert__text"><slot /></div>
      <div v-if="filled($slots.actions)" class="kit-alert__actions"><slot name="actions" /></div>
    </div>
  </div>
</template>

<style scoped>
/*
 * The wash is 7% of the tone over the raised surface. contrast.ts (ALERT_TINT) holds the same
 * number, and contrast.spec.ts measures the words, muted words, links, icon and a button's
 * border on it.
 */
@layer kit {
  .kit-alert {
    --kit-alert-tone: var(--kit-info);

    box-sizing: border-box;
    display: flex;
    gap: var(--kit-space-sm);
    min-width: 0;
    padding: var(--kit-space-sm) var(--kit-space-md);
    border-radius: var(--kit-radius-md);
    background: color-mix(in srgb, var(--kit-surface-raised) 93%, var(--kit-alert-tone));
    color: var(--kit-text);
  }

  .kit-alert--success {
    --kit-alert-tone: var(--kit-success);
  }

  .kit-alert--warning {
    --kit-alert-tone: var(--kit-warning);
  }

  .kit-alert--error {
    --kit-alert-tone: var(--kit-danger);
  }

  .kit-alert__icon {
    display: inline-flex;
    flex: none;
    padding-block-start: 0.2em;
    color: var(--kit-alert-tone);
  }

  .kit-alert__body {
    display: flex;
    flex-direction: column;
    gap: var(--kit-space-xs);
    min-width: 0;
  }

  .kit-alert__title,
  .kit-alert__text {
    max-width: var(--kit-measure-prose);
    margin: 0;
    overflow-wrap: anywhere;
  }

  .kit-alert__title {
    font-weight: var(--kit-font-weight-strong);
  }

  .kit-alert__text :deep(p) {
    margin: 0;
  }

  .kit-alert__actions {
    display: flex;
    flex-wrap: wrap;
    gap: var(--kit-space-xs);
  }
}
</style>
