<script setup lang="ts" generic="O extends KitSelectOption">
// A choice of one from a short, fixed list, inside a KitFormField. The model is the chosen
// option's own value, never its label. A longer list, or one a person would rather type into, is
// a KitCombobox. The closed select is a button its label names; Space, Enter or the arrow keys
// open the list, the arrows move through it, Enter or Space picks, and Escape closes it without
// a change. The list opens over the page, so its styles are the global option-list ones.
// Options with a `group` sit under its heading, in the order they come. Any other attribute, such
// as an `aria-label` where no field's label names it, goes on the button: Reka's root draws
// nothing to carry it.
import { computed } from 'vue'
import {
  SelectContent,
  SelectGroup,
  SelectIcon,
  SelectItem,
  SelectItemIndicator,
  SelectItemText,
  SelectLabel,
  SelectPortal,
  SelectRoot,
  SelectTrigger,
  SelectValue,
  SelectViewport,
} from 'reka-ui'
import KitGlyph from './KitGlyph.vue'
import { byHeading } from './options'
import type { KitSelectOption } from './options'

const props = withDefaults(
  defineProps<{
    options: O[]
    id?: string
    /** The ids of the text that describes the select: its error and hint, from KitFormField. */
    describedBy?: string
    invalid?: boolean
    /** What the closed select says while nothing is chosen. */
    placeholder?: string
    disabled?: boolean
  }>(),
  {
    id: undefined,
    describedBy: undefined,
    invalid: false,
    placeholder: 'Choose one',
    disabled: false,
  },
)

defineOptions({ inheritAttrs: false })

const model = defineModel<O['value']>()

defineSlots<{
  /** The icon that shows the select opens; a drawn chevron by default. */
  chevron?: () => unknown
  /** The mark beside the chosen option; a drawn check by default. */
  check?: () => unknown
}>()

const runs = computed(() => byHeading(props.options))
</script>

<template>
  <SelectRoot v-model="model" :disabled="disabled">
    <SelectTrigger
      v-bind="$attrs"
      :id="id"
      class="kit-select"
      :class="{ 'is-invalid': invalid }"
      :aria-describedby="describedBy"
      :aria-invalid="invalid || undefined"
    >
      <SelectValue class="kit-select__value" :placeholder="placeholder" />
      <SelectIcon class="kit-select__icon">
        <slot name="chevron"><KitGlyph name="chevron" /></slot>
      </SelectIcon>
    </SelectTrigger>
    <SelectPortal>
      <SelectContent class="kit-option-list" position="popper" :side-offset="4">
        <SelectViewport class="kit-option-list__viewport">
          <SelectGroup v-for="run in runs" :key="run.heading ?? ''" class="kit-option-list__group">
            <SelectLabel v-if="run.heading" class="kit-option-list__group-label">
              {{ run.heading }}
            </SelectLabel>
            <SelectItem
              v-for="option in run.options"
              :key="option.value"
              :value="option.value"
              :disabled="option.disabled"
              class="kit-option-list__item"
            >
              <SelectItemIndicator class="kit-option-list__check">
                <slot name="check"><KitGlyph name="check" /></slot>
              </SelectItemIndicator>
              <SelectItemText>{{ option.label }}</SelectItemText>
            </SelectItem>
          </SelectGroup>
        </SelectViewport>
      </SelectContent>
    </SelectPortal>
  </SelectRoot>
</template>

<style scoped>
@layer kit {
  .kit-select {
    box-sizing: border-box;
    display: inline-flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--kit-space-xs);
    width: 100%;
    min-width: 0;
    min-height: var(--kit-control-height);
    padding: var(--kit-space-xs) var(--kit-space-sm);
    border: var(--kit-control-border-width) solid var(--kit-control-border);
    border-radius: var(--kit-radius-md);
    background: var(--kit-surface-raised);
    color: var(--kit-text);
    font: inherit;
    text-align: start;
    cursor: pointer;
  }

  .kit-select:focus-visible {
    outline: var(--kit-focus-ring-width) solid var(--kit-focus-ring);
    outline-offset: var(--kit-focus-ring-offset);
  }

  .kit-select.is-invalid {
    border-color: var(--kit-danger);
    box-shadow: inset 0 0 0 1px var(--kit-danger);
  }

  .kit-select:disabled {
    cursor: not-allowed;
    opacity: 0.6;
  }

  .kit-select__value {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .kit-select[data-placeholder] .kit-select__value {
    color: var(--kit-text-muted);
  }

  .kit-select__icon {
    display: inline-flex;
    flex: none;
  }
}
</style>
