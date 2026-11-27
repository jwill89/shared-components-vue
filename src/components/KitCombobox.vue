<script setup lang="ts" generic="O extends KitComboboxOption">
// A choice from a list long enough to search, inside a KitFormField: typing narrows the list,
// the arrow keys move through it, Enter picks. Options with a `group` sit under its heading, in
// the order they come. With `multiple`, the model is an array and each choice shows as a chip
// below the box with its own Remove button; otherwise it is one value, or null, and `clearable`
// adds a Clear button. The model is always the options' own values.
//
// Given `search`, the app runs the search: the combobox emits `search` with what was typed and
// shows the options the app hands back as they are, saying `loadingText` while `loading`. It
// remembers each option chosen, so a chip keeps its words when the app's results no longer hold
// it. With `multiple`, `max` is the most that may be chosen: a line under the box counts them,
// and once it is reached, the options not chosen can't be.
//
// There is no button inside an option: an option takes no focus of its own, so a key could
// never reach one, and axe refuses an interactive element inside another. An action on an option
// (a favourite) belongs where the option is shown once it is chosen.
//
// The `option` and `chip` slots draw an option's content (a role's color, a channel's kind); the
// icons come from the `chevron`, `check`, `clear-icon` and `remove-icon` slots, drawn by the kit
// when the app gives none. The list opens over the page, so its styles are the global
// option-list ones, and the chips are drawn as KitTagInput's are, from chips.css.
import { computed, nextTick, ref, useId, useTemplateRef, watch } from 'vue'
import {
  ComboboxAnchor,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxGroup,
  ComboboxInput,
  ComboboxItem,
  ComboboxItemIndicator,
  ComboboxLabel,
  ComboboxPortal,
  ComboboxRoot,
  ComboboxTrigger,
  ComboboxViewport,
} from 'reka-ui'
import KitGlyph from './KitGlyph.vue'
import KitIconButton from './KitIconButton.vue'
import type { KitComboboxOption } from './options'

const props = withDefaults(
  defineProps<{
    options: O[]
    multiple?: boolean
    /** Whether "nothing" is an answer to a single choice, which a Clear button gives. */
    clearable?: boolean
    id?: string
    /** The ids of the text that describes the box: its error and hint, from KitFormField. */
    describedBy?: string
    invalid?: boolean
    placeholder?: string
    /** What the list says when nothing matches what was typed. */
    emptyText?: string
    disabled?: boolean
    /** Whether the app runs the search, from the `search` event, rather than the list. */
    search?: boolean
    /** Whether the app's search is running. */
    loading?: boolean
    /** What the list says while the app's search runs. */
    loadingText?: string
    /** The most that may be chosen, with `multiple`. */
    max?: number
  }>(),
  {
    multiple: false,
    clearable: false,
    id: undefined,
    describedBy: undefined,
    invalid: false,
    placeholder: 'Type to search',
    emptyText: 'Nothing matches',
    disabled: false,
    search: false,
    loading: false,
    loadingText: 'Searching…',
    max: Infinity,
  },
)

const emit = defineEmits<{
  /** What was typed, for the app's own search: with `search`. */
  search: [text: string]
}>()

const model = defineModel<O['value'] | O['value'][] | null>({ default: null })

defineSlots<{
  /** An option's content in the list; its label by default. */
  option?: (props: { option: O }) => unknown
  /** A chosen option's content in its chip; its label by default. */
  chip?: (props: { option: O }) => unknown
  chevron?: () => unknown
  check?: () => unknown
  'clear-icon'?: () => unknown
  'remove-icon'?: () => unknown
}>()

const groups = computed(() => {
  const byName = new Map<string, O[]>()
  for (const option of props.options) {
    const name = option.group ?? ''
    byName.set(name, [...(byName.get(name) ?? []), option])
  }
  return [...byName].map(([name, options]) => ({ name, options }))
})

