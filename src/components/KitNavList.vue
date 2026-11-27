<script setup lang="ts">
// A list of links to the pages of one part of an app: a settings area's sections, a record's
// pages, a console's menu. `<KitNavList label="Settings" :items="sections" />`. Each item is a
// link, never a button that calls the router, so it opens in a new tab as a link does; through
// RouterLink where the app has Vue Router, which marks the page on screen itself, and `current`
// marks it where the app has none. The page on screen is drawn bold, on the sunken surface,
// with a bar of the accent at its start, and is `aria-current="page"`, so it never rests on
// color alone. An item's icon comes from the `icon` slot, given the item.
//
// Items with a `group` gather under that heading; given `foldable`, each heading is a button that
// folds its links away, and the group holding the page on screen starts open. On a phone the list
// folds away behind a button with the list's name, which opens it; `horizontal` lays the links
// out in a row instead, as tabs over the page's content, for a few pages of one record.
import { computed, ref, useId } from 'vue'
import KitGlyph from './KitGlyph.vue'
import { appRouterLink, linkBinding } from './links'
import type { KitLinkTarget } from './links'
import { byHeading } from './options'
import { filled } from './slots'

/** One link in a KitNavList. */
export interface KitNavItem {
  label: string
  /** Where it leads: a RouterLink's `to`, or an address. */
  to: KitLinkTarget
  /** Whether it is the page on screen, where the app has no Vue Router to say so. */
  current?: boolean
  /** The heading it sits under. */
  group?: string
}

const props = withDefaults(
  defineProps<{
    /** What the links are the pages of, which names the navigation: "Settings". */
    label: string
    items: KitNavItem[]
    /** Whether each heading folds its links away. */
    foldable?: boolean
    /** Lays the links out in a row, as tabs. */
    horizontal?: boolean
  }>(),
  { foldable: false, horizontal: false },
)

defineSlots<{
  /** An item's icon, from the app's own set. */
  icon?: (props: { item: KitNavItem }) => unknown
}>()

const routerLink = appRouterLink()
const listId = `${useId()}-list`
const runs = computed(() => byHeading(props.items))

// Whether the list is open on a phone, where it folds away behind its button.
const open = ref(false)

// The headings folded away. The one holding the page on screen starts open.
const folded = ref(
  new Set(
    props.foldable
      ? runs.value
          .filter((run) => run.heading && !run.options.some((item) => item.current))
          .map((run) => run.heading)
      : [],
  ),
)

function fold(heading: string | undefined): void {
  const next = new Set(folded.value)
  if (next.has(heading)) {
    next.delete(heading)
  } else {
    next.add(heading)
  }
  folded.value = next
}

/** What an item's link binds: where it leads, and whether it is the page on screen. */
function link(item: KitNavItem): Record<string, unknown> {
  // RouterLink marks the page on screen itself; without it, `current` does.
  const current = item.current ? { 'aria-current': 'page' } : {}
  return { ...linkBinding(routerLink, item.to), ...current }
}
</script>

<template>
  <nav
    class="kit-nav-list"
    :class="{ 'is-horizontal': horizontal, 'is-open': open }"
    :aria-label="label"
  >
    <button
      v-if="!horizontal"
      type="button"
      class="kit-nav-list__toggle"
      :aria-expanded="open"
      :aria-controls="listId"
      @click="open = !open"
    >
      {{ label }}
      <KitGlyph name="chevron" class="kit-nav-list__chevron" />
    </button>
    <div :id="listId" class="kit-nav-list__body">
      <div v-for="(run, at) in runs" :key="run.heading ?? ''" class="kit-nav-list__run">
        <template v-if="run.heading">
          <button
            v-if="foldable"
            type="button"
            class="kit-nav-list__heading kit-nav-list__fold"
            :aria-expanded="!folded.has(run.heading)"
            :aria-controls="`${listId}-${String(at)}`"
            @click="fold(run.heading)"
          >
            {{ run.heading }}
            <KitGlyph name="chevron" class="kit-nav-list__chevron" />
          </button>
          <span v-else :id="`${listId}-${String(at)}-heading`" class="kit-nav-list__heading">
            {{ run.heading }}
          </span>
        </template>
        <ul
          v-show="!folded.has(run.heading)"
          :id="`${listId}-${String(at)}`"
          class="kit-nav-list__links"
          :aria-labelledby="
            run.heading && !foldable ? `${listId}-${String(at)}-heading` : undefined
          "
        >
          <li v-for="item in run.options" :key="item.label">
            <component :is="routerLink ?? 'a'" class="kit-nav-list__link" v-bind="link(item)">
              <span
                v-if="filled($slots.icon, { item })"
                class="kit-nav-list__icon"
                aria-hidden="true"
              >
                <slot name="icon" :item="item" />
              </span>
              {{ item.label }}
            </component>
          </li>
        </ul>
      </div>
    </div>
  </nav>
