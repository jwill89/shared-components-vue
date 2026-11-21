<script setup lang="ts">
// KitDataTable over forty books: searched, sorted and paged by the table itself, with a box to
// select rows and a row's own action at its end, and each of its other states in turn.
import { computed, ref } from 'vue'
import {
  KitButton,
  KitDataTable,
  KitFormField,
  KitPagePanel,
  KitSegmentedControl,
  useToast,
} from '@jwill89/shared-components-vue'
import type { KitColumn, KitSort } from '@jwill89/shared-components-vue'

interface Book {
  id: number
  title: string
  author: string
  year: number
  shelf: string
}

const authors = ['Le Guin', 'Butler', 'Jemisin', 'Banks', 'Chiang', 'Okorafor', 'Leckie', 'Wells']
const shelves = ['Study', 'Hall', 'Landing', 'Bedroom']
const books: Book[] = Array.from({ length: 40 }, (_, index) => ({
  id: index + 1,
  title: `Volume ${String(index + 1)}`,
  author: authors[index % authors.length] ?? 'Unknown',
  year: 1960 + ((index * 7) % 60),
  shelf: shelves[index % shelves.length] ?? 'Study',
}))

const columns: KitColumn<Book>[] = [
  { key: 'title', label: 'Title', sortable: true },
  { key: 'author', label: 'Author', sortable: true },
  { key: 'year', label: 'Year', sortable: true, align: 'end', sortValue: (book) => book.year },
  { key: 'shelf', label: 'Shelf' },
  { key: 'actions', label: 'Actions', hideLabel: true, searchable: false, align: 'end' },
]

const search = ref('')
const sort = ref<KitSort | null>({ key: 'title', direction: 'ascending' })
const page = ref(1)
const selected = ref<(string | number)[]>([])

type Shown = 'rows' | 'loading' | 'failed' | 'empty'
const shown = ref<Shown>('rows')
const states = [
  { value: 'rows', label: 'Rows' },
  { value: 'loading', label: 'Loading' },
  { value: 'failed', label: 'Failed' },
  { value: 'empty', label: 'Empty' },
] satisfies { value: Shown; label: string }[]
const rows = computed(() => (shown.value === 'empty' ? [] : books))

const toast = useToast()
</script>

<template>
  <KitPagePanel id="table" class="playground-section" title="Table">
    <h3>KitDataTable</h3>
    <p class="playground-note">
      Searched, sorted and paged by the table itself; a heading’s button sorts, and its
      <code>aria-sort</code> says which way. {{ selected.length }} selected.
    </p>
    <KitFormField v-slot="field" label="Show" group>
      <KitSegmentedControl v-model="shown" v-bind="field" :options="states" />
    </KitFormField>
    <KitDataTable
      v-model:search="search"
      v-model:sort="sort"
      v-model:page="page"
      v-model:selected="selected"
      :rows="rows"
      :columns="columns"
      row-key="id"
      label="Books"
      :page-size="10"
      :loading="shown === 'loading'"
      :error="shown === 'failed' ? 'The library is closed for stocktaking.' : undefined"
      searchable
      selectable
      empty-title="No books on these shelves yet"
      @retry="shown = 'rows'"
    >
      <template #cell-actions="{ row }">
        <KitButton variant="quiet" @click="toast.info(`Opening ${row.title}`)">
          Open <span class="table-hidden">{{ row.title }}</span>
        </KitButton>
      </template>
    </KitDataTable>
  </KitPagePanel>
</template>

<style scoped>
.table-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  margin: -1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}
</style>
