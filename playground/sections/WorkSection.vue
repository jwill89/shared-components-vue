<script setup lang="ts">
// The third wave's larger pieces: a time of day, a date with a time, and runs of days with and
// without times, beside what each stores; a list put in order; a form's save bar, with the guard
// that asks before its edits are left; and an account's passkeys, whose server the playground
// plays, so adding one asks no browser.
import { computed, ref } from 'vue'
import {
  KitCheckbox,
  KitDatePicker,
  KitDateRangePicker,
  KitFormField,
  KitPagePanel,
  KitPasskeyList,
  KitReorderList,
  KitSaveBar,
  KitTextField,
  KitTimeField,
  useLeaveGuard,
  useToast,
} from '@jwill89/shared-components-vue'
import type { KitPasskey, KitSaveState } from '@jwill89/shared-components-vue'

const doorsOpen = ref('09:30')
const readingStarts = ref('2026-12-03T19:00:00Z')
const exhibitionFrom = ref('2026-12-01')
const exhibitionTo = ref('2026-12-14')
const signingFrom = ref('2026-12-05T15:00:00Z')
const signingTo = ref('2026-12-05T21:30:00Z')
const stored = computed(() =>
  JSON.stringify(
    {
      doorsOpen: doorsOpen.value,
      readingStarts: readingStarts.value,
      exhibition: [exhibitionFrom.value, exhibitionTo.value],
      signing: [signingFrom.value, signingTo.value],
    },
    null,
    2,
  ),
)

interface Shelf {
  id: number
  name: string
  books: number
}
const shelves = ref<Shelf[]>([
  { id: 1, name: 'New arrivals', books: 12 },
  { id: 2, name: 'Staff picks', books: 8 },
  { id: 3, name: 'Local history', books: 31 },
  { id: 4, name: 'Poetry', books: 19 },
])

// The save bar's form, against a server the playground plays: a save takes a moment, and once
// "someone else" has changed the branch, the next save meets their change.
const savedName = ref('Riverside')
const branchName = ref('Riverside')
const saving = ref(false)
const justSaved = ref(false)
const conflict = ref(false)
const changedElsewhere = ref(false)
const dirty = computed(() => branchName.value !== savedName.value)
const saveState = computed<KitSaveState>(() => {
  if (conflict.value) {
    return 'conflict'
  }
  if (saving.value) {
    return 'saving'
  }
  if (dirty.value) {
    return 'dirty'
  }
  return justSaved.value ? 'saved' : 'clean'
})

function save(): void {
  saving.value = true
  setTimeout(() => {
    saving.value = false
    if (changedElsewhere.value) {
      conflict.value = true
      return
    }
    savedName.value = branchName.value
    justSaved.value = true
    setTimeout(() => {
      justSaved.value = false
    }, 2000)
  }, 400)
}

function discard(): void {
  branchName.value = savedName.value
}

function reload(): void {
  savedName.value = 'Riverside East'
  branchName.value = savedName.value
  conflict.value = false
  changedElsewhere.value = false
}

useLeaveGuard(() => dirty.value)

const toast = useToast()
const passkeys = ref<KitPasskey[]>([
  {
    id: 1,
    name: 'Work laptop',
    createdAt: '2026-06-13T12:00:00Z',
    lastUsedAt: '2026-11-20T12:00:00Z',
  },
  { id: 2, name: 'Phone', createdAt: '2026-07-01T12:00:00Z', lastUsedAt: null },
])
let madeKeys = passkeys.value.length

function addPasskey(): void {
  madeKeys += 1
  const added = {
    id: madeKeys,
    name: `Passkey ${String(madeKeys)}`,
    createdAt: new Date().toISOString(),
    lastUsedAt: null,
  }
  passkeys.value = [...passkeys.value, added]
  toast.success(`Added “${added.name}”`, 'You can sign in with it now.')
}

function renamePasskey(passkey: KitPasskey, name: string): void {
  passkeys.value = passkeys.value.map((key) => (key.id === passkey.id ? { ...key, name } : key))
}

function removePasskey(passkey: KitPasskey): void {
  passkeys.value = passkeys.value.filter((key) => key.id !== passkey.id)
  toast.success(`Removed “${passkey.name}”`)
}
</script>

