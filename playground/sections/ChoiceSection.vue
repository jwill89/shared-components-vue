<script setup lang="ts">
// The choice controls in a KitFormField each: a select, a combobox for one and for several, a
// switch, and a segmented control in a group field.
import { ref } from 'vue'
import {
  KitCombobox,
  KitFormField,
  KitPagePanel,
  KitSegmentedControl,
  KitSelect,
  KitSwitch,
} from '@jwill89/shared-components-vue'
import type { KitComboboxOption, KitSelectOption } from '@jwill89/shared-components-vue'

const shelves: KitSelectOption[] = [
  { value: 'hall', label: 'Hall' },
  { value: 'study', label: 'Study' },
  { value: 'attic', label: 'Attic (full)', disabled: true },
]

const genres: KitComboboxOption[] = [
  { value: 'fantasy', label: 'Fantasy', group: 'Fiction' },
  { value: 'mystery', label: 'Mystery', group: 'Fiction' },
  { value: 'science-fiction', label: 'Science fiction', group: 'Fiction' },
  { value: 'history', label: 'History', group: 'Non-fiction' },
  { value: 'travel', label: 'Travel', group: 'Non-fiction' },
]

const shelf = ref<string | number>()
const sortShelf = ref<string | number>('study')
const genre = ref<string | number | null>(null)
const tags = ref<(string | number)[]>(['fantasy', 'travel'])
const covers = ref(true)
const lending = ref(false)
const view = ref<'grid' | 'list' | 'spines'>('grid')
</script>

<template>
  <KitPagePanel id="choices" class="playground-section" title="Choices">
    <h3>KitSelect</h3>
    <div class="choice-grid">
      <KitFormField v-slot="field" label="Shelf" hint="Where the book goes.">
        <KitSelect v-model="shelf" v-bind="field" :options="shelves" placeholder="Choose a shelf" />
      </KitFormField>
      <KitFormField v-slot="field" label="Sorted shelf" error="That shelf is being sorted.">
        <KitSelect v-model="sortShelf" v-bind="field" :options="shelves" />
      </KitFormField>
    </div>

    <h3>KitCombobox</h3>
    <div class="choice-grid">
      <KitFormField v-slot="field" label="Genre">
        <KitCombobox v-model="genre" v-bind="field" :options="genres" clearable />
      </KitFormField>
      <KitFormField v-slot="field" label="Tags" hint="Choose as many as fit.">
        <KitCombobox v-model="tags" v-bind="field" :options="genres" multiple />
      </KitFormField>
    </div>

    <h3>KitSwitch</h3>
    <div class="choice-grid">
      <KitFormField v-slot="field" label="Show covers">
        <KitSwitch v-model="covers" v-bind="field" />
      </KitFormField>
      <KitFormField v-slot="field" label="Lend to friends" hint="Turned off by the owner.">
        <KitSwitch v-model="lending" v-bind="field" disabled />
      </KitFormField>
    </div>

    <h3>KitSegmentedControl</h3>
    <KitFormField v-slot="field" label="View" group hint="How the books are laid out.">
      <KitSegmentedControl
        v-model="view"
        v-bind="field"
        :options="[
          { value: 'grid', label: 'Grid' },
          { value: 'list', label: 'List' },
          { value: 'spines', label: 'Spines' },
        ]"
      />
    </KitFormField>
  </KitPagePanel>
</template>

<style scoped>
.choice-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 16rem), 1fr));
  gap: var(--kit-space-md);
  margin-bottom: var(--kit-space-lg);
}
</style>
