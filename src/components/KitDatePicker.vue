<script setup lang="ts">
// A date, typed in its parts or picked from a month's calendar, inside a `group` KitFormField,
// whose caption names it: the parts (day, month and year, in the order the locale writes them)
// are one group, and a screen reader hears each part with the caption. The model is the date as
// `YYYY-MM-DD`, RFC 3339's full-date, or '' while there is none; `min` and `max` take the same, so
// one picker's date can bound another's, as a loan's due date is held after the day it was lent.
// With `time`, it takes a time of day too, and the model is a moment, RFC 3339's date-time written
// in UTC (`2026-06-13T20:00:00Z`), shown and typed in `timeZone`, the browser's by default, whose
// short name follows the parts; `min` and `max` are moments then too.
// The calendar opens from the button at the field's end, the arrow keys move through its days,
// and its weeks start on the locale's first day. It is drawn beside the field, as a tooltip is,
// and its icons come from the slots.
import { computed, useId } from 'vue'
import type { DateValue } from '@internationalized/date'
import {
  DatePickerCalendar,
  DatePickerCell,
  DatePickerCellTrigger,
  DatePickerContent,
  DatePickerField,
  DatePickerGrid,
  DatePickerGridBody,
  DatePickerGridHead,
  DatePickerGridRow,
  DatePickerHeadCell,
  DatePickerHeader,
  DatePickerHeading,
  DatePickerInput,
  DatePickerNext,
  DatePickerPrev,
  DatePickerRoot,
  DatePickerTrigger,
} from 'reka-ui'
import KitGlyph from './KitGlyph.vue'
import {
  hourWords,
  localLocale,
  localZone,
  midnight,
  readDay,
  readMoment,
  writeDay,
  writeMoment,
  zoneName,
} from './dates'

const props = withDefaults(
  defineProps<{
    id?: string
    /** The caption's id, which names the field: from a `group` KitFormField. */
    labelledBy?: string
    /** The ids of the text that describes the field: its error and hint, from KitFormField. */
    describedBy?: string
    invalid?: boolean
    /** The first date it takes, as `YYYY-MM-DD`, or the first moment with `time`. */
    min?: string
    /** The last date it takes, as `YYYY-MM-DD`, or the last moment with `time`. */
    max?: string
    /** Whether it takes a time of day as well, making the model a moment. */
    time?: boolean
    /** The IANA time zone a moment is shown and typed in; the browser's by default. */
    timeZone?: string
    /** Whether the hours run to 12 or 24; the locale's way by default. */
    hourCycle?: 12 | 24
    disabled?: boolean
    required?: boolean
    /** The locale the date is written and the calendar laid out in; the browser's by default. */
    locale?: string
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
    time: false,
    timeZone: undefined,
    hourCycle: undefined,
    disabled: false,
    required: false,
    locale: undefined,
    openLabel: 'Choose a date',
    previousLabel: 'Previous month',
    nextLabel: 'Next month',
  },
)

const model = defineModel<string>({ default: '' })

defineSlots<{
  'open-icon'?: () => unknown
  'previous-icon'?: () => unknown
  'next-icon'?: () => unknown
}>()

const zone = computed(() => props.timeZone ?? localZone())
const shownLocale = computed(() => props.locale ?? localLocale())

/** A date, or a moment with `time`, as Reka holds it. */
function read(text: string | undefined): DateValue | undefined {
  return props.time ? readMoment(text, zone.value) : readDay(text)
}

const value = computed<DateValue | undefined>({
  get: () => read(model.value),
  set: (next) => {
    model.value = next ? (props.time ? writeMoment(next, zone.value) : writeDay(next)) : ''
  },
})
const minValue = computed(() => read(props.min))
const maxValue = computed(() => read(props.max))
// A moment's parts start from midnight in its zone, so what is typed stands in that zone.
const placeholder = computed(() => (props.time ? midnight(zone.value) : undefined))

const zoneId = useId()
const shownZone = computed(() =>
  zoneName(zone.value, shownLocale.value, value.value?.toDate(zone.value) ?? new Date()),
)
const described = computed(
  () => [props.describedBy, props.time ? zoneId : undefined].filter(Boolean).join(' ') || undefined,
)
</script>

<template>
  <DatePickerRoot
    :id="id"
    v-model="value"
    :default-placeholder="placeholder"
    :min-value="minValue"
    :max-value="maxValue"
    :locale="shownLocale"
    :disabled="disabled"
    :required="required"
    :granularity="time ? 'minute' : 'day'"
    :hour-cycle="hourCycle"
    hide-time-zone
  >
    <DatePickerField
      v-slot="{ segments }"
      class="kit-date-field kit-date-picker"
      :class="{ 'is-invalid': invalid }"
      :aria-labelledby="labelledBy"
      :aria-describedby="described"
    >
      <span class="kit-date-field__parts">
        <template v-for="(segment, at) in segments" :key="`${segment.part}-${String(at)}`">
          <DatePickerInput
            v-if="segment.part === 'literal'"
            :part="segment.part"
            class="kit-date-field__literal"
          >
            {{ segment.value }}
          </DatePickerInput>
          <DatePickerInput
            v-else
            :part="segment.part"
            class="kit-date-field__part"
            v-bind="hourWords(segments, segment)"
            :aria-invalid="invalid || undefined"
          >
            {{ segment.value }}
          </DatePickerInput>
        </template>
        <span v-if="time" :id="zoneId" class="kit-date-field__zone">{{ shownZone }}</span>
      </span>
      <DatePickerTrigger class="kit-date-field__open" :aria-label="openLabel">
        <slot name="open-icon"><KitGlyph name="calendar" /></slot>
      </DatePickerTrigger>
    </DatePickerField>
    <DatePickerContent
      class="kit-calendar kit-calendar--single"
      :portal="{ disabled: true }"
      :side-offset="4"
      :collision-padding="8"
      align="start"
    >
      <DatePickerCalendar v-slot="{ weekDays, grid }">
        <DatePickerHeader class="kit-calendar__header">
          <DatePickerPrev class="kit-calendar__step" :aria-label="previousLabel">
            <slot name="previous-icon"><KitGlyph name="previous" /></slot>
          </DatePickerPrev>
          <DatePickerHeading class="kit-calendar__heading" />
          <DatePickerNext class="kit-calendar__step" :aria-label="nextLabel">
            <slot name="next-icon"><KitGlyph name="next" /></slot>
          </DatePickerNext>
        </DatePickerHeader>
        <DatePickerGrid
          v-for="month in grid"
          :key="month.value.toString()"
          class="kit-calendar__grid"
        >
          <DatePickerGridHead>
            <DatePickerGridRow class="kit-calendar__row">
              <DatePickerHeadCell v-for="day in weekDays" :key="day" class="kit-calendar__weekday">
                {{ day }}
              </DatePickerHeadCell>
            </DatePickerGridRow>
          </DatePickerGridHead>
          <DatePickerGridBody>
            <DatePickerGridRow
              v-for="(week, row) in month.rows"
              :key="`week-${String(row)}`"
              class="kit-calendar__row"
            >
              <DatePickerCell
                v-for="day in week"
                :key="day.toString()"
                :date="day"
                class="kit-calendar__cell"
              >
                <DatePickerCellTrigger :day="day" :month="month.value" class="kit-calendar__day" />
              </DatePickerCell>
            </DatePickerGridRow>
          </DatePickerGridBody>
        </DatePickerGrid>
      </DatePickerCalendar>
    </DatePickerContent>
  </DatePickerRoot>
</template>
