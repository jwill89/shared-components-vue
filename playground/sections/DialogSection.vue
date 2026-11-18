<script setup lang="ts">
// KitDialog as a plain panel, as a form, and wide; KitConfirmDialog asked through confirm(),
// and used itself to show its action running.
import { ref } from 'vue'
import {
  KitButton,
  KitConfirmDialog,
  KitDialog,
  KitFormField,
  KitTextField,
  KitTextarea,
  confirm,
  useToast,
} from '@jwill89/shared-components-vue'

const toast = useToast()

const title = ref('')
const titleError = ref<string>()
const saving = ref(false)
const adding = ref(false)
const lastAnswer = ref('Nothing asked yet.')

/** The form's save: it says what is missing, or waits a moment as a server would and closes. */
async function addBook(): Promise<void> {
  if (title.value.trim() === '') {
    titleError.value = 'A book needs a title.'
    return
  }
  titleError.value = undefined
  saving.value = true
  await new Promise((resolve) => setTimeout(resolve, 600))
  saving.value = false
  adding.value = false
  lastAnswer.value = `Added “${title.value}”.`
  title.value = ''
}

async function deleteShelf(): Promise<void> {
  const yes = await confirm({
    title: 'Delete this shelf?',
    message: 'Its 12 books go back to unshelved. This can’t be undone.',
    confirmLabel: 'Delete the shelf',
    danger: true,
  })
  lastAnswer.value = yes ? 'The shelf was deleted.' : 'The shelf was kept.'
}

const emptying = ref(false)
const emptyBusy = ref(false)

async function emptyBin(): Promise<void> {
  emptyBusy.value = true
  await new Promise((resolve) => setTimeout(resolve, 800))
  emptyBusy.value = false
  emptying.value = false
  lastAnswer.value = 'The bin was emptied.'
}
</script>

<template>
  <section class="playground-section" aria-labelledby="dialogs-heading">
    <h2 id="dialogs-heading">Dialogs</h2>

    <h3>KitDialog</h3>
    <p class="playground-note">
      A panel, a form that says what is missing and waits while it saves, and a wide one.
    </p>
    <div class="playground-row">
      <KitDialog title="About this shelf" description="Where the books on it came from.">
        <template #trigger><KitButton>About this shelf</KitButton></template>
        <p>Most of these were bought second-hand in 2019, and a few were gifts.</p>
        <template #footer>
          <KitButton @click="toast.success('Copied the shelf’s link')">
            Copy the shelf’s link
          </KitButton>
        </template>
      </KitDialog>

      <KitDialog
        v-model:open="adding"
        title="Add a book"
        description="Only the title is needed now; the rest can follow."
        submit-label="Add the book"
        :busy="saving"
        @submit="addBook"
      >
        <template #trigger><KitButton variant="primary">Add a book</KitButton></template>
        <KitFormField v-slot="field" label="Title" :error="titleError" required>
          <KitTextField v-model="title" v-bind="field" autocomplete="off" />
        </KitFormField>
      </KitDialog>

      <KitDialog title="Edit the notes" wide submit-label="Save the notes">
        <template #trigger><KitButton>Edit the notes (wide)</KitButton></template>
        <KitFormField v-slot="field" label="Notes">
          <KitTextarea model-value="" v-bind="field" :rows="8" />
        </KitFormField>
      </KitDialog>
    </div>

    <h3>KitConfirmDialog</h3>
    <p class="playground-note">Asked through confirm(), and used itself while its action runs.</p>
    <div class="playground-row">
      <KitButton variant="danger" @click="deleteShelf">Delete the shelf</KitButton>
      <KitButton @click="emptying = true">Empty the bin</KitButton>
      <KitConfirmDialog
        v-model:open="emptying"
        title="Empty the bin?"
        message="The 3 books in it are gone for good."
        confirm-label="Empty it"
        danger
        :busy="emptyBusy"
        @confirm="emptyBin"
      />
    </div>
    <p class="playground-note" role="status">{{ lastAnswer }}</p>
  </section>
</template>