<template>
  <KitPagePanel id="work" class="playground-section" title="Times, order, saving and passkeys">
    <h3>KitTimeField, KitDatePicker with a time, and KitDateRangePicker</h3>
    <p class="playground-note">
      A time of day stands alone; a date with a time is a moment, stored in UTC and shown in a zone;
      a run of days stores its two ends; and a start and an end with their times are two moments,
      the end held after the start.
    </p>
    <div class="work-pair">
      <div class="work-fields">
        <KitFormField v-slot="field" label="Doors open" group>
          <KitTimeField v-model="doorsOpen" v-bind="field" />
        </KitFormField>
        <KitFormField
          v-slot="field"
          label="Reading starts"
          hint="In your own time zone, which follows it."
          group
        >
          <KitDatePicker v-model="readingStarts" v-bind="field" time />
        </KitFormField>
        <KitFormField v-slot="field" label="Exhibition dates" group>
          <KitDateRangePicker
            v-model:start="exhibitionFrom"
            v-model:end="exhibitionTo"
            v-bind="field"
            min="2026-11-01"
          />
        </KitFormField>
        <KitFormField
          v-slot="field"
          label="Signing starts"
          hint="In New York’s time, where the author signs."
          group
        >
          <KitDatePicker v-model="signingFrom" v-bind="field" time time-zone="America/New_York" />
        </KitFormField>
        <KitFormField v-slot="field" label="Signing ends" group>
          <KitDatePicker
            v-model="signingTo"
            v-bind="field"
            time
            time-zone="America/New_York"
            :min="signingFrom"
          />
        </KitFormField>
      </div>
      <figure class="work-stored">
        <figcaption>What they store</figcaption>
        <pre data-testid="times-json">{{ stored }}</pre>
      </figure>
    </div>

    <h3>KitReorderList</h3>
    <p class="playground-note">
      Up and Down, the arrow keys on a handle, or a drag; each move is read out.
    </p>
    <KitReorderList
      v-model="shelves"
      label="Shelves, in the order they show"
      row-key="id"
      row-label="name"
    >
      <template #row="{ row }">
        {{ row.name }} <span class="work-count">· {{ row.books }} books</span>
      </template>
    </KitReorderList>

    <h3>KitSaveBar and useLeaveGuard</h3>
    <p class="playground-note">
      Change the name to see the bar; with a change made elsewhere, a save meets it. While the name
      is unsaved, leaving the page asks first.
    </p>
    <div class="work-form">
      <KitFormField v-slot="field" label="Branch name">
        <KitTextField v-model="branchName" v-bind="field" />
      </KitFormField>
      <KitCheckbox v-model="changedElsewhere">Someone else changed it meanwhile</KitCheckbox>
      <KitSaveBar :state="saveState" @save="save" @discard="discard" @reload="reload" />
    </div>

    <h3>KitPasskeyList</h3>
    <p class="playground-note">
      The playground plays the server, so Add asks no browser; Rename asks for the name, and Remove
      asks first.
    </p>
    <KitPasskeyList
      :passkeys="passkeys"
      label="Your passkeys"
      @add="addPasskey"
      @rename="renamePasskey"
      @remove="removePasskey"
    />
  </KitPagePanel>
</template>

<style scoped>
.work-pair {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 20rem), 1fr));
  gap: var(--kit-space-lg);
  align-items: start;
}

.work-fields,
.work-form {
  display: grid;
  gap: var(--kit-space-md);
}

.work-stored {
  min-width: 0;
  margin: 0;
}

.work-stored figcaption {
  margin-block-end: var(--kit-space-2xs);
  font-weight: var(--kit-font-weight-strong);
}

.work-stored pre {
  margin: 0;
  padding: var(--kit-space-xs) var(--kit-space-sm);
  overflow-x: auto;
  border-radius: var(--kit-radius-md);
  background: var(--kit-surface-sunken);
  font-family: var(--kit-font-code);
  font-size: var(--kit-text-size-sm);
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

.work-count {
  color: var(--kit-text-muted);
}
</style>
