<script setup lang="ts" generic="T extends string | number">
// Several boxes that answer one question, inside a `group` KitFormField, whose caption asks it:
// `<KitCheckboxGroup v-model="days" v-bind="field" :options="days" />`. Its value is the list of
// the options ticked, in the options' own order however they were ticked. Each option may carry
// a hint under its words, and options with a `group` gather under that heading, each heading a
// group of its own that names the boxes in it.
//
// Each box is its own stop for Tab, as boxes on a page are, and Space ticks the one focused. A
// field that asks for one answer of several is a KitRadioGroup; one of two to five short options
// always in view, a KitSegmentedControl.
import { computed, useId } from 'vue'
import { CheckboxGroupRoot } from 'reka-ui'
import KitCheckbox from './KitCheckbox.vue'
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
    /** Lays the boxes out side by side, as many to a line as fit, for short words. */
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

const model = defineModel<T[]>({ required: true })

const madeId = useId()
const groupId = computed(() => props.id ?? madeId)
const runs = computed(() => byHeading(props.options))

/** Takes what Reka hands back, in the order ticked, and keeps it in the options' order. */
function tick(values: unknown): void {
  const ticked = new Set(Array.isArray(values) ? values : [])
  model.value = props.options.filter((option) => ticked.has(option.value)).map((o) => o.value)
}
</script>

<template>
  <CheckboxGroupRoot
    :id="groupId"
    :model-value="model"
    :roving-focus="false"
    :disabled="disabled"
    role="group"
    class="kit-choice-group"
    :class="{ 'is-inline': inline }"
    :aria-labelledby="labelledBy"
    :aria-describedby="describedBy"
    @update:model-value="tick"
  >
    <!-- A run under a heading is a group of its own, named by it, so a box's words that repeat
         under two headings ("Edited") are told apart; a run under none is only the box its
         options are laid out in. -->
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
        <KitCheckbox
          v-for="option in run.options"
          :key="option.value"
          :value="option.value"
          :hint="option.hint"
          :disabled="option.disabled"
          :invalid="invalid"
        >
          {{ option.label }}
        </KitCheckbox>
      </div>
    </div>
  </CheckboxGroupRoot>
</template>
