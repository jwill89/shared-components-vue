<script setup lang="ts">
// A number box with a button either side to step it, inside a KitFormField. The arrow keys
// step it too, Page Up and Page Down by ten steps, and Home and End jump to `min` and `max`.
// An empty box is undefined. The step buttons stay out of the tab order, since the keys do
// their work, and read as "Decrease" and "Increase"; their icons are the `decrease` and
// `increase` slots, a drawn minus and plus by default. The number is written in the locale
// Reka UI's ConfigProvider sets, where the app mounts one, grouped by thousands unless
// `formatOptions` says otherwise: `{ useGrouping: false }` for a year or an id,
// `{ style: 'percent' }` or a currency for an amount.
import {
  NumberFieldDecrement,
  NumberFieldIncrement,
  NumberFieldInput,
  NumberFieldRoot,
} from 'reka-ui'

withDefaults(
  defineProps<{
    id?: string
    /** The ids of the text that describes the box: its error and hint, from KitFormField. */
    describedBy?: string
    invalid?: boolean
    min?: number
    max?: number
    step?: number
    disabled?: boolean
    /** How the number is written, as Intl.NumberFormat takes it. */
    formatOptions?: Intl.NumberFormatOptions
  }>(),
  {
    id: undefined,
    describedBy: undefined,
    invalid: false,
    min: undefined,
    max: undefined,
    step: 1,
    disabled: false,
    formatOptions: undefined,
  },
)

const model = defineModel<number | undefined>()

defineSlots<{
  decrease?: () => unknown
  increase?: () => unknown
}>()
</script>

<template>
  <NumberFieldRoot
    :id="id"
    v-model="model"
    class="kit-number-field"
    :class="{ 'is-invalid': invalid }"
    :min="min"
    :max="max"
    :step="step"
    :disabled="disabled"
    :format-options="formatOptions"
  >
    <NumberFieldDecrement class="kit-number-field__step">
      <slot name="decrease"><span aria-hidden="true">−</span></slot>
    </NumberFieldDecrement>
    <NumberFieldInput
      class="kit-number-field__input"
      :aria-describedby="describedBy"
      :aria-invalid="invalid || undefined"
    />
    <NumberFieldIncrement class="kit-number-field__step">
      <slot name="increase"><span aria-hidden="true">+</span></slot>
    </NumberFieldIncrement>
  </NumberFieldRoot>
</template>

<style scoped>
@layer kit {
  .kit-number-field {
    display: flex;
    width: 100%;
    max-width: var(--kit-width-number-field);
    min-width: 0;
    min-height: var(--kit-control-height);
    border: var(--kit-control-border-width) solid var(--kit-control-border);
    border-radius: var(--kit-radius-md);
    background: var(--kit-surface-raised);
    color: var(--kit-text);
  }

  /* The ring goes round the whole box, buttons and all, while the number has focus. */
  .kit-number-field:focus-within {
    outline: var(--kit-focus-ring-width) solid var(--kit-focus-ring);
    outline-offset: var(--kit-focus-ring-offset);
  }

  .kit-number-field.is-invalid {
    border-color: var(--kit-danger);
    box-shadow: inset 0 0 0 1px var(--kit-danger);
  }

  .kit-number-field[data-disabled] {
    opacity: 0.6;
  }

  .kit-number-field__input {
    flex: 1;
    width: 100%;
    min-width: 0;
    padding: var(--kit-space-xs);
    border: 0;
    background: transparent;
    color: inherit;
    font: inherit;
    font-variant-numeric: tabular-nums;
    text-align: center;
  }

  .kit-number-field__input:focus {
    outline: none;
  }

  .kit-number-field__step {
    display: inline-flex;
    flex: none;
    align-items: center;
    justify-content: center;
    width: var(--kit-control-height);
    border: 0;
    background: var(--kit-surface-sunken);
    color: inherit;
    font: inherit;
    font-size: var(--kit-text-size-lg);
    line-height: 1;
    cursor: pointer;
  }

  .kit-number-field__step:first-child {
    border-start-start-radius: var(--kit-radius-md);
    border-end-start-radius: var(--kit-radius-md);
  }

  .kit-number-field__step:last-child {
    border-start-end-radius: var(--kit-radius-md);
    border-end-end-radius: var(--kit-radius-md);
  }

  .kit-number-field__step:disabled {
    cursor: not-allowed;
  }
}
</style>
