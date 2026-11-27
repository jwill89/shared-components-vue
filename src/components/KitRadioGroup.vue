<script setup lang="ts" generic="T extends string | number">
// One answer of several, each with its words and a hint under them where it needs one, inside a
// `group` KitFormField, whose caption asks the question:
// `<KitRadioGroup v-model="reason" v-bind="field" :options="reasons" />`. Options with a `group`
// gather under that heading, each heading a group of its own that names the answers in it.
//
// The group is one stop for Tab, on the answer chosen or the first; the arrow keys move between
// answers and choose the one they reach, as a group of radio buttons does, and a click on an
// answer's words chooses it. It may start with nothing chosen, until the person answers. Chosen,
// an answer's ring holds a dot, so its state never rests on color alone. A choice of two to five
// short options, always in view, is a KitSegmentedControl; a longer list, a KitSelect.
import { computed, useId } from 'vue'
import { RadioGroupIndicator, RadioGroupItem, RadioGroupRoot } from 'reka-ui'
import { byHeading } from './options'
import type { KitChoiceOption } from './options'

const props = withDefaults(
  defineProps<{
    options: KitChoiceOption<T>[]
    id?: string
    /** The caption's id, which names the group: from a `group` KitFormField. */
    labelledBy?: string
    /** The ids of the text that describes the group: its error and hint, from KitFormField. */
    describedBy?: string
    invalid?: boolean
    disabled?: boolean
    /** Lays the answers out side by side, as many to a line as fit, for short words. */
    inline?: boolean
  }>(),
  {
    id: undefined,
    labelledBy: undefined,
    describedBy: undefined,
    invalid: false,
    disabled: false,
    inline: false,
  },
)

const model = defineModel<T | null>({ required: true })

const madeId = useId()
const groupId = computed(() => props.id ?? madeId)
const runs = computed(() => byHeading(props.options))

/** Each answer's id, from where it stands in the options. */
function answerId(option: KitChoiceOption<T>): string {
  return `${groupId.value}-${String(props.options.indexOf(option))}`
}

// Reka chooses the answer an arrow key moves to only while the key is still down as focus lands,
// which a key pressed and let go at once, by an on-screen keyboard or a switch, is not. So the
// group chooses the answer focus has reached itself, once the key has moved it.
const ARROWS = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'])

function arrowed(event: KeyboardEvent): void {
  if (!ARROWS.has(event.key) || props.disabled) {
    return
  }
  setTimeout(() => {
    const focused = document.activeElement
    const option = props.options.find((candidate) => answerId(candidate) === focused?.id)
    if (option && !option.disabled) {
      model.value = option.value
    }
  }, 0)
}

/** Takes an answer Reka hands back only when it is one of the options. */
function choose(value: unknown): void {
  const option = props.options.find((candidate) => candidate.value === value)
  if (option) {
    model.value = option.value
  }
}
</script>

<template>
  <RadioGroupRoot
    :id="groupId"
    :model-value="model ?? undefined"
    :disabled="disabled"
    class="kit-choice-group"
    :class="{ 'is-inline': inline }"
    :aria-labelledby="labelledBy"
    :aria-describedby="describedBy"
    :aria-invalid="invalid || undefined"
    @update:model-value="choose"
    @keydown="arrowed"
  >
    <!-- A run under a heading is a group of its own, named by it; a run under none is only the
         box its answers are laid out in. -->
    <div
      v-for="(run, at) in runs"
      :key="run.heading ?? ''"
      :role="run.heading ? 'group' : undefined"
      class="kit-choice-group__run"
      :aria-labelledby="run.heading ? `${groupId}-heading-${String(at)}` : undefined"
    >
      <span
        v-if="run.heading"
        :id="`${groupId}-heading-${String(at)}`"
        class="kit-choice-group__heading"
      >
        {{ run.heading }}
      </span>
      <div class="kit-choice-group__options">
        <div
          v-for="option in run.options"
          :key="option.value"
          class="kit-radio"
          :class="{ 'is-disabled': disabled || option.disabled }"
        >
          <!-- Named by its words, live: Reka names an answer by its label's text as it first
                 stood. -->
          <RadioGroupItem
            :id="answerId(option)"
            :value="option.value"
            :disabled="option.disabled"
            class="kit-radio__ring"
            :aria-labelledby="`${answerId(option)}-label`"
            :aria-describedby="option.hint ? `${answerId(option)}-hint` : undefined"
          >
            <RadioGroupIndicator class="kit-radio__dot" />
          </RadioGroupItem>
          <label :id="`${answerId(option)}-label`" :for="answerId(option)" class="kit-radio__label">
            {{ option.label }}
          </label>
          <p v-if="option.hint" :id="`${answerId(option)}-hint`" class="kit-radio__hint">
            {{ option.hint }}
          </p>
        </div>
      </div>
    </div>
  </RadioGroupRoot>
</template>

<style scoped>
/*
 * An answer is laid out as a KitCheckbox is: the ring by the first line of its words, the row
 * never shorter than a touch target, a 44 px press area round the ring. Chosen, the ring takes
 * the accent and a dot of it, which sits on the raised surface the ring is filled with.
 */
@layer kit {
  .kit-radio {
    box-sizing: border-box;
    display: grid;
    grid-template-columns: auto minmax(0, 1fr);
    align-content: center;
    column-gap: var(--kit-space-xs);
    min-height: var(--kit-control-height);
    line-height: var(--kit-line-height-prose);
  }

  .kit-radio__ring {
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
    border-radius: var(--kit-radius-full);
    background: var(--kit-surface-raised);
    font: inherit;
    cursor: pointer;
  }

  .kit-radio__ring::after {
    position: absolute;
    inset: calc((1.25rem - var(--kit-control-height)) / 2);
    content: '';
  }

  .kit-radio__ring:focus-visible {
    outline: var(--kit-focus-ring-width) solid var(--kit-focus-ring);
    outline-offset: var(--kit-focus-ring-offset);
  }

  .kit-radio__ring[data-state='checked'] {
    border: 2px solid var(--kit-accent);
  }

  .kit-radio__ring:disabled {
    cursor: not-allowed;
  }

  .kit-choice-group[aria-invalid='true'] .kit-radio__ring {
    border-color: var(--kit-danger);
    box-shadow: 0 0 0 1px var(--kit-danger);
  }

  .kit-radio__dot {
    display: block;
    width: 0.625rem;
    height: 0.625rem;
    border-radius: var(--kit-radius-full);
    background: var(--kit-accent);
  }

  .kit-radio__label {
    grid-column: 2;
    cursor: pointer;
  }

  .kit-radio.is-disabled {
    opacity: 0.6;
  }

  .kit-radio.is-disabled .kit-radio__label {
    cursor: not-allowed;
  }

  .kit-radio__hint {
    grid-column: 2;
    max-width: var(--kit-measure-prose);
    margin: 0;
    color: var(--kit-text-muted);
    font-size: var(--kit-text-size-sm);
  }
}
</style>
