<script setup lang="ts">
// The one button. Its words are the default slot, and a leading icon the `icon` slot, drawn
// by the app's own icon set and hidden from screen readers, since the words name the action.
// While `loading` it shows a spinner in the icon's place, says it is busy, and can't be pressed
// again. Given `href`, it is a link that looks like the button, for an action that opens
// another page, such as signing in with another site; given `to`, a link to a page of the app's
// own, through RouterLink where the app has Vue Router. A link is never disabled or loading.
//
// Given `pressed`, it is a toggle: it turns something on and off, says which it is
// (`aria-pressed`), and fills with the accent while on, whatever its variant. Its words stay the
// same either way, naming what it turns on ("Favourite", "Show password"), since a screen reader
// says the state with them; the `icon` slot is given `pressed`, so an app's icon may change with
// it, as a heart fills.
//
// `size` draws it `small`, for a row of a dense table, or `large`, for a screen used standing
// up. A small button is still laid out a touch target's height, its fill drawn smaller inside
// that, so the area a finger or a pointer presses never falls below 44 px and two small buttons
// never share it; a row of them reads lighter but takes no less room.
//
// A button that shows only an icon is KitIconButton, which gives this one the
// `kit-button--icon-only` modifier.
import KitSpinner from './KitSpinner.vue'
import { appRouterLink, linkBinding } from './links'
import type { KitLinkTarget } from './links'
import { filled } from './slots'

export type KitButtonVariant = 'primary' | 'secondary' | 'danger' | 'quiet' | 'plain'

/** A button's size: the default, a touch target's height, or drawn smaller or larger. */
export type KitButtonSize = 'small' | 'default' | 'large'

withDefaults(
  defineProps<{
    /** How much the action stands out: the page's main action is `primary`, an irreversible one `danger`, a minor one `quiet`, and a control's own chrome, such as a dialog's Close, `plain`. */
    variant?: KitButtonVariant
    /** How large it is drawn; a small one is still pressed over 44 px. */
    size?: KitButtonSize
    /** The native button type; `submit` sends its form. */
    type?: 'button' | 'submit' | 'reset'
    /** Whether its action is running: it shows a spinner and can't be pressed again. */
    loading?: boolean
    disabled?: boolean
    /** Where it leads, which makes it a link rather than a button. */
    href?: string
    /** A page of the app's own it leads to, a RouterLink's `to`, which makes it a link. */
    to?: KitLinkTarget
    /** Whether a toggle is on; a button that is no toggle leaves it out. */
    pressed?: boolean
  }>(),
  {
    variant: 'secondary',
    size: 'default',
    type: 'button',
    loading: false,
    disabled: false,
    href: undefined,
    to: undefined,
    pressed: undefined,
  },
)

defineSlots<{
  default?: () => unknown
  icon?: (props: { pressed: boolean }) => unknown
}>()

const routerLink = appRouterLink()
</script>

<template>
  <component
    :is="to === undefined ? 'a' : (routerLink ?? 'a')"
    v-if="href || to !== undefined"
    class="kit-button"
    :class="[`kit-button--${variant}`, size === 'default' ? '' : `kit-button--${size}`]"
    v-bind="to === undefined ? { href } : linkBinding(routerLink, to)"
  >
    <span
      v-if="filled($slots.icon, { pressed: false })"
      class="kit-button__icon"
      aria-hidden="true"
    >
      <slot name="icon" :pressed="false" />
    </span>
    <slot />
  </component>
  <button
    v-else
    :type="type"
    class="kit-button"
    :class="[`kit-button--${variant}`, size === 'default' ? '' : `kit-button--${size}`]"
    :disabled="disabled || loading"
    :aria-busy="loading || undefined"
    :aria-pressed="pressed"
  >
    <KitSpinner v-if="loading" />
    <span
      v-else-if="filled($slots.icon, { pressed: pressed === true })"
      class="kit-button__icon"
      aria-hidden="true"
    >
      <slot name="icon" :pressed="pressed === true" />
    </span>
    <slot />
  </button>
</template>

