<script setup lang="ts">
// The one button. Its words are the default slot, and a leading icon the `icon` slot, drawn
// by the app's own icon set and hidden from screen readers, since the words name the action.
// While `loading` it shows a spinner in the icon's place, says it is busy, and can't be pressed
// again. Given `href`, it is a link that looks like the button, for an action that opens
// another page, such as signing in with another site; a link is never disabled or loading.
//
// A button that shows only an icon is KitIconButton, which gives this one the
// `kit-button--icon-only` modifier.
import KitSpinner from './KitSpinner.vue'

export type KitButtonVariant = 'primary' | 'secondary' | 'danger' | 'quiet'

withDefaults(
  defineProps<{
    /** How much the action stands out: the page's main action is `primary`, an irreversible one `danger`, a minor one `quiet`. */
    variant?: KitButtonVariant
    /** The native button type; `submit` sends its form. */
    type?: 'button' | 'submit' | 'reset'
    /** Whether its action is running: it shows a spinner and can't be pressed again. */
    loading?: boolean
    disabled?: boolean
    /** Where it leads, which makes it a link rather than a button. */
    href?: string
  }>(),
  { variant: 'secondary', type: 'button', loading: false, disabled: false, href: undefined },
)

defineSlots<{
  default?: () => unknown
  icon?: () => unknown
}>()
</script>

<template>
  <a v-if="href" class="kit-button" :class="`kit-button--${variant}`" :href="href">
    <span v-if="$slots.icon" class="kit-button__icon" aria-hidden="true">
      <slot name="icon" />
    </span>
    <slot />
  </a>
  <button
    v-else
    :type="type"
    class="kit-button"
    :class="`kit-button--${variant}`"
    :disabled="disabled || loading"
    :aria-busy="loading || undefined"
  >
    <KitSpinner v-if="loading" />
    <span v-else-if="$slots.icon" class="kit-button__icon" aria-hidden="true">
      <slot name="icon" />
    </span>
    <slot />
  </button>
</template>

<style scoped>
/*
 * Each variant sets the fill, ink and edge the rules below draw with. A hover moves the fill
 * 15% toward the page's text color, which takes it away from the button's own words in either
 * scheme; a quiet button takes a 6% wash of the accent and an underline. contrast.ts
 * (BUTTON_HOVER) holds the same numbers and contrast.spec.ts measures every hover at 7:1, so
 * the two change together.
 */
@layer kit {
  .kit-button {
    --kit-button-fill: var(--kit-surface-raised);
    --kit-button-ink: var(--kit-text);
    --kit-button-edge: var(--kit-control-border);

    box-sizing: border-box;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: var(--kit-space-xs);
    min-width: var(--kit-control-height);
    min-height: var(--kit-control-height);
    padding: var(--kit-space-xs) var(--kit-space-md);
    border: var(--kit-control-border-width) solid var(--kit-button-edge);
    border-radius: var(--kit-radius-md);
    background: var(--kit-button-fill);
    color: var(--kit-button-ink);
    font: inherit;
    font-weight: var(--kit-font-weight-strong);
    line-height: var(--kit-line-height-heading);
    text-align: center;
    text-decoration: none;
    cursor: pointer;
    transition: background-color var(--kit-duration-quick) ease;
  }

  .kit-button:focus-visible {
    outline: var(--kit-focus-ring-width) solid var(--kit-focus-ring);
    outline-offset: var(--kit-focus-ring-offset);
  }

  .kit-button:disabled {
    cursor: not-allowed;
    opacity: 0.6;
  }

  .kit-button[aria-busy='true'] {
    cursor: progress;
  }

  .kit-button:hover:not(:disabled) {
    background: color-mix(in srgb, var(--kit-button-fill) 85%, var(--kit-text));
  }

  .kit-button--primary {
    --kit-button-fill: var(--kit-accent);
    --kit-button-ink: var(--kit-on-accent);
    --kit-button-edge: var(--kit-accent);
  }

  .kit-button--danger {
    --kit-button-fill: var(--kit-danger);
    --kit-button-ink: var(--kit-on-danger);
    --kit-button-edge: var(--kit-danger);
  }

  .kit-button--quiet {
    --kit-button-fill: transparent;
    --kit-button-ink: var(--kit-accent);
    --kit-button-edge: transparent;
  }

  .kit-button--quiet:hover:not(:disabled) {
    background: color-mix(in srgb, var(--kit-accent) 6%, transparent);
    text-decoration: underline;
  }

  .kit-button--icon-only {
    padding: 0;
  }

  .kit-button__icon {
    display: inline-flex;
  }

  @media (prefers-reduced-motion: reduce) {
    .kit-button {
      transition: none;
    }
  }
}
</style>