// Every option the list has held, by value, so a choice keeps its words after the app's search
// has moved on from it.
const known = new Map<O['value'], O>()
watch(
  () => props.options,
  (options) => {
    for (const option of options) {
      known.set(option.value, option)
    }
  },
  { immediate: true },
)

function optionOf(value: unknown): O | undefined {
  return props.options.find((option) => option.value === value) ?? known.get(value as O['value'])
}

function labelOf(value: unknown): string {
  return optionOf(value)?.label ?? ''
}

// The values chosen when several may be: the chips' values, in the order they were chosen.
const values = computed(() => (Array.isArray(model.value) ? model.value : []))
const chosen = computed(() =>
  values.value.flatMap((value) => {
    const option = optionOf(value)
    return option ? [option] : []
  }),
)

// With a most to choose, a line counts the choices, and an option not chosen can't be once the
// most is reached.
const limited = computed(() => props.multiple && Number.isFinite(props.max))
const full = computed(() => limited.value && values.value.length >= props.max)
const countId = `${useId()}-count`
const describedByAll = computed(
  () => [props.describedBy, limited.value ? countId : ''].filter(Boolean).join(' ') || undefined,
)

function blocked(option: O): boolean {
  return Boolean(option.disabled) || (full.value && !values.value.includes(option.value))
}

const hasValue = computed(() => model.value !== null && !Array.isArray(model.value))

// The box names the option highlighted in the open list as its active descendant. Reka's own
// keeps naming the option it last highlighted after typing has filtered that option away or the
// list has closed, which leaves the attribute pointing at nothing; so the box tracks the
// highlight itself, and as the person types the first match takes the highlight.
const root = useTemplateRef<{ highlightFirstItem?: () => void }>('root')
const open = ref(false)
const highlightedId = ref<string>()
const activeDescendant = computed(() => (open.value ? highlightedId.value : undefined))

function highlighted(payload: { ref: HTMLElement } | undefined): void {
  highlightedId.value = payload?.ref.id
}

function searched(text: string): void {
  if (props.search) {
    emit('search', text)
  }
  void nextTick(() => {
    root.value?.highlightFirstItem?.()
    if (highlightedId.value && !document.getElementById(highlightedId.value)) {
      highlightedId.value = undefined
    }
  })
}

function remove(value: O['value']): void {
  model.value = values.value.filter((v) => v !== value)
}
</script>

