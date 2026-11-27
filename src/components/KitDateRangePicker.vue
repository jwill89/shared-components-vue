<script setup lang="ts">
// A run of days, its first and last typed in their parts or picked from a month's calendar,
// inside a `group` KitFormField, whose caption names it: the first day's parts and the last's
// are each a group of their own, named `startLabel` and `endLabel`, so a screen reader hears
// which end a part belongs to. The models are `v-model:start` and `v-model:end`, each a
// `YYYY-MM-DD` date or '' while there is none, so a page binds the two fields it keeps; `min` and
// `max` bound the whole run. In the calendar, a first press starts the run and a second ends it.
// It takes days only: a start and an end with their times are two KitDatePickers with `time`,
// the end's `min` the start, since two moments side by side don't sit in one box tidily.
import { computed } from 'vue'
import type { DateRange } from 'reka-ui'
import type { DateValue } from '@internationalized/date'
import {
  DateRangePickerCalendar,
  DateRangePickerCell,
  DateRangePickerCellTrigger,
  DateRangePickerContent,
  DateRangePickerField,
  DateRangePickerGrid,
  DateRangePickerGridBody,
  DateRangePickerGridHead,
  DateRangePickerGridRow,
  DateRangePickerHeadCell,
  DateRangePickerHeader,
  DateRangePickerHeading,
  DateRangePickerInput,
  DateRangePickerNext,
  DateRangePickerPrev,
  DateRangePickerRoot,
  DateRangePickerTrigger,
} from 'reka-ui'
import KitGlyph from './KitGlyph.vue'
import { localLocale, readDay, writeDay } from './dates'

const props = withDefaults(
  defineProps<{
    id?: string
    /** The caption's id, which names the field: from a `group` KitFormField. */
    labelledBy?: string
    /** The ids of the text that describes the field: its error and hint, from KitFormField. */
    describedBy?: string
    invalid?: boolean
    /** The first date the run may start on, as `YYYY-MM-DD`. */
    min?: string
    /** The last date the run may end on, as `YYYY-MM-DD`. */
    max?: string
    disabled?: boolean
    required?: boolean
    /** The locale the dates are written and the calendar laid out in; the browser's by default. */
    locale?: string
    /** What the first day's parts are called. */
    startLabel?: string
    /** What the last day's parts are called. */
    endLabel?: string
    openLabel?: string
    previousLabel?: string
    nextLabel?: string
  }>(),
  {
    id: undefined,
    labelledBy: undefined,
    describedBy: undefined,
    invalid: false,
    min: undefined,
    max: undefined,
    disabled: false,
    required: false,
    locale: undefined,
    startLabel: 'From',
    endLabel: 'To',
    openLabel: 'Choose the dates',
    previousLabel: 'Previous month',
    nextLabel: 'Next month',
  },
)

const start = defineModel<string>('start', { default: '' })
const end = defineModel<string>('end', { default: '' })

defineSlots<{
  'open-icon'?: () => unknown
  'previous-icon'?: () => unknown
  'next-icon'?: () => unknown
}>()

function write(next: DateValue | undefined): string {
  return next ? writeDay(next) : ''
}

const value = computed<DateRange>({
  get: () => ({ start: readDay(start.value), end: readDay(end.value) }),
  set: (next) => {
    start.value = write(next.start)
    end.value = write(next.end)
  },
})
const minValue = computed(() => readDay(props.min))
const maxValue = computed(() => readDay(props.max))
const ends = computed(() => [
  { type: 'start' as const, label: props.startLabel },
  { type: 'end' as const, label: props.endLabel },
])
</script>

<template>
  <DateRangePickerRoot
    :id="id"
    v-model="value"
    :min-value="minValue"
    :max-value="maxValue"
    :locale="locale ?? localLocale()"
    :disabled="disabled"
    :required="required"
    granularity="day"
  >
    <DateRangePickerField
      v-slot="{ segments }"
      class="kit-date-field kit-date-range-picker"
      :class="{ 'is-invalid': invalid }"
      :aria-labelledby="labelledBy"
      :aria-describedby="describedBy"
    >
      <span class="kit-date-field__parts">
        <!-- The dash ends the first group, so it wraps with the first date, never alone. -->
        <template v-for="(half, at) in ends" :key="half.type">
          <span role="group" :aria-label="half.label" class="kit-date-field__parts">
            <template
              v-for="(segment, place) in segments[half.type]"
              :key="`${segment.part}-${String(place)}`"
            >
              <DateRangePickerInput
                v-if="segment.part === 'literal'"
                :part="segment.part"
                :type="half.type"
                class="kit-date-field__literal"
              >
                {{ segment.value }}
              </DateRangePickerInput>
              <DateRangePickerInput
                v-else
                :part="segment.part"
                :type="half.type"
                class="kit-date-field__part"
                :aria-invalid="invalid || undefined"
              >
                {{ segment.value }}
              </DateRangePickerInput>
            </template>
            <span v-if="at === 0" class="kit-date-field__between" aria-hidden="true">–</span>
          </span>
        </template>
      </span>
      <DateRangePickerTrigger class="kit-date-field__open" :aria-label="openLabel">
        <slot name="open-icon"><KitGlyph name="calendar" /></slot>
      </DateRangePickerTrigger>
    </DateRangePickerField>
    <DateRangePickerContent
      class="kit-calendar"
      :portal="{ disabled: true }"
      :side-offset="4"
      :collision-padding="8"
      align="start"
    >
      <DateRangePickerCalendar v-slot="{ weekDays, grid }">
        <DateRangePickerHeader class="kit-calendar__header">
          <DateRangePickerPrev class="kit-calendar__step" :aria-label="previousLabel">
            <slot name="previous-icon"><KitGlyph name="previous" /></slot>
          </DateRangePickerPrev>
          <DateRangePickerHeading class="kit-calendar__heading" />
          <DateRangePickerNext class="kit-calendar__step" :aria-label="nextLabel">
            <slot name="next-icon"><KitGlyph name="next" /></slot>
          </DateRangePickerNext>
        </DateRangePickerHeader>
        <DateRangePickerGrid
          v-for="month in grid"
          :key="month.value.toString()"
          class="kit-calendar__grid"
        >
          <DateRangePickerGridHead>
            <DateRangePickerGridRow class="kit-calendar__row">
              <DateRangePickerHeadCell
                v-for="day in weekDays"
                :key="day"
                class="kit-calendar__weekday"
              >
                {{ day }}
              </DateRangePickerHeadCell>
            </DateRangePickerGridRow>
          </DateRangePickerGridHead>
          <DateRangePickerGridBody>
            <DateRangePickerGridRow
              v-for="(week, row) in month.rows"
              :key="`week-${String(row)}`"
              class="kit-calendar__row"
            >
              <DateRangePickerCell
                v-for="day in week"
                :key="day.toString()"
                :date="day"
                class="kit-calendar__cell"
              >
                <DateRangePickerCellTrigger
                  :day="day"
                  :month="month.value"
                  class="kit-calendar__day"
                />
              </DateRangePickerCell>
            </DateRangePickerGridRow>
          </DateRangePickerGridBody>
        </DateRangePickerGrid>
      </DateRangePickerCalendar>
    </DateRangePickerContent>
  </DateRangePickerRoot>
</template>
