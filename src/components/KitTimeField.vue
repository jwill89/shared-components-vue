<script setup lang="ts">
// A time of day, typed in its parts, inside a `group` KitFormField, whose caption names it: the
// hour and minute (and the half of the day where the locale writes one) are one group, and a
// screen reader hears each part with the caption. The model is the time as `HH:mm`, RFC 3339's
// partial-time, or `HH:mm:ss` with `seconds`, or '' while there is none; `min` and `max` take the
// same. It holds no date and no zone: a time on a day, in a zone, is KitDatePicker's with `time`.
import { computed } from 'vue'
import type { TimeValue } from 'reka-ui'
import { TimeFieldInput, TimeFieldRoot } from 'reka-ui'
import { hourWords, localLocale, readTime, writeTime } from './dates'

const props = withDefaults(
  defineProps<{
    id?: string
    /** The caption's id, which names the field: from a `group` KitFormField. */
    labelledBy?: string
    /** The ids of the text that describes the field: its error and hint, from KitFormField. */
    describedBy?: string
    invalid?: boolean
    /** The first time it takes, as `HH:mm`. */
    min?: string
    /** The last time it takes, as `HH:mm`. */
    max?: string
    /** Whether it takes seconds too, as `HH:mm:ss`. */
    seconds?: boolean
    /** Whether the hours run to 12 or 24; the locale's way by default. */
    hourCycle?: 12 | 24
    disabled?: boolean
    required?: boolean
    /** The locale the time is written in; the browser's by default. */
    locale?: string
  }>(),
  {
    id: undefined,
    labelledBy: undefined,
    describedBy: undefined,
    invalid: false,
    min: undefined,
    max: undefined,
    seconds: false,
    hourCycle: undefined,
    disabled: false,
    required: false,
    locale: undefined,
  },
)

const model = defineModel<string>({ default: '' })

const value = computed<TimeValue | undefined>({
  get: () => readTime(model.value),
  set: (next) => {
    model.value = next ? writeTime(next, props.seconds) : ''
  },
})
const minValue = computed(() => readTime(props.min))
const maxValue = computed(() => readTime(props.max))
</script>

<template>
  <TimeFieldRoot
    :id="id"
    v-slot="{ segments }"
    v-model="value"
    class="kit-date-field kit-date-field--bare kit-time-field"
    :class="{ 'is-invalid': invalid }"
    :aria-labelledby="labelledBy"
    :aria-describedby="describedBy"
    :min-value="minValue"
    :max-value="maxValue"
    :locale="locale ?? localLocale()"
    :granularity="seconds ? 'second' : 'minute'"
    :hour-cycle="hourCycle"
    :disabled="disabled"
    :required="required"
  >
    <span class="kit-date-field__parts">
      <template v-for="(segment, at) in segments" :key="`${segment.part}-${String(at)}`">
        <TimeFieldInput
          v-if="segment.part === 'literal'"
          :part="segment.part"
          class="kit-date-field__literal"
        >
          {{ segment.value }}
        </TimeFieldInput>
        <TimeFieldInput
          v-else
          :part="segment.part"
          class="kit-date-field__part"
          v-bind="hourWords(segments, segment)"
          :aria-invalid="invalid || undefined"
        >
          {{ segment.value }}
        </TimeFieldInput>
      </template>
    </span>
  </TimeFieldRoot>
</template>
