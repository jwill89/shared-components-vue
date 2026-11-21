<script setup lang="ts" generic="T extends KitTab">
// A page in parts, one shown at a time: a row of tabs across its top, the chosen one raised out
// of the row with a border and an underline as well as its color, and below it that tab's part,
// from the slot named by its key. The arrow keys move along the row and Enter or Space chooses,
// so passing a tab on the way doesn't open its part. The row wraps on a phone. The page holds
// which tab is chosen, so it can keep it in the address. A tab's icon comes from the `icon`
// slot, given the tab, and is hidden from screen readers, since the words name the tab.
//
// Tabs switch parts of one page. A row of links to other pages is navigation, not tabs.
import { TabsContent, TabsList, TabsRoot, TabsTrigger } from 'reka-ui'
import { filled } from './slots'
import type { KitTab } from './tabs'

defineProps<{
  tabs: readonly T[]
  /** What the row of tabs is, for screen readers: "Shelf settings". */
  label: string
}>()

const model = defineModel<string>({ required: true })

defineSlots<
  {
    /** A tab's icon, given the tab; none by default. */
    icon?: (props: { tab: T }) => unknown
  } & Record<string, (() => unknown) | undefined>
>()

function choose(key: string | number): void {
  model.value = String(key)
}
</script>

<template>
  <TabsRoot
    class="kit-tabs"
    :model-value="model"
    activation-mode="manual"
    @update:model-value="choose"
  >
    <TabsList class="kit-tabs__list" :aria-label="label">
      <TabsTrigger v-for="tab in tabs" :key="tab.key" :value="tab.key" class="kit-tabs__tab">
        <span v-if="filled($slots.icon, { tab })" class="kit-tabs__icon" aria-hidden="true">
          <slot name="icon" :tab="tab" />
        </span>
        {{ tab.label }}
      </TabsTrigger>
    </TabsList>
    <TabsContent v-for="tab in tabs" :key="tab.key" :value="tab.key" class="kit-tabs__panel">
      <slot :name="tab.key" />
    </TabsContent>
  </TabsRoot>
</template>

<style scoped>
@layer kit {
  .kit-tabs {
    display: grid;
    gap: var(--kit-space-lg);
    min-width: 0;
  }

  .kit-tabs__list {
    box-sizing: border-box;
    display: flex;
    flex-wrap: wrap;
    gap: var(--kit-space-2xs);
    width: fit-content;
    max-width: 100%;
    padding: var(--kit-space-2xs);
    border: var(--kit-control-border-width) solid var(--kit-hairline);
    border-radius: var(--kit-radius-md);
    background: var(--kit-surface-sunken);
  }

  .kit-tabs__tab {
    box-sizing: border-box;
    display: inline-flex;
    align-items: center;
    gap: var(--kit-space-xs);
    min-height: var(--kit-control-height);
    padding: var(--kit-space-xs) var(--kit-space-md);
    border: var(--kit-control-border-width) solid transparent;
    border-radius: var(--kit-radius-sm);
    background: transparent;
    color: var(--kit-text-muted);
    font: inherit;
    font-weight: var(--kit-font-weight-strong);
    line-height: var(--kit-line-height-heading);
    cursor: pointer;
    transition:
      background-color var(--kit-duration-quick) ease,
      color var(--kit-duration-quick) ease;
  }

  .kit-tabs__tab:hover {
    color: var(--kit-text);
  }

  .kit-tabs__tab:focus-visible {
    outline: var(--kit-focus-ring-width) solid var(--kit-focus-ring);
    outline-offset: var(--kit-focus-ring-offset);
  }

  /* Chosen: raised out of the row, edged, and underlined in the accent, so color is never
     the only thing that shows it. */
  .kit-tabs__tab[data-state='active'] {
    border-color: var(--kit-control-border);
    background: var(--kit-surface-raised);
    color: var(--kit-text);
    box-shadow: inset 0 calc(-1 * var(--kit-space-2xs)) 0 var(--kit-accent);
  }

  .kit-tabs__icon {
    display: inline-flex;
  }

  .kit-tabs__panel {
    min-width: 0;
  }

  .kit-tabs__panel:focus-visible {
    outline: var(--kit-focus-ring-width) solid var(--kit-focus-ring);
    outline-offset: var(--kit-focus-ring-offset);
  }

  @media (prefers-reduced-motion: reduce) {
    .kit-tabs__tab {
      transition: none;
    }
  }
}
</style>
