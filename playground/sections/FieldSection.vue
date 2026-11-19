<script setup lang="ts">
// KitFormField with each of the kit's controls in it: a text box, a box of several lines and a
// number box, each at rest, with a hint, required, in error and disabled.
import { ref } from 'vue'
import {
  KitPagePanel,
  KitFormField,
  KitNumberField,
  KitTextField,
  KitTextarea,
} from '@jwill89/shared-components-vue'

const title = ref('The Left Hand of Darkness')
const email = ref('')
const isbn = ref('978-0-441')
const slug = ref('')
const locked = ref('Shelf 3')
const notes = ref('')
const blurb = ref('A world where people are neither man nor woman, '.repeat(3).trim())
const copies = ref<number | undefined>(2)
const year = ref<number | undefined>(1969)
const rating = ref<number | undefined>(undefined)
</script>

<template>
  <KitPagePanel id="fields" class="playground-section" title="Fields">
    <h3>KitFormField with KitTextField</h3>
    <div class="field-grid">
      <KitFormField v-slot="field" label="Title">
        <KitTextField v-model="title" v-bind="field" />
      </KitFormField>
      <KitFormField v-slot="field" label="Email" hint="The reset link goes here." required>
        <KitTextField
          v-model="email"
          v-bind="field"
          type="email"
          autocomplete="email"
          placeholder="you@example.com"
        />
      </KitFormField>
      <KitFormField
        v-slot="field"
        label="ISBN"
        hint="Ten or thirteen digits."
        error="That ISBN is too short."
      >
        <KitTextField v-model="isbn" v-bind="field" inputmode="numeric" />
      </KitFormField>
      <KitFormField label="Slug">
        <template #default="field"><KitTextField v-model="slug" v-bind="field" /></template>
        <template #hint>Lower case, with hyphens. <a href="#fields">What's a slug?</a></template>
      </KitFormField>
      <KitFormField v-slot="field" label="Shelf" hint="Set by the bookcase.">
        <KitTextField v-model="locked" v-bind="field" disabled />
      </KitFormField>
    </div>

    <h3>KitTextarea</h3>
    <div class="field-grid">
      <KitFormField v-slot="field" label="Notes">
        <KitTextarea v-model="notes" v-bind="field" placeholder="Anything to remember" />
      </KitFormField>
      <KitFormField v-slot="field" label="Blurb" hint="Shown on the book's page.">
        <KitTextarea v-model="blurb" v-bind="field" :limit="120" :rows="3" />
      </KitFormField>
    </div>

    <h3>KitNumberField</h3>
    <div class="field-grid">
      <KitFormField v-slot="field" label="Copies" required>
        <KitNumberField v-model="copies" v-bind="field" :min="1" :max="20" />
      </KitFormField>
      <KitFormField v-slot="field" label="Year" error="A year can't be in the future.">
        <KitNumberField
          v-model="year"
          v-bind="field"
          :min="0"
          :format-options="{ useGrouping: false }"
        />
      </KitFormField>
      <KitFormField v-slot="field" label="Rating" hint="Set once the book is read.">
        <KitNumberField v-model="rating" v-bind="field" :min="1" :max="5" disabled />
      </KitFormField>
    </div>
  </KitPagePanel>
</template>

<style scoped>
.field-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 16rem), 1fr));
  gap: var(--kit-space-md);
  margin-bottom: var(--kit-space-lg);
}
</style>
