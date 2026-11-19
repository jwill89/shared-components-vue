<script setup lang="ts">
// The one page header every page opens with: the page's one h1, a line on what the page is for
// (the `description` prop, or its slot for a status line with markup), the trail of pages above
// it, and the page's own actions at its end. The trail names only the pages above this one,
// hides its separators from screen readers, and moves within the app without a reload: each
// crumb is a RouterLink where the app has Vue Router, and a plain link, its `to` the address,
// where it hasn't. The kit never imports Vue Router itself, so an app without it takes the kit
// just the same.
import { getCurrentInstance } from 'vue'
import { filled } from './slots'

/** A page above this one: its name, and where it is, as a RouterLink's `to` or an address. */
export interface KitCrumb {
  label: string
  to: string | object
}

defineProps<{
  title: string
  description?: string
  /** The pages above this one, outermost first. */
  crumbs?: KitCrumb[]
}>()

defineSlots<{
  /** The page's own buttons. */
  actions?: () => unknown
  /** What the page is for, when it needs markup. */
  description?: () => unknown
}>()

// Vue Router registers RouterLink on the app; with no router, a crumb is a plain link.
const routerLink = getCurrentInstance()?.appContext.components.RouterLink

function linkTo(to: KitCrumb['to']): Record<string, unknown> {
  return routerLink ? { to } : { href: typeof to === 'string' ? to : undefined }
}
</script>

<template>
  <header class="kit-page-header">
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
        <h1 class="kit-page-header__title">{{ title }}</h1>
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

  .kit-page-header__title {
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
