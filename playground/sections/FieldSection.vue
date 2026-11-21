<script setup lang="ts">
// KitFormField with each of the kit's controls in it: a text box, a box of several lines, a
// number box and a tag input, each at rest, with a hint, required, in error and disabled; and the
// Turnstile check a form asks for.
import { ref } from 'vue'
import {
  KitButton,
  KitDatePicker,
  KitPagePanel,
  KitFormField,
  KitNumberField,
  KitTagInput,
  KitTextField,
  KitTextarea,
  KitTurnstileWidget,
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
const tags = ref(['fiction', 'signed'])
const moods = ref<string[]>([])
const lockedTags = ref(['first edition'])
const tagSuggestions = ['fiction', 'poetry', 'history', 'signed', 'gift', 'to read', 'favourite']
const lower = (typed: string): string => typed.trim().toLowerCase()
const lentOn = ref('2026-11-02')
const dueBy = ref('')
const checking = ref(false)
const token = ref('')
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

    <h3>KitTagInput</h3>
    <div class="field-grid">
      <KitFormField v-slot="field" label="Tags" hint="Up to five; Enter or a comma adds one.">
        <KitTagInput
          v-model="tags"
          v-bind="field"
          :max="5"
          :max-length="30"
          :normalize="lower"
          :suggestions="tagSuggestions"
          placeholder="Add a tag…"
        />
      </KitFormField>
      <KitFormField v-slot="field" label="Moods" error="Add at least one mood.">
        <KitTagInput v-model="moods" v-bind="field" />
      </KitFormField>
      <KitFormField v-slot="field" label="Locked tags" hint="Set by the shelf’s owner.">
        <KitTagInput v-model="lockedTags" v-bind="field" disabled />
      </KitFormField>
    </div>

    <h3>KitDatePicker</h3>
    <p class="playground-note">
      Typed in its parts or picked from the calendar; the due date is held after the lending date.
    </p>
    <div class="field-grid">
      <KitFormField v-slot="field" label="Lent on" group required>
        <KitDatePicker v-model="lentOn" v-bind="field" />
      </KitFormField>
      <KitFormField v-slot="field" label="Due by" group hint="After the day it was lent.">
        <KitDatePicker v-model="dueBy" v-bind="field" :min="lentOn" />
      </KitFormField>
    </div>

    <h3>KitTurnstileWidget</h3>
    <p class="playground-note">
      Cloudflare’s own check, with its published test key that always passes. It loads Cloudflare’s
      script, so it waits for a press.
    </p>
    <KitButton v-if="!checking" @click="checking = true">Show the check</KitButton>
    <template v-else>
      <KitTurnstileWidget v-model="token" site-key="1x00000000000000000000AA" action="playground" />
      <p class="playground-note">
        {{ token ? 'Passed: the form may be sent.' : 'Not passed yet.' }}
      </p>
    </template>
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
