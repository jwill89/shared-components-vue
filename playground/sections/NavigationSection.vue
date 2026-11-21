<script setup lang="ts">
// KitTabs over three parts of a shelf, a KitMenu of a shelf's actions with a choice of order, and
// KitPagination over a long list and a short one.
import { ref } from 'vue'
import {
  KitMenu,
  KitMenuItem,
  KitMenuLabel,
  KitMenuRadioGroup,
  KitMenuRadioItem,
  KitMenuSeparator,
  KitPagePanel,
  KitPagination,
  KitTabs,
  useToast,
} from '@jwill89/shared-components-vue'
import PlaygroundIcon from '../PlaygroundIcon.vue'

const toast = useToast()

const tabs = [
  { key: 'books', label: 'Books' },
  { key: 'loans', label: 'Loans' },
  { key: 'reviews', label: 'Reviews' },
]
const part = ref('books')

const order = ref('title')

const page = ref(5)
const shortPage = ref(1)
</script>

<template>
  <KitPagePanel id="navigation" class="playground-section" title="Tabs, menus and pages">
    <h3>KitTabs</h3>
    <p class="playground-note">
      The arrow keys move along the row; Enter or Space chooses, so passing a tab opens nothing.
    </p>
    <KitTabs v-model="part" :tabs="tabs" label="Shelf">
      <template #icon="{ tab }"><PlaygroundIcon v-if="tab.key === 'books'" name="plus" /></template>
      <template #books><p>Twelve books on two shelves.</p></template>
      <template #loans><p>Two out on loan, one overdue.</p></template>
      <template #reviews><p>No reviews yet.</p></template>
    </KitTabs>

    <h3>KitMenu</h3>
    <p class="playground-note">
      The actions a row has no room for. A row’s own actions stay buttons at its end, never in a
      menu.
    </p>
    <div class="playground-row">
      <KitMenu label="Shelf actions">
        <KitMenuItem @select="toast.info('Renaming the shelf')">
          <template #icon><PlaygroundIcon name="arrow" /></template>
          Rename
        </KitMenuItem>
        <KitMenuItem @select="toast.info('Shelf copied')">Copy the shelf</KitMenuItem>
        <KitMenuItem danger @select="toast.warning('Pretend: the shelf would go')">
          <template #icon><PlaygroundIcon name="trash" /></template>
          Remove the shelf
        </KitMenuItem>
        <KitMenuSeparator />
        <KitMenuLabel>Order</KitMenuLabel>
        <KitMenuRadioGroup v-model="order" label="Order">
          <KitMenuRadioItem value="title">By title</KitMenuRadioItem>
          <KitMenuRadioItem value="author">By author</KitMenuRadioItem>
          <KitMenuRadioItem value="added">By when added</KitMenuRadioItem>
        </KitMenuRadioGroup>
      </KitMenu>
      <span class="playground-note">Ordered by {{ order }}.</span>
    </div>

    <h3>KitPagination</h3>
    <p class="playground-note">
      Forty pages, with a box that goes straight to one; and three, without it.
    </p>
    <KitPagination v-model:page="page" :page-count="40" label="Pages of the catalogue" />
    <KitPagination v-model:page="shortPage" :page-count="3" label="Pages of loans" />
  </KitPagePanel>
</template>
