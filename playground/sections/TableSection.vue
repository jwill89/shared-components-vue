<script setup lang="ts">
// KitDataTable over forty books: searched, sorted and paged by the table itself, with a box to
// select rows and a row's own action at its end, and each of its other states in turn. A second
// table, over a smaller library, has the rest asked for: rows that open, filters with their counts,
// groups, a CSV, columns to resize, and rows as cards where the panel is narrow.
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

interface Loan {
  id: number
  title: string
  author: string
  room: string
  subjects: string[]
  year: number
  note: string
}

const subjects = [['fantasy'], ['science fiction'], ['science fiction', 'classic'], ['essays']]
const loans: Loan[] = Array.from({ length: 24 }, (_, index) => ({
  id: index + 1,
  title: `Book ${String(index + 1)}`,
  author: authors[(index * 3) % authors.length] ?? 'Unknown',
  // Every seventh book is still to be put away, so one group has no name.
  room: index % 7 === 6 ? '' : (shelves[index % shelves.length] ?? 'Study'),
  subjects: subjects[index % subjects.length] ?? [],
  year: 1970 + ((index * 11) % 50),
  note: `Lent ${String((index % 5) + 1)} times; last back on a ${['Monday', 'Friday'][index % 2] ?? 'Monday'}.`,
}))

const loanColumns: KitColumn<Loan>[] = [
  { key: 'title', label: 'Title', sortable: true, rowHeader: true },
  { key: 'author', label: 'Author', sortable: true },
  { key: 'room', label: 'Room', filter: true, text: (loan) => loan.room || 'Not put away' },
  {
    key: 'subjects',
    label: 'Subjects',
    filter: true,
    values: (loan) => loan.subjects,
    text: (loan) => loan.subjects.join(', '),
  },
  { key: 'year', label: 'Year', sortable: true, align: 'end', sortValue: (loan) => loan.year },
]

const loanSearch = ref('')
const loanSort = ref<KitSort | null>(null)
const loanPage = ref(1)
const loanFilters = ref<Record<string, string>>({})
const expanded = ref<(string | number)[]>([])
const widths = ref<Record<string, number>>({})

type Grouping = 'none' | 'room' | 'author'
const grouping = ref<Grouping>('none')
const groupings = [
  { value: 'none', label: 'None' },
  { value: 'room', label: 'Room' },
  { value: 'author', label: 'Author' },
] satisfies { value: Grouping; label: string }[]
const groupBy = computed(() => (grouping.value === 'none' ? undefined : grouping.value))
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

    <h3>KitDataTable, with the rest asked for</h3>
    <p class="playground-note">
      A row’s button opens its detail; Room and Subjects filter, each choice with how many rows hold
      it; Group by keeps rows together; Download as CSV saves the rows matching; each heading’s edge
      drags, or takes the arrow keys, and Column widths does the same by button. Narrower than
      40rem, each row is a card. {{ expanded.length }} open.
    </p>
    <KitFormField v-slot="field" label="Group by" group>
      <KitSegmentedControl v-model="grouping" v-bind="field" :options="groupings" />
    </KitFormField>
    <KitDataTable
      v-model:search="loanSearch"
      v-model:sort="loanSort"
      v-model:page="loanPage"
      v-model:filters="loanFilters"
      v-model:expanded="expanded"
      v-model:widths="widths"
      :rows="loans"
      :columns="loanColumns"
      row-key="id"
      label="Lending"
      :page-size="8"
      :group-by="groupBy"
      no-group-text="Not put away"
      search-label="Search lending"
      csv="lending"
      searchable
      resizable
      stack-below="40rem"
    >
      <template #detail="{ row }">
        <p class="table-detail">{{ row.title }}, {{ row.year }}. {{ row.note }}</p>
      </template>
    </KitDataTable>
  </KitPagePanel>
</template>

<style scoped>
.table-detail {
  margin: 0;
}

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