<template>
  <div class="kit-combobox">
    <ComboboxRoot
      ref="root"
      v-model="model"
      v-model:open="open"
      class="kit-combobox__root"
      :multiple="multiple"
      :disabled="disabled"
      :ignore-filter="search"
      open-on-click
      @highlight="highlighted"
    >
      <ComboboxAnchor class="kit-combobox__box" :class="{ 'is-invalid': invalid }">
        <ComboboxInput
          :id="id"
          class="kit-combobox__input"
          :placeholder="placeholder"
          :display-value="multiple ? undefined : labelOf"
          :aria-describedby="describedByAll"
          :aria-invalid="invalid || undefined"
          :aria-activedescendant="activeDescendant"
          @update:model-value="searched"
        />
        <KitIconButton
          v-if="clearable && !multiple && hasValue && !disabled"
          label="Clear"
          variant="plain"
          class="kit-combobox__clear"
          @click="model = null"
        >
          <slot name="clear-icon"><KitGlyph name="cross" /></slot>
        </KitIconButton>
        <ComboboxTrigger class="kit-combobox__trigger" aria-label="Show the choices">
          <slot name="chevron"><KitGlyph name="chevron" /></slot>
        </ComboboxTrigger>
      </ComboboxAnchor>
      <ComboboxPortal>
        <ComboboxContent class="kit-option-list" position="popper" :side-offset="4">
          <ComboboxViewport class="kit-option-list__viewport">
            <div v-if="search && loading" class="kit-option-list__empty" role="status">
              {{ loadingText }}
            </div>
            <ComboboxEmpty v-else class="kit-option-list__empty">{{ emptyText }}</ComboboxEmpty>
            <ComboboxGroup v-for="group in groups" :key="group.name" class="kit-option-list__group">
              <ComboboxLabel v-if="group.name" class="kit-option-list__group-label">
                {{ group.name }}
              </ComboboxLabel>
              <ComboboxItem
                v-for="option in group.options"
                :key="option.value"
                :value="option.value"
                :text-value="option.label"
                :disabled="blocked(option)"
                class="kit-option-list__item"
              >
                <ComboboxItemIndicator class="kit-option-list__check">
                  <slot name="check"><KitGlyph name="check" /></slot>
                </ComboboxItemIndicator>
                <slot name="option" :option="option">{{ option.label }}</slot>
              </ComboboxItem>
            </ComboboxGroup>
          </ComboboxViewport>
        </ComboboxContent>
      </ComboboxPortal>
    </ComboboxRoot>
    <p v-if="limited" :id="countId" class="kit-combobox__count">
      {{ values.length }} of {{ max }} chosen{{ full ? '; remove one to choose another' : '' }}
    </p>
    <ul v-if="chosen.length" class="kit-chips">
      <li v-for="option in chosen" :key="option.value" class="kit-chip">
        <span class="kit-chip__label">
          <slot name="chip" :option="option">{{ option.label }}</slot>
        </span>
        <KitIconButton
          :label="`Remove ${option.label}`"
          variant="plain"
          class="kit-combobox__remove"
          :disabled="disabled"
          @click="remove(option.value)"
        >
          <slot name="remove-icon"><KitGlyph name="cross" /></slot>
        </KitIconButton>
      </li>
    </ul>
  </div>
</template>

<style scoped>
@layer kit {
  .kit-combobox {
    display: flex;
    flex-direction: column;
    gap: var(--kit-space-xs);
    min-width: 0;
  }

  .kit-combobox__box {
    box-sizing: border-box;
    display: flex;
    align-items: center;
    min-width: 0;
    min-height: var(--kit-control-height);
    border: var(--kit-control-border-width) solid var(--kit-control-border);
    border-radius: var(--kit-radius-md);
    background: var(--kit-surface-raised);
    color: var(--kit-text);
  }

  /* The box draws the ring for the input and its buttons together. */
  .kit-combobox__box:focus-within {
    outline: var(--kit-focus-ring-width) solid var(--kit-focus-ring);
    outline-offset: var(--kit-focus-ring-offset);
  }

  .kit-combobox__box.is-invalid {
    border-color: var(--kit-danger);
    box-shadow: inset 0 0 0 1px var(--kit-danger);
  }

  .kit-combobox__input {
    box-sizing: border-box;
    flex: 1;
    width: 100%;
    min-width: 0;
    min-height: calc(var(--kit-control-height) - 2 * var(--kit-control-border-width));
    padding: var(--kit-space-xs) var(--kit-space-sm);
    border: 0;
    border-radius: var(--kit-radius-md);
    background: transparent;
    color: inherit;
    font: inherit;
  }

  .kit-combobox__input::placeholder {
    color: var(--kit-text-muted);
    opacity: 1;
  }

  .kit-combobox__input:focus-visible {
    outline: none;
  }

  .kit-combobox__input:disabled {
    cursor: not-allowed;
    opacity: 0.6;
  }

  .kit-combobox__count {
    margin: 0;
    color: var(--kit-text-muted);
    font-size: var(--kit-text-size-sm);
  }

  .kit-combobox__trigger {
    display: inline-flex;
    flex: none;
    align-items: center;
    align-self: stretch;
    justify-content: center;
    width: var(--kit-control-height);
    padding: 0;
    border: 0;
    background: transparent;
    color: inherit;
    cursor: pointer;
  }
}
</style>
