<script setup lang="ts">
// The pages of a long list: Previous, the page numbers around the one shown with the first and the
// last always there and a gap where pages are left out, and Next. The page is the model, counted
// from 1, which the page keeps in its address beside the list's search and order. Past `jumpFrom`
// pages, a box goes straight to one, held to the pages there are. With one page it shows nothing.
// It is navigation, named by `label`, and the page shown is marked as the current one.
import { computed, ref, useId } from 'vue'
import {
  PaginationEllipsis,
  PaginationList,
  PaginationListItem,
  PaginationNext,
  PaginationPrev,
  PaginationRoot,
} from 'reka-ui'
import KitGlyph from './KitGlyph.vue'

const props = withDefaults(
  defineProps<{
    /** How many pages there are. */
    pageCount: number
    /** What the pages are, as navigation is named: "Pages of books". */
    label?: string
    /** How many page numbers show either side of the one shown. */
    siblingCount?: number
    /** Past how many pages the box that goes to a page shows. */
    jumpFrom?: number
    previousLabel?: string
    nextLabel?: string
    jumpLabel?: string
  }>(),
  {
    label: 'Pages',
    siblingCount: 1,
    jumpFrom: 5,
    previousLabel: 'Previous',
    nextLabel: 'Next',
    jumpLabel: 'Go to page',
  },
)

const page = defineModel<number>('page', { default: 1 })

defineSlots<{
  'previous-icon'?: () => unknown
  'next-icon'?: () => unknown
}>()

const jumpId = useId()
const jumpTo = ref<number | ''>('')
const jumps = computed(() => props.pageCount > props.jumpFrom)

/** Goes to the page typed, held to the first and the last. */
function jump(): void {
  const typed = jumpTo.value
  jumpTo.value = ''
  if (typed === '' || !Number.isFinite(typed)) {
    return
  }
  page.value = Math.min(Math.max(Math.trunc(typed), 1), props.pageCount)
}
</script>

<template>
  <PaginationRoot
    v-if="pageCount > 1"
    v-model:page="page"
    class="kit-pagination"
    :aria-label="label"
    :total="pageCount"
    :items-per-page="1"
    :sibling-count="siblingCount"
    show-edges
  >
    <PaginationList v-slot="{ items }" as="ul" class="kit-pagination__list">
      <li>
        <PaginationPrev class="kit-pagination__button" :aria-label="previousLabel">
          <slot name="previous-icon"><KitGlyph name="previous" /></slot>
          {{ previousLabel }}
        </PaginationPrev>
      </li>
      <li
        v-for="(item, index) in items"
        :key="item.type === 'page' ? `page-${String(item.value)}` : `gap-${String(index)}`"
      >
        <PaginationListItem
          v-if="item.type === 'page'"
          :value="item.value"
          class="kit-pagination__button kit-pagination__page"
        >
          {{ item.value }}
        </PaginationListItem>
        <PaginationEllipsis v-else as="span" class="kit-pagination__gap">…</PaginationEllipsis>
      </li>
      <li>
        <PaginationNext class="kit-pagination__button" :aria-label="nextLabel">
          {{ nextLabel }}
          <slot name="next-icon"><KitGlyph name="next" /></slot>
        </PaginationNext>
      </li>
    </PaginationList>
    <form v-if="jumps" class="kit-pagination__jump" novalidate @submit.prevent="jump">
      <label :for="jumpId" class="kit-pagination__jump-label">{{ jumpLabel }}</label>
      <input
        :id="jumpId"
        v-model.number="jumpTo"
        class="kit-pagination__jump-box"
        type="number"
        inputmode="numeric"
        min="1"
        :max="pageCount"
      />
    </form>
  </PaginationRoot>
</template>

<style scoped>
@layer kit {
  .kit-pagination {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: center;
    gap: var(--kit-space-xs) var(--kit-space-md);
  }

  .kit-pagination__list {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: center;
    gap: var(--kit-space-2xs);
    margin: 0;
    padding: 0;
    list-style: none;
  }

  /* As a plain button: the text color, edged, with the same faint wash on hover. */
  .kit-pagination__button {
    box-sizing: border-box;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: var(--kit-space-2xs);
    min-width: var(--kit-control-height);
    min-height: var(--kit-control-height);
    padding: var(--kit-space-xs) var(--kit-space-sm);
    border: var(--kit-control-border-width) solid var(--kit-control-border);
    border-radius: var(--kit-radius-md);
    background: transparent;
    color: var(--kit-text);
    font: inherit;
    font-variant-numeric: tabular-nums;
    cursor: pointer;
  }

  .kit-pagination__button:focus-visible {
    outline: var(--kit-focus-ring-width) solid var(--kit-focus-ring);
    outline-offset: var(--kit-focus-ring-offset);
  }

  .kit-pagination__button:disabled {
    cursor: not-allowed;
    opacity: 0.6;
  }

  .kit-pagination__button:hover:not(:disabled, [data-selected]) {
    background: color-mix(in srgb, var(--kit-text) 6%, transparent);
    text-decoration: underline;
  }

  /* The page shown: the page's colors turned round, and bold, so color isn't all that marks it. */
  .kit-pagination__page[data-selected] {
    border-color: var(--kit-text);
    background: var(--kit-text);
    color: var(--kit-surface);
    font-weight: var(--kit-font-weight-strong);
  }

  .kit-pagination__gap {
    display: inline-flex;
    justify-content: center;
    min-width: var(--kit-space-lg);
    color: var(--kit-text-muted);
  }

  .kit-pagination__jump {
    display: flex;
    align-items: center;
    gap: var(--kit-space-xs);
    margin: 0;
  }

  .kit-pagination__jump-box {
    box-sizing: border-box;
    width: calc(var(--kit-control-height) * 2);
    min-height: var(--kit-control-height);
    padding: var(--kit-space-xs);
    border: var(--kit-control-border-width) solid var(--kit-control-border);
    border-radius: var(--kit-radius-md);
    background: var(--kit-surface-raised);
    color: var(--kit-text);
    font: inherit;
    text-align: center;
    appearance: textfield;
  }

  .kit-pagination__jump-box:focus-visible {
    outline: var(--kit-focus-ring-width) solid var(--kit-focus-ring);
    outline-offset: var(--kit-focus-ring-offset);
  }

  .kit-pagination__jump-box::-webkit-outer-spin-button,
  .kit-pagination__jump-box::-webkit-inner-spin-button {
    margin: 0;
    appearance: none;
  }
}
</style>
