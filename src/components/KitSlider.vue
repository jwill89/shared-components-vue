<script setup lang="ts">
// A number chosen along a track by its thumb, inside a `group` KitFormField, whose caption names
// it, since a label's `for` reaches only a form control:
// `<KitSlider v-model="opacity" v-bind="field" :min="0" :max="1" :step="0.05" :value-text="percent" />`.
// The arrow keys move it a step, Page Up and Page Down ten, Home and End to either end, and a
// drag or a press on the track moves it to the pointer.
//
// `valueText` says the value in words, as a screen reader reads it (`aria-valuetext`) and as it
// shows beside the track: "40%", "12 pixels". Without it, the value shows as a number. The value
// changes as the thumb moves, so what it moves can follow; `commit` fires once a move is done (a
// drag let go, a key let go), for what should happen once a move, such as an undo step or a
// save. A number someone types exactly is a KitNumberField.
import { computed } from 'vue'
import { SliderRange, SliderRoot, SliderThumb, SliderTrack } from 'reka-ui'
import { formatCount } from '../format'

const props = withDefaults(
  defineProps<{
    id?: string
    /** The caption's id, which names the slider: from a `group` KitFormField. */
    labelledBy?: string
    /** The ids of the text that describes the slider: its error and hint, from KitFormField. */
    describedBy?: string
    invalid?: boolean
    disabled?: boolean
    min?: number
    max?: number
    step?: number
    /** The value in words, as it is read and shown. */
    valueText?: (value: number) => string
    /** Whether the value shows beside the track. */
    showValue?: boolean
  }>(),
  {
    id: undefined,
    labelledBy: undefined,
    describedBy: undefined,
    invalid: false,
    disabled: false,
    min: 0,
    max: 100,
    step: 1,
    valueText: undefined,
    showValue: true,
  },
)

const emit = defineEmits<{
  /** A move is done: a drag let go, or a key pressed. */
  commit: [value: number]
}>()

const model = defineModel<number>({ required: true })

const said = computed(() =>
  props.valueText ? props.valueText(model.value) : formatCount(model.value),
)

function take(values: number[] | undefined): void {
  const value = values?.[0]
  if (value !== undefined) {
    model.value = value
  }
}

function committed(values: number[]): void {
  const value = values[0]
  if (value !== undefined) {
    emit('commit', value)
  }
}
</script>

<template>
  <div class="kit-slider" :class="{ 'is-invalid': invalid, 'is-disabled': disabled }">
    <SliderRoot
      :model-value="[model]"
      :min="min"
      :max="max"
      :step="step"
      :disabled="disabled"
      class="kit-slider__root"
      @update:model-value="take"
      @value-commit="committed"
    >
      <SliderTrack class="kit-slider__track">
        <SliderRange class="kit-slider__range" />
      </SliderTrack>
      <SliderThumb
        :id="id"
        class="kit-slider__thumb"
        :aria-labelledby="labelledBy"
        :aria-describedby="describedBy"
        :aria-valuetext="valueText ? said : undefined"
        :aria-invalid="invalid || undefined"
      />
    </SliderRoot>
    <!-- Shown for the eye; a screen reader hears the value from the thumb itself. -->
    <span v-if="showValue" class="kit-slider__value" aria-hidden="true">{{ said }}</span>
  </div>
</template>

<style scoped>
/*
 * The track is sunken and edged as a field is; the part of it up to the thumb is the accent.
 * The thumb is 24 px across, edged in the accent, with a 44 px press area around it, and the
 * slider is a touch target's height.
 */
@layer kit {
  .kit-slider {
    display: flex;
    align-items: center;
    gap: var(--kit-space-sm);
    min-width: 0;
    max-width: var(--kit-width-field);
  }

  .kit-slider__root {
    position: relative;
    display: flex;
    flex: 1 1 auto;
    align-items: center;
    min-width: 6rem;
    height: var(--kit-control-height);
    touch-action: none;
    user-select: none;
  }

  .kit-slider__track {
    position: relative;
    box-sizing: border-box;
    flex-grow: 1;
    height: 0.5rem;
    overflow: hidden;
    border: var(--kit-control-border-width) solid var(--kit-control-border);
    border-radius: var(--kit-radius-full);
    background: var(--kit-surface-sunken);
  }

  .kit-slider__range {
    position: absolute;
    height: 100%;
    background: var(--kit-accent);
  }

  .kit-slider__thumb {
    position: relative;
    box-sizing: border-box;
    display: block;
    width: 1.5rem;
    height: 1.5rem;
    border: 2px solid var(--kit-accent);
    border-radius: var(--kit-radius-full);
    background: var(--kit-surface-raised);
    cursor: grab;
  }

  .kit-slider__thumb::after {
    position: absolute;
    inset: calc((1.5rem - var(--kit-control-height)) / 2 - 2px);
    content: '';
  }

  .kit-slider__thumb:focus-visible {
    outline: var(--kit-focus-ring-width) solid var(--kit-focus-ring);
    outline-offset: var(--kit-focus-ring-offset);
  }

  .kit-slider.is-invalid .kit-slider__track,
  .kit-slider.is-invalid .kit-slider__thumb {
    border-color: var(--kit-danger);
  }

  /* Disabled, the track and thumb fade; the value beside them stays at full strength, since it
     is still read. */
  .kit-slider.is-disabled .kit-slider__root {
    opacity: 0.6;
  }

  .kit-slider.is-disabled .kit-slider__thumb {
    cursor: not-allowed;
  }

  .kit-slider__value {
    flex: none;
    min-width: 3ch;
    font-variant-numeric: tabular-nums;
    text-align: end;
  }
}
</style>
