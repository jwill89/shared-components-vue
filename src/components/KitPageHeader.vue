<script setup lang="ts">
// The one page header every page opens with: the page's one h1, a line on what the page is for
// (the `description` prop, or its slot for a status line with markup), the trail of pages above
// it, and the page's own actions at its end. The trail names only the pages above this one,
// hides its separators from screen readers, and moves within the app without a reload: each
// crumb is a RouterLink where the app has Vue Router, and a plain link, its `to` the address,
// where it hasn't. The kit never imports Vue Router itself, so an app without it takes the kit
// just the same.
//
// Beside the title, the `help` slot takes a KitHelpTip on what the page is for, and before it the
// `icon` slot an icon from the app's own set, hidden from screen readers. `eyebrow` is a short line
// over the title, such as the kind of record the page shows ("Case file"), read before it. `back`
// is a link to the page someone came from, over everything else, for a page reached from a list,
// where "Back to the loans" says more than the trail does.
import KitGlyph from './KitGlyph.vue'
import { appRouterLink, linkBinding } from './links'
import type { KitLinkTarget } from './links'
import { filled } from './slots'

/** A page above this one: its name, and where it is, as a RouterLink's `to` or an address. */
export interface KitCrumb {
  label: string
  to: KitLinkTarget
}

defineProps<{
  title: string
  description?: string
  /** The pages above this one, outermost first. */
  crumbs?: KitCrumb[]
  /** A short line over the title: the kind of thing the page shows. */
  eyebrow?: string
  /** The page someone came from, as a link over the header: "Back to the loans". */
  back?: KitCrumb
}>()

defineSlots<{
  /** The page's own buttons. */
  actions?: () => unknown
  /** What the page is for, when it needs markup. */
  description?: () => unknown
  /** A KitHelpTip beside the title. */
  help?: () => unknown
  /** An icon before the title, from the app's own set. */
  icon?: () => unknown
}>()

// Vue Router registers RouterLink on the app; with no router, a crumb is a plain link.
const routerLink = appRouterLink()

function linkTo(to: KitCrumb['to']): Record<string, unknown> {
  return linkBinding(routerLink, to)
}
</script>

<template>
  <header class="kit-page-header">
    <component
      :is="routerLink ?? 'a'"
      v-if="back"
      class="kit-page-header__back"
      v-bind="linkTo(back.to)"
    >
      <KitGlyph name="previous" />
      {{ back.label }}
    </component>
    <nav v-if="crumbs?.length" class="kit-page-header__trail" aria-label="Breadcrumb">
      <ol class="kit-page-header__crumbs">
        <li v-for="crumb in crumbs" :key="crumb.label" class="kit-page-header__crumb">
          <component
            :is="routerLink ?? 'a'"
            class="kit-page-header__link"
            v-bind="linkTo(crumb.to)"
          >
            {{ crumb.label }}
          </component>
          <span class="kit-page-header__separator" aria-hidden="true">/</span>
        </li>
      </ol>
    </nav>
    <div class="kit-page-header__row">
      <div class="kit-page-header__words">
        <p v-if="eyebrow" class="kit-page-header__eyebrow">{{ eyebrow }}</p>
        <div class="kit-page-header__heading">
          <span v-if="filled($slots.icon)" class="kit-page-header__icon" aria-hidden="true">
            <slot name="icon" />
          </span>
          <h1 class="kit-page-header__title">{{ title }}</h1>
          <span v-if="filled($slots.help)" class="kit-page-header__help"><slot name="help" /></span>
        </div>
        <div v-if="description || filled($slots.description)" class="kit-page-header__description">
          <slot name="description">{{ description }}</slot>
        </div>
      </div>
      <div v-if="filled($slots.actions)" class="kit-page-header__actions">
        <slot name="actions" />
      </div>
    </div>
  </header>
</template>

<style scoped>
@layer kit {
  .kit-page-header {
    display: flex;
    flex-direction: column;
    gap: var(--kit-space-xs);
    margin-block-end: var(--kit-space-lg);
  }

  .kit-page-header__crumbs {
    display: flex;
    flex-wrap: wrap;
    margin: 0;
    padding: 0;
    list-style: none;
    font-size: var(--kit-text-size-sm);
  }

  .kit-page-header__crumb {
    display: inline-flex;
    gap: var(--kit-space-xs);
    margin-inline-end: var(--kit-space-xs);
  }

  .kit-page-header__link {
    color: var(--kit-accent);
    text-decoration: underline;
  }

  .kit-page-header__link:focus-visible {
    outline: var(--kit-focus-ring-width) solid var(--kit-focus-ring);
    outline-offset: var(--kit-focus-ring-offset);
  }

  .kit-page-header__separator {
    color: var(--kit-text-muted);
  }

  .kit-page-header__row {
    display: flex;
    flex-wrap: wrap;
    align-items: flex-end;
    justify-content: space-between;
    gap: var(--kit-space-md);
  }

  .kit-page-header__words {
    min-width: 0;
  }

  /* A link back is a touch target's height, its arrow the kit's own. */
  .kit-page-header__back {
    display: inline-flex;
    align-items: center;
    align-self: flex-start;
    gap: var(--kit-space-2xs);
    min-height: var(--kit-control-height);
    color: var(--kit-accent);
    font-size: var(--kit-text-size-sm);
    text-decoration: underline;
  }

  .kit-page-header__back:focus-visible {
    outline: var(--kit-focus-ring-width) solid var(--kit-focus-ring);
    outline-offset: var(--kit-focus-ring-offset);
  }

  .kit-page-header__eyebrow {
    margin: 0 0 var(--kit-space-2xs);
    color: var(--kit-text-muted);
    font-size: var(--kit-text-size-sm);
    font-weight: var(--kit-font-weight-strong);
  }

  .kit-page-header__heading {
    display: flex;
    align-items: center;
    gap: var(--kit-space-xs);
  }

  .kit-page-header__icon,
  .kit-page-header__help {
    display: inline-flex;
    flex: none;
  }

  .kit-page-header__icon {
    font-size: var(--kit-text-size-lg);
  }

  .kit-page-header__title {
    min-width: 0;
    margin: 0;
    font-family: var(--kit-font-heading);
    font-size: var(--kit-text-size-xl);
    line-height: var(--kit-line-height-heading);
    overflow-wrap: anywhere;
  }

  .kit-page-header__description {
    max-width: var(--kit-measure-prose);
    margin-block-start: var(--kit-space-xs);
    color: var(--kit-text-muted);
  }

  .kit-page-header__actions {
    display: flex;
    flex-wrap: wrap;
    gap: var(--kit-space-xs);
  }
}
</style>
