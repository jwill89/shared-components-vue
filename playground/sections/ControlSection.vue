<script setup lang="ts">
// The third wave's controls, each in its states: a box to tick alone and in groups, radio
// buttons with hints, a slider, files to send, a text box with words and a button joined to it,
// a password to reveal, a box that grows with its text, toggles, and a button that copies; and
// what the kit's own controls gained with them: options under headings in a select, a combobox
// whose search the page runs and one with a most to choose, several chosen at once, a color that
// may be see-through, and buttons small, large and leading to a page.
import { ref } from 'vue'
import {
  KitButton,
  KitCheckbox,
  KitCheckboxGroup,
  KitColorField,
  KitCombobox,
  KitCopyButton,
  KitFileField,
  KitFormField,
  KitIconButton,
  KitPagePanel,
  KitRadioGroup,
  KitSegmentedControl,
  KitSelect,
  KitSlider,
  KitTextField,
  KitTextarea,
} from '@jwill89/shared-components-vue'
import type {
  KitChoiceOption,
  KitComboboxOption,
  KitFileKind,
  KitSelectOption,
} from '@jwill89/shared-components-vue'
import PlaygroundIcon from '../PlaygroundIcon.vue'

const reminders = ref(true)
const agreed = ref(false)
const allFormats = ref<boolean | 'indeterminate'>('indeterminate')

const formats: KitChoiceOption<string>[] = [
  { value: 'hardback', label: 'Hardback', group: 'Print' },
  { value: 'paperback', label: 'Paperback', group: 'Print' },
  {
    value: 'ebook',
    label: 'E-book',
    group: 'Digital',
    hint: 'Lent for 14 days, then it returns itself.',
  },
  { value: 'audio', label: 'Audiobook', group: 'Digital', disabled: true },
]
const chosenFormats = ref(['paperback'])
const days = ref<string[]>([])

const conditions: KitChoiceOption<string>[] = [
  { value: 'new', label: 'As new', hint: 'No marks, the spine uncreased.' },
  { value: 'worn', label: 'Worn', hint: 'Read and loved: a creased spine, a dog-ear or two.' },
  { value: 'damaged', label: 'Damaged', hint: 'Torn pages, water marks, or a loose cover.' },
]
const condition = ref<string | null>(null)
const pace = ref<string | null>('steady')

const textSize = ref(1.2)
const percent = (value: number): string => `${String(Math.round(value * 100))}%`

const pictures: KitFileKind[] = [
  { type: 'image/png', name: 'PNG' },
  { type: 'image/jpeg', name: 'JPEG' },
  { type: 'image/webp', name: 'WebP' },
]
const cover = ref<File[]>([])
const scans = ref<File[]>([])

const price = ref('300')
const website = ref('')
const word = ref('')
const passphrase = ref('')
const letter = ref('')

const favourite = ref(false)
const pinned = ref(true)

const rooms: KitSelectOption[] = [
  { value: 'hall', label: 'Front room', group: 'Downstairs' },
  { value: 'den', label: 'Den', group: 'Downstairs' },
  { value: 'attic', label: 'Attic', group: 'Upstairs' },
  { value: 'box-room', label: 'Box room', group: 'Upstairs' },
]
const room = ref<string | number>()

// A catalogue the page searches itself, as a server would, a moment after each key.
const catalogue: KitComboboxOption[] = [
  'A Wizard of Earthsea',
  'Beloved',
  'Brave New World',
  'Dune',
  'Kindred',
  'Middlemarch',
  'Neuromancer',
  'The Left Hand of Darkness',
].map((title) => ({ value: title.toLowerCase(), label: title }))
const found = ref<KitComboboxOption[]>([])
const searching = ref(false)
const borrowed = ref<(string | number)[]>([])
let pending: ReturnType<typeof setTimeout> | undefined
function lookUp(text: string): void {
  searching.value = true
  clearTimeout(pending)
  pending = setTimeout(() => {
    const words = text.trim().toLowerCase()
    found.value = words ? catalogue.filter((book) => book.label.toLowerCase().includes(words)) : []
    searching.value = false
  }, 300)
}
const picks = ref<(string | number)[]>(['dune'])

const formatsShown = ref<string[]>(['print'])
const highlight = ref('#5865f2cc')
</script>

