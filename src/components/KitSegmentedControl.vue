<script setup lang="ts" generic="T extends string | number">
// A choice of one from two to five short options, all in view at once, as a row of joined
// buttons, inside a `group` KitFormField, whose caption names it. The arrow keys move between
// the options and Space or Enter chooses one; it always holds a value, so choosing the chosen
// one again changes nothing. The chosen option is filled and bold, so it never rests on color
// alone. An option's icon, from the app's own set, comes from the `icon` slot, given the option.
// A longer list, or one that may be empty, is a KitSelect.
//
// Given `multiple`, several may be chosen at once, each pressed on and off, and the model is the
// list chosen, in the options' order; it may be empty. Longer words, or more than five options,
// are a KitCheckboxGroup.
import { ToggleGroupItem, ToggleGroupRoot } from 'reka-ui'
import { filled } from './slots'

/** One option: its value, and the words on its button. */
export interface KitSegmentOption<V extends string | number = string> {
  value: V
  label: string
  disabled?: boolean
}

const props = withDefaults(
  defineProps<{
    options: KitSegmentOption<T>[]
    id?: string
    /** The caption's id, which names the group: from a `group` KitFormField. */
    labelledBy?: string
    /** The ids of the text that describes the group: its error and hint, from KitFormField. */
    describedBy?: string
    invalid?: boolean
    disabled?: boolean
    /** Whether several may be chosen at once, the model then the list of them. */
    multiple?: boolean
  }>(),
  {
    id: undefined,
    labelledBy: undefined,
    describedBy: undefined,
    invalid: false,
    disabled: false,
    multiple: false,
  },
)

const model = defineModel<T | T[]>({ required: true })

defineSlots<{
  icon?: (props: { option: KitSegmentOption<T> }) => unknown
}>()

// A bare ToggleGroup lets the chosen option be pressed off, leaving nothing chosen; a segmented
// control always holds one, so only an update naming one of the options is taken.
function choose(value: unknown): void {
  if (props.multiple) {
    const chosen = new Set(Array.isArray(value) ? value : [])
    model.value = props.options.filter((o) => chosen.has(o.value)).map((o) => o.value)
    return
  }
  const option = props.options.find((candidate) => candidate.value === value)
  if (option) {
    model.value = option.value
  }
}
</script>

<template>
  <ToggleGroupRoot
    :id="id"
    :type="multiple ? 'multiple' : 'single'"
    class="kit-segmented-control"
    :class="{ 'is-invalid': invalid }"
    :model-value="model"
    :disabled="disabled"
    :aria-labelledby="labelledBy"
    :aria-describedby="describedBy"
    @update:model-value="choose"
  >
    <ToggleGroupItem
      v-for="option in options"
      :key="option.value"
      :value="option.value"
      :disabled="option.disabled"
      class="kit-segmented-control__option"
    >
      <span
        v-if="filled($slots.icon, { option })"
        class="kit-segmented-control__icon"
        aria-hidden="true"
      >
        <slot name="icon" :option="option" />
      </span>
      {{ option.label }}
    </ToggleGroupItem>
  </ToggleGroupRoot>
</template>

<style scoped>
/*
 * The options join into one row. A chosen option is filled with the accent and bold; a hover on
 * another moves its fill 15% toward the text color, as a KitButton's does, which contrast.ts
 * measures with the buttons' hovers.
 */
@layer kit {
  .kit-segmented-control {
    display: inline-flex;
    flex-wrap: wrap;
    max-width: 100%;
  }

  .kit-segmented-control__option {
    box-sizing: border-box;
    display: inline-flex;
    flex: 1 1 auto;
    align-items: center;
    justify-content: center;
    gap: var(--kit-space-xs);
    min-width: var(--kit-control-height);
    min-height: var(--kit-control-height);
    margin-inline-start: calc(-1 * var(--kit-control-border-width));
    padding: var(--kit-space-xs) var(--kit-space-md);
    border: var(--kit-control-border-width) solid var(--kit-control-border);
    background: var(--kit-surface-raised);
    color: var(--kit-text);
    font: inherit;
    line-height: var(--kit-line-height-heading);
    cursor: pointer;
    transition: background-color var(--kit-duration-quick) ease;
  }

  .kit-segmented-control__option:first-child {
    margin-inline-start: 0;
    border-start-start-radius: var(--kit-radius-md);
    border-end-start-radius: var(--kit-radius-md);
  }

  .kit-segmented-control__option:last-child {
    border-start-end-radius: var(--kit-radius-md);
    border-end-end-radius: var(--kit-radius-md);
  }

  .kit-segmented-control__option:focus-visible {
    position: relative;
    z-index: 1;
    outline: var(--kit-focus-ring-width) solid var(--kit-focus-ring);
    outline-offset: var(--kit-focus-ring-offset);
  }

  .kit-segmented-control__option:disabled {
    cursor: not-allowed;
    opacity: 0.6;
  }

  .kit-segmented-control__option[data-state='on'] {
    position: relative;
    border-color: var(--kit-accent);
    background: var(--kit-accent);
    color: var(--kit-on-accent);
    font-weight: var(--kit-font-weight-strong);
  }

  .kit-segmented-control__option:hover:not(:disabled, [data-state='on']) {
    background: color-mix(in srgb, var(--kit-surface-raised) 85%, var(--kit-text));
  }

  .kit-segmented-control.is-invalid .kit-segmented-control__option {
    border-color: var(--kit-danger);
  }

  .kit-segmented-control__icon {
    display: inline-flex;
  }

  @media (prefers-reduced-motion: reduce) {
    .kit-segmented-control__option {
      transition: none;
    }
  }
}
</style>
