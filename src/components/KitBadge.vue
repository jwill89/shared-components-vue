<script setup lang="ts">
// A short word on a thing's state or kind, beside what it marks: "Overdue", "Practice", "Owner".
// Its words carry what it means, and its tone only adds to them, so a badge never rests on its
// color: `<KitBadge tone="success">Active</KitBadge>`. An icon from the app's own set, in the
// `icon` slot, stands before the words, hidden from screen readers, since the words say it.
//
// A badge is read where it stands, as part of the text around it, and says nothing as it
// changes; a change someone must hear is a toast or an alert. A tone is one an alert takes, and
// washed as an alert's is, so the badge's words and icon hold the pairs contrast.ts measures for
// the alerts, and its edge is drawn in the tone itself, which holds 7:1 on every surface.
import { filled } from './slots'

/** A badge's tone: no tone at all, or one of an alert's. */
export type KitBadgeTone = 'neutral' | 'success' | 'error' | 'warning' | 'info'

withDefaults(
  defineProps<{
    tone?: KitBadgeTone
  }>(),
  { tone: 'neutral' },
)

defineSlots<{
  /** Its words. */
  default?: () => unknown
  icon?: () => unknown
}>()
</script>

<template>
  <span class="kit-badge" :class="`kit-badge--${tone}`">
    <span v-if="filled($slots.icon)" class="kit-badge__icon" aria-hidden="true">
      <slot name="icon" />
    </span>
    <slot />
  </span>
</template>

<style scoped>
@layer kit {
  .kit-badge {
    --kit-badge-tone: var(--kit-control-border);

    box-sizing: border-box;
    display: inline-flex;
    align-items: center;
    gap: var(--kit-space-2xs);
    max-width: 100%;
    padding: 0 var(--kit-space-xs);
    border: var(--kit-control-border-width) solid var(--kit-badge-tone);
    border-radius: var(--kit-radius-full);
    background: color-mix(in srgb, var(--kit-surface-raised) 94%, var(--kit-badge-tone));
    color: var(--kit-text);
    font-size: var(--kit-text-size-sm);
    font-weight: var(--kit-font-weight-strong);
    line-height: var(--kit-line-height-prose);
    overflow-wrap: anywhere;
    vertical-align: middle;
  }

  /* No tone: the sunken surface and a control's edge, both of which hold their pairs as they
     stand. */
  .kit-badge--neutral {
    background: var(--kit-surface-sunken);
  }

  .kit-badge--success {
    --kit-badge-tone: var(--kit-success);
  }

  .kit-badge--error {
    --kit-badge-tone: var(--kit-danger);
  }

  .kit-badge--warning {
    --kit-badge-tone: var(--kit-warning);
  }

  .kit-badge--info {
    --kit-badge-tone: var(--kit-info);
  }

  .kit-badge__icon {
    display: inline-flex;
    flex: none;
    color: var(--kit-badge-tone);
  }

  .kit-badge--neutral .kit-badge__icon {
    color: var(--kit-text-muted);
  }
}
</style>
