<script setup lang="ts">
// Short words a person types in, a reading's tags say, inside a KitFormField. Enter or a comma
// adds what was typed, and so does leaving the box; a pasted list adds each of its words. Each tag
// shows as a chip below the box, as a KitCombobox's choices do, with its own Remove button; in the
// empty box Backspace marks the last chip and a second Backspace removes it, and the arrow keys
// move between chips. `normalize` turns what was typed into the tag as the app keeps it ("Career"
// into "career"), and a tag that comes out empty, or as one already there, is dropped.
//
// `suggestions`, most likely first, show under the chips as buttons that add one with a press,
// narrowed to those holding what is typed. `want-suggestions` is emitted when the box takes
// focus, for an app to fetch them then rather than with the page.
import { computed, ref, useId, useTemplateRef } from 'vue'
import { TagsInputInput, TagsInputItem, TagsInputItemText, TagsInputRoot } from 'reka-ui'
import KitButton from './KitButton.vue'
import KitGlyph from './KitGlyph.vue'
import KitIconButton from './KitIconButton.vue'

const props = withDefaults(
  defineProps<{
    id?: string
    /** The ids of the text that describes the box: its error and hint, from KitFormField. */
    describedBy?: string
    invalid?: boolean
    /** The most tags it holds; no limit by default. */
    max?: number
    /** The most characters one tag may have. */
    maxLength?: number
    /** What was typed, as the tag the app keeps; trimmed by default. */
    normalize?: (typed: string) => string
    /** Tags to offer, most likely first. */
    suggestions?: string[]
    /** How many suggestions show at once. */
    suggestionLimit?: number
    /** What the suggestions are, in words, ahead of them. */
    suggestionsLabel?: string
    placeholder?: string
    disabled?: boolean
  }>(),
  {
    id: undefined,
    describedBy: undefined,
    invalid: false,
    max: 0,
    maxLength: undefined,
    normalize: (typed: string) => typed.trim(),
    suggestions: () => [],
    suggestionLimit: 6,
    suggestionsLabel: 'Suggestions',
    placeholder: undefined,
    disabled: false,
  },
)

const emit = defineEmits<{
  /** The box took focus: the time to fetch suggestions. */
  wantSuggestions: []
}>()

const model = defineModel<string[]>({ required: true })

defineSlots<{
  'remove-icon'?: () => unknown
  'add-icon'?: () => unknown
}>()

const draft = ref('')
const input = useTemplateRef<{ $el: HTMLInputElement }>('input')
const suggestionsId = useId()

// What Reka adds can still hold commas (text added whole, on leaving the box), so it is split
// there, each piece normalized, and what comes out empty or twice dropped.
const tags = computed<string[]>({
  get: () => model.value,
  set: (value) => {
    const pieces = value.flatMap((tag) => tag.split(',')).map((tag) => props.normalize(tag))
    model.value = [...new Set(pieces.filter((tag) => tag !== ''))]
  },
})

const full = computed(() => props.max > 0 && model.value.length >= props.max)

const offered = computed(() => {
  if (props.disabled || full.value) {
    return []
  }
  const typed = props.normalize(draft.value).toLowerCase()
  return props.suggestions
    .filter((tag) => !model.value.includes(tag) && tag.toLowerCase().includes(typed))
    .slice(0, props.suggestionLimit)
})

function typed(event: Event): void {
  draft.value = (event.target as HTMLInputElement).value
}

function add(tag: string): void {
  tags.value = [...model.value, tag]
  draft.value = ''
  const box = input.value?.$el
  if (box) {
    box.value = ''
    box.focus()
  }
}

function remove(tag: string): void {
  model.value = model.value.filter((kept) => kept !== tag)
}
</script>

<template>
  <TagsInputRoot
    :id="id"
    v-model="tags"
    class="kit-tag-input"
    :max="max"
    :disabled="disabled"
    add-on-paste
    add-on-blur
    @add-tag="draft = ''"
  >
    <div class="kit-tag-input__box" :class="{ 'is-invalid': invalid }">
      <TagsInputInput
        ref="input"
        class="kit-tag-input__input"
        :placeholder="placeholder"
        :max-length="maxLength"
        :aria-describedby="describedBy"
        :aria-invalid="invalid || undefined"
        @input="typed"
        @focus="emit('wantSuggestions')"
      />
    </div>
    <ul v-if="tags.length" class="kit-chips">
      <TagsInputItem v-for="tag in tags" :key="tag" :value="tag" as="li" class="kit-chip">
        <TagsInputItemText class="kit-chip__label" />
        <KitIconButton
          :label="`Remove ${tag}`"
          variant="plain"
          :disabled="disabled"
          @click="remove(tag)"
        >
          <slot name="remove-icon"><KitGlyph name="cross" /></slot>
        </KitIconButton>
      </TagsInputItem>
    </ul>
    <div
      v-if="offered.length"
      class="kit-tag-input__suggestions"
      role="group"
      :aria-labelledby="suggestionsId"
    >
      <span :id="suggestionsId" class="kit-tag-input__suggestions-label">
        {{ suggestionsLabel }}
      </span>
      <KitButton
        v-for="tag in offered"
        :key="tag"
        variant="quiet"
        :aria-label="`Add ${tag}`"
        @click="add(tag)"
      >
        <template #icon
          ><slot name="add-icon"><KitGlyph name="plus" /></slot
        ></template>
        {{ tag }}
      </KitButton>
    </div>
  </TagsInputRoot>
</template>

<style scoped>
@layer kit {
  .kit-tag-input {
    display: flex;
    flex-direction: column;
    gap: var(--kit-space-xs);
    min-width: 0;
  }

  .kit-tag-input__box {
    box-sizing: border-box;
    display: flex;
    min-width: 0;
    min-height: var(--kit-control-height);
    border: var(--kit-control-border-width) solid var(--kit-control-border);
    border-radius: var(--kit-radius-md);
    background: var(--kit-surface-raised);
    color: var(--kit-text);
  }

  .kit-tag-input__box:focus-within {
    outline: var(--kit-focus-ring-width) solid var(--kit-focus-ring);
    outline-offset: var(--kit-focus-ring-offset);
  }

  .kit-tag-input__box.is-invalid {
    border-color: var(--kit-danger);
    box-shadow: inset 0 0 0 1px var(--kit-danger);
  }

  .kit-tag-input__input {
    box-sizing: border-box;
    flex: 1;
    width: 100%;
    min-width: 0;
    padding: var(--kit-space-xs) var(--kit-space-sm);
    border: 0;
    border-radius: var(--kit-radius-md);
    background: transparent;
    color: inherit;
    font: inherit;
  }

  .kit-tag-input__input::placeholder {
    color: var(--kit-text-muted);
    opacity: 1;
  }

  .kit-tag-input__input:focus-visible {
    outline: none;
  }

  .kit-tag-input__input:disabled {
    cursor: not-allowed;
    opacity: 0.6;
  }

  .kit-tag-input__suggestions {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--kit-space-2xs) var(--kit-space-xs);
  }

  .kit-tag-input__suggestions-label {
    color: var(--kit-text-muted);
    font-size: var(--kit-text-size-sm);
  }
}
</style>