<style scoped>
/*
 * Each variant sets the fill, ink, edge and hover the rules below draw with. A hover moves the
 * fill 15% toward the page's text color, which takes it away from the button's own words in
 * either scheme; a quiet button takes a 6% wash of the accent and an underline, a plain one the
 * same of the text color. contrast.ts (BUTTON_HOVER) holds the same numbers and contrast.spec.ts
 * measures every hover at 7:1, so the two change together.
 */
@layer kit {
  .kit-button {
    --kit-button-fill: var(--kit-surface-raised);
    --kit-button-ink: var(--kit-text);
    --kit-button-edge: var(--kit-control-border);
    --kit-button-hover: color-mix(in srgb, var(--kit-button-fill) 85%, var(--kit-text));

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
    background: var(--kit-button-hover);
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
    --kit-button-hover: color-mix(in srgb, var(--kit-accent) 6%, transparent);
  }

  .kit-button--quiet:hover:not(:disabled) {
    text-decoration: underline;
  }

  /* Quiet in the text color, not the accent: a control's own chrome (Close, Dismiss, Clear),
     which belongs to what it sits in rather than standing out as an action of its own. */
  .kit-button--plain {
    --kit-button-fill: transparent;
    --kit-button-ink: var(--kit-text);
    --kit-button-edge: transparent;
    --kit-button-hover: color-mix(in srgb, var(--kit-text) 6%, transparent);
  }

  .kit-button--plain:hover:not(:disabled) {
    text-decoration: underline;
  }

  /* A toggle that is on fills with the accent, as a primary button does, whatever its variant,
     and its hover is the primary's, which contrast.ts measures. */
  .kit-button[aria-pressed='true'] {
    --kit-button-fill: var(--kit-accent);
    --kit-button-ink: var(--kit-on-accent);
    --kit-button-edge: var(--kit-accent);
    --kit-button-hover: color-mix(in srgb, var(--kit-accent) 85%, var(--kit-text));
  }

  .kit-button[aria-pressed='true']:hover:not(:disabled) {
    text-decoration: none;
  }

  .kit-button--icon-only {
    padding: 0;
  }

  .kit-button__icon {
    display: inline-flex;
  }

  /* Large: taller, wider and in larger words, for a screen used standing up. */
  .kit-button--large {
    min-width: var(--kit-control-height-large);
    min-height: var(--kit-control-height-large);
    padding-inline: var(--kit-space-lg);
    font-size: var(--kit-text-size-md);
  }

  /* Small: laid out a touch target's height, its fill and edge drawn smaller inside it, under
     the words, which take the focus ring's place on the drawn part too. */
  .kit-button--small {
    position: relative;
    isolation: isolate;
    padding-block: 0;
    padding-inline: var(--kit-space-sm);
    border-color: transparent;
    background: transparent;
    font-size: var(--kit-text-size-sm);
  }

  .kit-button--small::before {
    position: absolute;
    z-index: -1;
    inset: calc((var(--kit-control-height) - var(--kit-control-height-small)) / 2) 0;
    box-sizing: border-box;
    border: var(--kit-control-border-width) solid var(--kit-button-edge);
    border-radius: var(--kit-radius-md);
    background: var(--kit-button-fill);
    content: '';
    transition: background-color var(--kit-duration-quick) ease;
  }

  .kit-button--small.kit-button--icon-only::before {
    inset: calc((var(--kit-control-height) - var(--kit-control-height-small)) / 2);
  }

  .kit-button--small:focus-visible {
    outline: none;
  }

  .kit-button--small:focus-visible::before {
    outline: var(--kit-focus-ring-width) solid var(--kit-focus-ring);
    outline-offset: var(--kit-focus-ring-offset);
  }

  .kit-button--small:hover:not(:disabled) {
    background: transparent;
  }

  .kit-button--small:hover:not(:disabled)::before {
    background: var(--kit-button-hover);
  }

  @media (prefers-reduced-motion: reduce) {
    .kit-button,
    .kit-button--small::before {
      transition: none;
    }
  }
}
</style>