</template>

<style scoped>
/*
 * Each link is a touch target's height. A hover takes a plain button's 6% wash of the text
 * color; the page on screen is bold on the sunken surface, with the accent's bar at its start
 * (under it, in a row), each a pair contrast.ts measures.
 */
@layer kit {
  .kit-nav-list {
    min-width: 0;
  }

  .kit-nav-list__body {
    display: flex;
    flex-direction: column;
    gap: var(--kit-space-sm);
  }

  .kit-nav-list__links {
    display: flex;
    flex-direction: column;
    gap: var(--kit-space-2xs);
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .kit-nav-list__heading {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--kit-space-xs);
    padding: var(--kit-space-2xs) var(--kit-space-sm);
    color: var(--kit-text-muted);
    font-size: var(--kit-text-size-sm);
    font-weight: var(--kit-font-weight-strong);
  }

  .kit-nav-list__toggle,
  .kit-nav-list__fold {
    box-sizing: border-box;
    width: 100%;
    min-height: var(--kit-control-height);
    border: 0;
    border-radius: var(--kit-radius-md);
    background: transparent;
    font-family: inherit;
    text-align: start;
    cursor: pointer;
  }

  .kit-nav-list__toggle {
    display: none;
    align-items: center;
    justify-content: space-between;
    gap: var(--kit-space-xs);
    padding: var(--kit-space-xs) var(--kit-space-sm);
    border: var(--kit-control-border-width) solid var(--kit-control-border);
    background: var(--kit-surface-raised);
    color: var(--kit-text);
    font-size: inherit;
    font-weight: var(--kit-font-weight-strong);
  }

  .kit-nav-list__link {
    box-sizing: border-box;
    display: flex;
    align-items: center;
    gap: var(--kit-space-xs);
    min-height: var(--kit-control-height);
    padding: var(--kit-space-xs) var(--kit-space-sm);
    border-inline-start: 3px solid transparent;
    border-radius: var(--kit-radius-md);
    color: var(--kit-text);
    text-decoration: none;
  }

  .kit-nav-list__toggle:focus-visible,
  .kit-nav-list__fold:focus-visible,
  .kit-nav-list__link:focus-visible {
    outline: var(--kit-focus-ring-width) solid var(--kit-focus-ring);
    outline-offset: calc(-1 * var(--kit-focus-ring-width));
  }

  .kit-nav-list__toggle:hover,
  .kit-nav-list__fold:hover,
  .kit-nav-list__link:hover {
    background: color-mix(in srgb, var(--kit-text) 6%, transparent);
  }

  .kit-nav-list__link:hover {
    text-decoration: underline;
  }

  .kit-nav-list__link[aria-current='page'] {
    border-inline-start-color: var(--kit-accent);
    background: var(--kit-surface-sunken);
    font-weight: var(--kit-font-weight-strong);
  }

  .kit-nav-list__icon {
    display: inline-flex;
    flex: none;
  }

  .kit-nav-list__chevron {
    flex: none;
    transition: transform var(--kit-duration-quick) ease;
  }

  [aria-expanded='true'] > .kit-nav-list__chevron {
    transform: rotate(180deg);
  }

  /* In a row: the links side by side, the page on screen marked under its words. */
  .kit-nav-list.is-horizontal .kit-nav-list__links {
    flex-flow: row wrap;
    gap: var(--kit-space-2xs);
    border-bottom: var(--kit-control-border-width) solid var(--kit-hairline);
  }

  .kit-nav-list.is-horizontal .kit-nav-list__link {
    border-inline-start: 0;
    border-bottom: 3px solid transparent;
    border-radius: var(--kit-radius-md) var(--kit-radius-md) 0 0;
  }

  .kit-nav-list.is-horizontal .kit-nav-list__link[aria-current='page'] {
    border-bottom-color: var(--kit-accent);
  }

  /* On a phone a list down the side folds away behind its button. */
  @media (width < 40rem) {
    .kit-nav-list:not(.is-horizontal) .kit-nav-list__toggle {
      display: flex;
    }

    .kit-nav-list:not(.is-horizontal, .is-open) .kit-nav-list__body {
      display: none;
    }

    .kit-nav-list.is-open .kit-nav-list__body {
      margin-block-start: var(--kit-space-xs);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .kit-nav-list__chevron {
      transition: none;
    }
  }
}
</style>
