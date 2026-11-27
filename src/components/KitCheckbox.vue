<script setup lang="ts">
// A box to tick, its words beside it as its label: `<KitCheckbox v-model="agreed">I've read the
// rules</KitCheckbox>`. A lone box is a field of its own, so it takes its `hint` and `error`
// itself, under its words and read with it, rather than sitting in a KitFormField, whose label
// would name it a second time. Several boxes that answer one question are a KitCheckboxGroup,
// which draws these.
//
// A click on the box or on its words ticks it, and so does Space. A box partly ticked
// (`'indeterminate'`), as one that stands for several is while only some of them are, shows a
// dash, and a press ticks it whole. Ticked, the box fills and shows a check, so its state never
// rests on color alone. Its press area is 44 px around the drawn box, and its words widen it.
import { computed, useId } from 'vue'
import { CheckboxIndicator, CheckboxRoot } from 'reka-ui'
import KitGlyph from './KitGlyph.vue'
import { filled } from './slots'

const props = withDefaults(
  defineProps<{
    id?: string
    /** The ids of other text that describes the box, read after its own error and hint. */
    describedBy?: string
    invalid?: boolean
    disabled?: boolean
    /** A line under its words on what ticking it means. */
    hint?: string
    /** What is wrong, shown under its words and read with it. */
    error?: string
    /** In a KitCheckboxGroup, what it adds to the group's list while ticked. */
    value?: string | number
  }>(),
  {
    id: undefined,
    describedBy: undefined,
    invalid: false,
    disabled: false,
    hint: undefined,
    error: undefined,
    value: 'on',
  },
)

const model = defineModel<boolean | 'indeterminate'>({ default: false })

const slots = defineSlots<{
  /** Its words, which name it. */
  default?: () => unknown
  /** The hint, when it needs markup, such as a link. */
  hint?: () => unknown
}>()

const madeId = useId()
const boxId = computed(() => props.id ?? madeId)
const labelId = computed(() => `${boxId.value}-label`)
const errorId = computed(() => `${boxId.value}-error`)
const hintId = computed(() => `${boxId.value}-hint`)

/** Whether there is a hint to show. Read at each render, since a slot's presence isn't reactive. */
function hasHint(): boolean {
  return Boolean(props.hint) || filled(slots.hint)
}

/** Its own error and hint first, then what the page says describes it. */
function describedByAll(): string | undefined {
  return (
    [props.error ? errorId.value : '', hasHint() ? hintId.value : '', props.describedBy ?? '']
      .filter(Boolean)
      .join(' ') || undefined
  )
}
</script>

<template>
  <div class="kit-checkbox" :class="{ 'is-disabled': disabled }">
    <!-- Named by its words, live: Reka names a box by its label's text as it first stood, which
         a label whose words change would outgrow. -->
    <CheckboxRoot
      :id="boxId"
      v-slot="{ state }"
      v-model="model"
      :value="value"
      :disabled="disabled"
      class="kit-checkbox__box"
      :aria-labelledby="labelId"
      :aria-describedby="describedByAll()"
      :aria-invalid="invalid || Boolean(error) || undefined"
    >
      <CheckboxIndicator class="kit-checkbox__mark">
        <KitGlyph :name="state === 'indeterminate' ? 'dash' : 'check'" />
      </CheckboxIndicator>
    </CheckboxRoot>
    <label :id="labelId" :for="boxId" class="kit-checkbox__label"><slot /></label>
    <p v-if="error" :id="errorId" class="kit-checkbox__error">{{ error }}</p>
    <p v-if="hasHint()" :id="hintId" class="kit-checkbox__hint">
      <slot name="hint">{{ hint }}</slot>
    </p>
  </div>
</template>

<style scoped>
/*
 * The box sits by the first line of its words, each line of which is a full line of text, and
 * the row is never shorter than a touch target. Ticked, it fills with the accent and its mark is
 * drawn in the accent's own text color, a pair contrast.ts measures with the primary button's.
 */
@layer kit {
  .kit-checkbox {
    box-sizing: border-box;
    display: grid;
    grid-template-columns: auto minmax(0, 1fr);
    align-content: center;
    column-gap: var(--kit-space-xs);
    min-height: var(--kit-control-height);
    line-height: var(--kit-line-height-prose);
  }

  .kit-checkbox__box {
    position: relative;
    box-sizing: border-box;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 1.25rem;
    height: 1.25rem;

    /* Centered on the first line of its words: its font, and so its line, is theirs. */
    margin-block-start: calc((1lh - 1.25rem) / 2);
    padding: 0;
    border: var(--kit-control-border-width) solid var(--kit-control-border);
    border-radius: var(--kit-radius-sm);
    background: var(--kit-surface-raised);
    color: var(--kit-on-accent);
    font: inherit;
    cursor: pointer;
  }

  /* A 44 px press area around the drawn box. */
  .kit-checkbox__box::after {
    position: absolute;
    inset: calc((1.25rem - var(--kit-control-height)) / 2);
    content: '';
  }

  .kit-checkbox__box:focus-visible {
    outline: var(--kit-focus-ring-width) solid var(--kit-focus-ring);
    outline-offset: var(--kit-focus-ring-offset);
  }

  .kit-checkbox__box[data-state='checked'],
  .kit-checkbox__box[data-state='indeterminate'] {
    border-color: var(--kit-accent);
    background: var(--kit-accent);
  }

  .kit-checkbox__box[aria-invalid='true'] {
    border-color: var(--kit-danger);
    box-shadow: 0 0 0 1px var(--kit-danger);
  }

  .kit-checkbox__box:disabled {
    cursor: not-allowed;
  }

  .kit-checkbox__mark {
    display: inline-flex;
    font-size: var(--kit-text-size-sm);
  }

  .kit-checkbox__label {
    grid-column: 2;
    cursor: pointer;
  }

  .kit-checkbox.is-disabled {
    opacity: 0.6;
  }

  .kit-checkbox.is-disabled .kit-checkbox__label {
    cursor: not-allowed;
  }

  .kit-checkbox__error,
  .kit-checkbox__hint {
    grid-column: 2;
    max-width: var(--kit-measure-prose);
    margin: 0;
    font-size: var(--kit-text-size-sm);
  }

  .kit-checkbox__error {
    color: var(--kit-danger);
  }

  .kit-checkbox__hint {
    color: var(--kit-text-muted);
  }
}
</style>
