<script setup lang="ts">
// A date, typed in its parts or picked from a month's calendar, inside a `group` KitFormField,
// whose caption names it: the parts (day, month and year, in the order the locale writes them)
// are one group, and a screen reader hears each part with the caption. The model is the date as
// `YYYY-MM-DD`, RFC 3339's full-date, or '' while there is none; `min` and `max` take the same, so
// one picker's date can bound another's, as a loan's due date is held after the day it was lent.
// The calendar opens from the button at the field's end, the arrow keys move through its days,
// and its weeks start on the locale's first day. It is drawn beside the field, as a tooltip is,
// and its icons come from the slots.
import { computed } from 'vue'
import { parseDate } from '@internationalized/date'
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

const props = withDefaults(
  defineProps<{
    id?: string
    /** The caption's id, which names the field: from a `group` KitFormField. */
    labelledBy?: string
    /** The ids of the text that describes the field: its error and hint, from KitFormField. */
    describedBy?: string
    invalid?: boolean
    /** The first date it takes, as `YYYY-MM-DD`. */
    min?: string
    /** The last date it takes, as `YYYY-MM-DD`. */
    max?: string
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

/** A `YYYY-MM-DD` date as Reka holds it, or nothing for one empty or malformed. */
function parsed(text: string | undefined): DateValue | undefined {
  if (!text) {
    return undefined
  }
  try {
    return parseDate(text)
  } catch {
    return undefined
  }
}

const value = computed<DateValue | undefined>({
  get: () => parsed(model.value),
  set: (next) => {
    model.value = next ? next.toString().slice(0, 10) : ''
  },
})
const minValue = computed(() => parsed(props.min))
const maxValue = computed(() => parsed(props.max))
const browserLocale = typeof navigator === 'undefined' ? 'en' : navigator.language
</script>

<template>
  <DatePickerRoot
    :id="id"
    v-model="value"
    :min-value="minValue"
    :max-value="maxValue"
    :locale="locale ?? browserLocale"
    :disabled="disabled"
    :required="required"
    granularity="day"
  >
    <DatePickerField
      v-slot="{ segments }"
      class="kit-date-picker"
      :class="{ 'is-invalid': invalid }"
      :aria-labelledby="labelledBy"
      :aria-describedby="describedBy"
    >
      <span class="kit-date-picker__parts">
        <template v-for="segment in segments" :key="segment.part">
          <DatePickerInput
            v-if="segment.part === 'literal'"
            :part="segment.part"
            class="kit-date-picker__literal"
          >
            {{ segment.value }}
          </DatePickerInput>
          <DatePickerInput
            v-else
            :part="segment.part"
            class="kit-date-picker__part"
            :aria-invalid="invalid || undefined"
          >
            {{ segment.value }}
          </DatePickerInput>
        </template>
      </span>
      <DatePickerTrigger class="kit-date-picker__open" :aria-label="openLabel">
        <slot name="open-icon"><KitGlyph name="calendar" /></slot>
      </DatePickerTrigger>
    </DatePickerField>
    <DatePickerContent
      class="kit-calendar"
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

<style>
@layer kit {
  /* The field: a box like a text box's, the parts in a row and the button at its end. */
  .kit-date-picker {
    box-sizing: border-box;
    display: inline-flex;
    align-items: center;
    max-width: 100%;
    min-height: var(--kit-control-height);
    padding-inline-start: var(--kit-space-sm);
    border: var(--kit-control-border-width) solid var(--kit-control-border);
    border-radius: var(--kit-radius-md);
    background: var(--kit-surface-raised);
    color: var(--kit-text);
    font-variant-numeric: tabular-nums;
  }

  .kit-date-picker:focus-within {
    outline: var(--kit-focus-ring-width) solid var(--kit-focus-ring);
    outline-offset: var(--kit-focus-ring-offset);
  }

  .kit-date-picker.is-invalid {
    border-color: var(--kit-danger);
    box-shadow: inset 0 0 0 1px var(--kit-danger);
  }

  .kit-date-picker[data-disabled] {
    cursor: not-allowed;
    opacity: 0.6;
  }

  .kit-date-picker__parts {
    display: inline-flex;
    flex-wrap: wrap;
    align-items: center;
  }

  /* A part being typed in is washed in the accent and ringed, as an open list's option is. */
  .kit-date-picker__part {
    padding: 0 var(--kit-space-2xs);
    border-radius: var(--kit-radius-sm);
  }

  .kit-date-picker__part:focus {
    outline: var(--kit-control-border-width) solid var(--kit-focus-ring);
    background: color-mix(in srgb, var(--kit-surface-raised) 88%, var(--kit-accent));
  }

  .kit-date-picker__part[data-placeholder] {
    color: var(--kit-text-muted);
  }

  .kit-date-picker__literal {
    color: var(--kit-text-muted);
  }

  .kit-date-picker__open,
  .kit-calendar__step {
    display: inline-flex;
    flex: none;
    align-items: center;
    justify-content: center;
    width: var(--kit-control-height);
    height: var(--kit-control-height);
    padding: 0;
    border: 0;
    border-radius: var(--kit-radius-md);
    background: transparent;
    color: var(--kit-text);
    cursor: pointer;
  }

  /* The field's button keeps its full touch target by lying over the box's borders, so the box is
     the height of a text box beside it rather than a border's width either side taller. */
  .kit-date-picker__open {
    margin-block: calc(-1 * var(--kit-control-border-width));
  }

  .kit-calendar__step:focus-visible {
    outline: var(--kit-focus-ring-width) solid var(--kit-focus-ring);
    outline-offset: calc(-1 * var(--kit-focus-ring-width));
  }

  .kit-calendar__step:disabled {
    cursor: not-allowed;
    opacity: 0.6;
  }

  .kit-date-picker__open:hover:not(:disabled),
  .kit-calendar__step:hover:not(:disabled) {
    background: color-mix(in srgb, var(--kit-text) 6%, transparent);
  }

  /* The open calendar, floating over the page. */
  .kit-calendar {
    box-sizing: border-box;
    z-index: var(--kit-layer-popup);
    padding: var(--kit-space-sm);
    border: var(--kit-control-border-width) solid var(--kit-control-border);
    border-radius: var(--kit-radius-md);
    background: var(--kit-surface-raised);
    color: var(--kit-text);
    font-family: var(--kit-font-body);
    box-shadow: var(--kit-shadow-overlay);
  }

  .kit-calendar:focus {
    outline: none;
  }

  .kit-calendar__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--kit-space-xs);
    margin-bottom: var(--kit-space-xs);
  }

  .kit-calendar__heading {
    font-weight: var(--kit-font-weight-strong);
  }

  .kit-calendar__grid {
    border-collapse: collapse;
  }

  .kit-calendar__weekday {
    padding-bottom: var(--kit-space-2xs);
    color: var(--kit-text-muted);
    font-size: var(--kit-text-size-sm);
    font-weight: var(--kit-font-weight-strong);
  }

  .kit-calendar__cell {
    padding: 0;
    text-align: center;
  }

  /* Each day a 44 px target. Today is underlined; the chosen day filled with the accent. */
  .kit-calendar__day {
    box-sizing: border-box;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: var(--kit-control-height);
    height: var(--kit-control-height);
    border-radius: var(--kit-radius-md);
    color: var(--kit-text);
    font-variant-numeric: tabular-nums;
    cursor: pointer;
  }

  .kit-calendar__day:focus-visible {
    outline: var(--kit-focus-ring-width) solid var(--kit-focus-ring);
    outline-offset: calc(-1 * var(--kit-focus-ring-width));
  }

  .kit-calendar__day:hover:not([data-disabled], [data-unavailable], [data-selected]) {
    background: color-mix(in srgb, var(--kit-text) 6%, transparent);
  }

  .kit-calendar__day[data-today] {
    text-decoration: underline;
    text-underline-offset: var(--kit-space-2xs);
  }

  .kit-calendar__day[data-outside-view] {
    color: var(--kit-text-muted);
  }

  .kit-calendar__day[data-selected] {
    background: var(--kit-accent);
    color: var(--kit-on-accent);
    font-weight: var(--kit-font-weight-strong);
  }

  .kit-calendar__day[data-disabled],
  .kit-calendar__day[data-unavailable] {
    cursor: not-allowed;
    opacity: 0.6;
    text-decoration: line-through;
  }
}
</style>