<template>
  <KitPagePanel id="controls" class="playground-section" title="Controls">
    <h3>KitCheckbox</h3>
    <div class="control-grid">
      <KitCheckbox v-model="reminders" hint="A day before, and on the day.">
        Email me when a loan is due back
      </KitCheckbox>
      <KitCheckbox v-model="agreed" error="Agree to the lending rules to borrow.">
        I agree to the lending rules
      </KitCheckbox>
      <KitCheckbox v-model="allFormats">Every format</KitCheckbox>
      <KitCheckbox model-value disabled>Kept on the shelf</KitCheckbox>
    </div>

    <h3>KitCheckboxGroup</h3>
    <div class="control-grid">
      <KitFormField v-slot="field" label="Formats" group hint="Each one you lend.">
        <KitCheckboxGroup v-model="chosenFormats" v-bind="field" :options="formats" />
      </KitFormField>
      <KitFormField v-slot="field" label="Opening days" group error="Choose a day.">
        <KitCheckboxGroup
          v-model="days"
          v-bind="field"
          inline
          :options="[
            { value: 'sat', label: 'Saturday' },
            { value: 'sun', label: 'Sunday' },
          ]"
        />
      </KitFormField>
    </div>

    <h3>KitRadioGroup</h3>
    <div class="control-grid">
      <KitFormField v-slot="field" label="Condition" group>
        <KitRadioGroup v-model="condition" v-bind="field" :options="conditions" />
      </KitFormField>
      <KitFormField v-slot="field" label="Reading pace" group hint="For the reminders.">
        <KitRadioGroup
          v-model="pace"
          v-bind="field"
          inline
          :options="[
            { value: 'slow', label: 'Slow' },
            { value: 'steady', label: 'Steady' },
            { value: 'fast', label: 'Fast' },
          ]"
        />
      </KitFormField>
    </div>

    <h3>KitSlider</h3>
    <div class="control-grid">
      <KitFormField
        v-slot="field"
        label="Text size"
        group
        hint="How large the catalogue’s words are."
      >
        <KitSlider
          v-model="textSize"
          v-bind="field"
          :min="0.8"
          :max="2"
          :step="0.1"
          :value-text="percent"
        />
      </KitFormField>
      <KitFormField v-slot="field" label="Shelf height" group hint="Set by the joiner.">
        <KitSlider :model-value="180" v-bind="field" :min="100" :max="240" disabled />
      </KitFormField>
    </div>

    <h3>KitFileField</h3>
    <div class="control-grid">
      <KitFormField v-slot="field" label="Cover picture" group>
        <KitFileField
          v-model="cover"
          v-bind="field"
          :accept="pictures"
          :max-size="10 * 1024 * 1024"
          previews
        />
      </KitFormField>
      <KitFormField v-slot="field" label="Scans of the pages" group>
        <KitFileField
          v-model="scans"
          v-bind="field"
          :accept="[...pictures, { type: 'application/pdf', name: 'PDF' }]"
          :max-size="25 * 1024 * 1024"
          multiple
          :max-files="4"
          drop
        />
      </KitFormField>
    </div>

    <h3>KitTextField with places, a button and a password</h3>
    <div class="control-grid">
      <KitFormField v-slot="field" label="Price" hint="What a late return costs.">
        <KitTextField v-model="price" v-bind="field" inputmode="decimal">
          <template #after>gil</template>
        </KitTextField>
      </KitFormField>
      <KitFormField v-slot="field" label="Website">
        <KitTextField v-model="website" v-bind="field" type="url" inputmode="url">
          <template #before>https://</template>
        </KitTextField>
      </KitFormField>
      <KitFormField v-slot="field" label="Find a word">
        <KitTextField v-model="word" v-bind="field">
          <template #button>
            <KitButton variant="primary">Go</KitButton>
          </template>
        </KitTextField>
      </KitFormField>
      <KitFormField v-slot="field" label="Password" hint="At least 12 characters.">
        <KitTextField
          v-model="passphrase"
          v-bind="field"
          type="password"
          autocomplete="new-password"
          revealable
        />
      </KitFormField>
    </div>

    <h3>KitTextarea that grows</h3>
    <KitFormField
      v-slot="field"
      label="Letter to the reader"
      hint="Grows to 8 lines, then scrolls."
    >
      <KitTextarea v-model="letter" v-bind="field" grow :rows="2" :max-rows="8" />
    </KitFormField>

    <h3>KitSelect under headings, and KitCombobox searched by the page</h3>
    <div class="control-grid">
      <KitFormField v-slot="field" label="Reading room">
        <KitSelect v-model="room" v-bind="field" :options="rooms" />
      </KitFormField>
      <KitFormField v-slot="field" label="Books to borrow" hint="Type part of a title.">
        <KitCombobox
          v-model="borrowed"
          v-bind="field"
          :options="found"
          multiple
          search
          :loading="searching"
          @search="lookUp"
        />
      </KitFormField>
      <KitFormField v-slot="field" label="Reading group picks">
        <KitCombobox v-model="picks" v-bind="field" :options="catalogue" multiple :max="3" />
      </KitFormField>
    </div>

    <h3>Several at once, and a see-through color</h3>
    <div class="control-grid">
      <KitFormField v-slot="field" label="Formats offered" group>
        <KitSegmentedControl
          v-model="formatsShown"
          v-bind="field"
          multiple
          :options="[
            { value: 'print', label: 'Print' },
            { value: 'digital', label: 'Digital' },
            { value: 'audio', label: 'Audio' },
          ]"
        />
      </KitFormField>
      <KitFormField v-slot="field" label="Highlight">
        <KitColorField v-model="highlight" v-bind="field" alpha />
      </KitFormField>
    </div>

    <h3>Button sizes, and a button that leads to a page</h3>
    <div class="control-row">
      <KitButton size="small">Edit the loan</KitButton>
      <KitButton size="small" variant="quiet">Mark returned</KitButton>
      <KitIconButton label="Delete the loan" size="small" variant="plain">
        <PlaygroundIcon name="trash" />
      </KitIconButton>
      <KitButton size="large" variant="primary">Serve</KitButton>
      <KitButton to="#content">To the content</KitButton>
    </div>

    <h3>Toggles and copying</h3>
    <div class="control-row">
      <KitButton :pressed="favourite" @click="favourite = !favourite">Favourite</KitButton>
      <KitIconButton
        label="Pin to the top"
        variant="plain"
        :pressed="pinned"
        @click="pinned = !pinned"
      >
        <PlaygroundIcon name="arrow" />
      </KitIconButton>
      <KitCopyButton text="823.7 AUS">Copy the call number</KitCopyButton>
    </div>
  </KitPagePanel>
</template>

<style scoped>
.control-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 18rem), 1fr));
  gap: var(--kit-space-md);
  align-items: start;
}

.control-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--kit-space-sm);
}
</style>
