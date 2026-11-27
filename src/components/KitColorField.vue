<script setup lang="ts">
// A color, inside a KitFormField: `<KitColorField v-model="color" v-bind="field" />`. The model is
// `#rrggbb`, or "" for no color. The field is a button showing the color's swatch and its hex,
// which the field's label names; it opens a picker beside it with an area for saturation and
// brightness, a hue slider, the `presets` to pick from, and the hex to type or paste, each moved
// by the keyboard as well as the pointer. Escape or a press outside closes it and gives focus
// back to the button. While there is a color, a button beside the field clears it.
//
// Given `alpha`, the color may be see-through: the model is `#rrggbbaa`, the picker adds an
// opacity slider, and the field shows how opaque the color is beside its hex where it isn't
// wholly. A whole `#rrggbb` the page passes reads as wholly opaque.
//
// The color is the app's data, such as a role's or an embed's, never the kit's: the swatches
// draw it, and the kit's own marks on them are neutral black and white, which hold on any color.
// The icons come from the `chevron`, `check` and `clear` slots, the kit's own marks without them.
import { computed, useId, useTemplateRef } from 'vue'
import {
  ColorAreaArea,
  ColorAreaRoot,
  ColorAreaThumb,
  ColorFieldInput,
  ColorFieldRoot,
  ColorSliderRoot,
  ColorSliderThumb,
  ColorSliderTrack,
  ColorSwatch,
  ColorSwatchPickerItem,
  ColorSwatchPickerItemIndicator,
  ColorSwatchPickerItemSwatch,
  ColorSwatchPickerRoot,
  colorToHex,
  type Color,
} from 'reka-ui'
import KitGlyph from './KitGlyph.vue'
import KitIconButton from './KitIconButton.vue'
import KitPopover from './KitPopover.vue'
import type { KitColorPreset } from './options'

const props = withDefaults(
  defineProps<{
    id?: string
    /** The ids of the text that describes the field: its error and hint, from KitFormField. */
    describedBy?: string
    invalid?: boolean
    /** Colors offered in the picker, such as a platform's own. */
    presets?: readonly KitColorPreset[]
    /** What the presets are, in words: "Discord’s colors". */
    presetsLabel?: string
    /** What the field shows while there is no color. */
    noneText?: string
    /** What the clear button does, in words: "Clear the color". */
    clearLabel?: string
    disabled?: boolean
    /** Whether the color may be see-through, as `#rrggbbaa`. */
    alpha?: boolean
  }>(),
  {
    id: undefined,
    describedBy: undefined,
    invalid: false,
    presets: () => [],
    presetsLabel: 'Suggested colors',
    noneText: 'None',
    clearLabel: 'Clear the color',
    disabled: false,
    alpha: false,
  },
)

const model = defineModel<string>({ required: true })

defineSlots<{
  chevron?: () => unknown
  /** The mark on the preset that is chosen. */
  check?: () => unknown
  /** The clear button's icon. */
  clear?: () => unknown
}>()

const WHOLE = /^#[0-9a-f]{6}$/i
const SEE_THROUGH = /^#[0-9a-f]{8}$/i

/** A color as the field keeps it: `#rrggbb`, or with `alpha`, `#rrggbbaa`; undefined for none. */
function kept(value: string): string | undefined {
  const lower = value.toLowerCase()
  if (!props.alpha) {
    return WHOLE.test(lower.slice(0, 7)) ? lower.slice(0, 7) : undefined
  }
  if (SEE_THROUGH.test(lower)) {
    return lower
  }
  return WHOLE.test(lower) ? `${lower}ff` : undefined
}

/** The color, once it is a whole one; undefined for none. */
const color = computed(() =>
  WHOLE.test(model.value) || (props.alpha && SEE_THROUGH.test(model.value))
    ? kept(model.value)
    : undefined,
)

// The picker always works on a color: with none chosen it starts from the first preset, or
// black, and only a change made in it sets the model.
const working = computed({
  get: () => color.value ?? kept(props.presets[0]?.value ?? '#000000') ?? '#000000',
  set: (value: string | Color) => {
    take(typeof value === 'string' ? value : colorToHex(value))
  },
})

/** The preset the model is, when it is one. */
const preset = computed(() => props.presets.find((p) => kept(p.value) === color.value)?.value)

/** The color in words on the field: its hex, and how opaque it is where it isn't wholly. */
const shownValue = computed(() => {
  if (!color.value) {
    return undefined
  }
  const opacity = props.alpha ? parseInt(color.value.slice(7, 9), 16) / 255 : 1
  return opacity < 1
    ? `${color.value.slice(0, 7)}, ${String(Math.round(opacity * 100))}% opaque`
    : color.value.slice(0, 7)
})

/** Takes a color from the picker, as the field keeps it. */
function take(value: string): void {
  const hex = kept(value)
  if (hex !== undefined && hex !== model.value) {
    model.value = hex
  }
}

function choosePreset(value: unknown): void {
  if (typeof value === 'string') {
    take(value)
  }
}

const valueId = useId()
const hexId = useId()
const describedBy = computed(() => [valueId, props.describedBy].filter(Boolean).join(' '))
const trigger = useTemplateRef<HTMLButtonElement>('trigger')

function clear(): void {
  model.value = ''
  trigger.value?.focus()
}
</script>

<template>
  <span class="kit-color-field">
    <!-- The button takes the field's id, so the label's `for` and the open picker's name both
         reach it. -->
    <KitPopover :id="id" align="start">
      <template #trigger>
        <button
          ref="trigger"
          type="button"
          class="kit-color-field__trigger"
          :aria-describedby="describedBy"
          :aria-invalid="invalid || undefined"
          :disabled="disabled"
        >
          <ColorSwatch class="kit-color-field__swatch" :color="color" aria-hidden="true" />
          <span :id="valueId" class="kit-color-field__value">{{ shownValue ?? noneText }}</span>
          <span class="kit-color-field__chevron" aria-hidden="true">
            <slot name="chevron"><KitGlyph name="chevron" /></slot>
          </span>
        </button>
      </template>
      <div class="kit-color-picker">
        <ColorAreaRoot
          v-slot="{ style }"
          v-model="working"
          color-space="hsb"
          x-channel="saturation"
          y-channel="brightness"
        >
          <ColorAreaArea class="kit-color-picker__area" :style="style">
            <ColorAreaThumb class="kit-color-picker__thumb" />
          </ColorAreaArea>
        </ColorAreaRoot>
        <ColorSliderRoot
          v-model="working"
          channel="hue"
          color-space="hsb"
          class="kit-color-picker__slider"
        >
          <ColorSliderTrack class="kit-color-picker__track" />
          <ColorSliderThumb class="kit-color-picker__thumb" />
        </ColorSliderRoot>
        <ColorSliderRoot
          v-if="alpha"
          v-model="working"
          channel="alpha"
          color-space="hsb"
          class="kit-color-picker__slider"
        >
          <ColorSliderTrack class="kit-color-picker__track" />
          <ColorSliderThumb class="kit-color-picker__thumb" />
        </ColorSliderRoot>
        <ColorSwatchPickerRoot
          v-if="presets.length"
          :model-value="preset"
          class="kit-color-picker__presets"
          :aria-label="presetsLabel"
          @update:model-value="choosePreset"
        >
          <ColorSwatchPickerItem
            v-for="p in presets"
            :key="p.value"
            :value="p.value"
            class="kit-color-picker__preset"
            :aria-label="p.name"
            :title="p.name"
          >
            <ColorSwatchPickerItemSwatch class="kit-color-picker__preset-swatch" />
            <ColorSwatchPickerItemIndicator class="kit-color-picker__preset-check">
              <slot name="check"><KitGlyph name="check" /></slot>
            </ColorSwatchPickerItemIndicator>
          </ColorSwatchPickerItem>
        </ColorSwatchPickerRoot>
        <div class="kit-color-picker__hex">
          <label :for="hexId" class="kit-color-picker__label">Hex</label>
          <ColorFieldRoot v-model="working">
            <ColorFieldInput
              :id="hexId"
              class="kit-color-picker__input"
              autocomplete="off"
              spellcheck="false"
            />
          </ColorFieldRoot>
        </div>
      </div>
    </KitPopover>
    <KitIconButton v-if="color && !disabled" :label="clearLabel" variant="plain" @click="clear">
      <slot name="clear"><KitGlyph name="cross" /></slot>
    </KitIconButton>
  </span>
</template>

<style>
@layer kit {
  .kit-color-field {
    display: flex;
    align-items: center;
    gap: var(--kit-space-xs);
    min-width: 0;
  }

  .kit-color-field__trigger {
    box-sizing: border-box;
    display: inline-flex;
    align-items: center;
    gap: var(--kit-space-xs);
    width: 100%;
    min-width: 0;
    max-width: var(--kit-width-color-field);
    min-height: var(--kit-control-height);
    padding: var(--kit-space-2xs) var(--kit-space-sm) var(--kit-space-2xs) var(--kit-space-2xs);
    border: var(--kit-control-border-width) solid var(--kit-control-border);
    border-radius: var(--kit-radius-md);
    background: var(--kit-surface-raised);
    color: var(--kit-text);
    font: inherit;
    text-align: start;
    cursor: pointer;
  }

  .kit-color-field__trigger:focus-visible {
    outline: var(--kit-focus-ring-width) solid var(--kit-focus-ring);
    outline-offset: var(--kit-focus-ring-offset);
  }

  .kit-color-field__trigger[aria-invalid='true'] {
    border-color: var(--kit-danger);
    box-shadow: inset 0 0 0 1px var(--kit-danger);
  }

  .kit-color-field__trigger:disabled {
    cursor: not-allowed;
    opacity: 0.6;
  }

  .kit-color-field__swatch {
    box-sizing: border-box;
    flex: none;
    width: calc(
      var(--kit-control-height) - 2 * var(--kit-space-2xs) - 2 * var(--kit-control-border-width)
    );
    aspect-ratio: 1;
    border: var(--kit-control-border-width) solid var(--kit-control-border);
    border-radius: var(--kit-radius-sm);
    background: var(--reka-color-swatch-color);
  }

  /* No color chosen: an empty square crossed through. */
  .kit-color-field__swatch[data-no-color] {
    background: linear-gradient(
      to top right,
      transparent calc(50% - 1px),
      var(--kit-control-border) 50%,
      transparent calc(50% + 1px)
    );
  }

  .kit-color-field__value {
    flex: 1;
    min-width: 0;
    font-variant-numeric: tabular-nums;
  }

  .kit-color-field__chevron {
    display: inline-flex;
    flex: none;
  }

  .kit-color-picker {
    display: flex;
    flex-direction: column;
    gap: var(--kit-space-sm);
    width: 15.5rem;
    max-width: 100%;
  }

  .kit-color-picker__area {
    position: relative;
    height: 10rem;
    border-radius: var(--kit-radius-sm);
    cursor: crosshair;
  }

  .kit-color-picker__slider {
    position: relative;
    display: flex;
    align-items: center;
    height: var(--kit-control-height);
    touch-action: none;
    user-select: none;
  }

  .kit-color-picker__track {
    position: relative;
    flex: 1;
    height: 0.75rem;
    border-radius: var(--kit-radius-full);
  }

  /* A thumb is white edged in black, which shows on any color the area or the hues draw. */
  .kit-color-picker__thumb {
    box-sizing: border-box;
    display: block;
    width: 1.5rem;
    height: 1.5rem;
    border: 3px solid rgb(255 255 255);
    border-radius: var(--kit-radius-full);
    box-shadow:
      0 0 0 1px rgb(0 0 0 / 60%),
      inset 0 0 0 1px rgb(0 0 0 / 60%);
    cursor: grab;
  }

  .kit-color-picker__thumb:focus-visible {
    outline: var(--kit-focus-ring-width) solid var(--kit-focus-ring);
    outline-offset: var(--kit-focus-ring-offset);
  }

  .kit-color-picker__presets {
    display: flex;
    flex-wrap: wrap;
    gap: var(--kit-space-2xs);
  }

  .kit-color-picker__preset {
    position: relative;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: var(--kit-control-height);
    height: var(--kit-control-height);
    border-radius: var(--kit-radius-sm);
    cursor: pointer;
  }

  .kit-color-picker__preset:focus-visible,
  .kit-color-picker__preset[data-highlighted] {
    outline: var(--kit-focus-ring-width) solid var(--kit-focus-ring);
    outline-offset: 1px;
  }

  .kit-color-picker__preset-swatch {
    position: absolute;
    inset: 0;
    border: var(--kit-control-border-width) solid var(--kit-control-border);
    border-radius: var(--kit-radius-sm);
    background: var(--reka-color-swatch-color);
  }

  /* The chosen preset's check, white on a dark disc, which shows on any preset. */
  .kit-color-picker__preset-check {
    position: relative;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 1.5rem;
    height: 1.5rem;
    border-radius: var(--kit-radius-full);
    background: rgb(0 0 0 / 70%);
    color: rgb(255 255 255);
  }

  .kit-color-picker__hex {
    display: flex;
    align-items: center;
    gap: var(--kit-space-xs);
  }

  .kit-color-picker__label {
    font-weight: var(--kit-font-weight-strong);
  }

  .kit-color-picker__input {
    box-sizing: border-box;
    flex: 1;
    width: 100%;
    min-width: 0;
    min-height: var(--kit-control-height);
    padding: var(--kit-space-xs) var(--kit-space-sm);
    border: var(--kit-control-border-width) solid var(--kit-control-border);
    border-radius: var(--kit-radius-md);
    background: var(--kit-surface-raised);
    color: var(--kit-text);
    font: inherit;
    font-variant-numeric: tabular-nums;
  }

  .kit-color-picker__input:focus-visible {
    outline: var(--kit-focus-ring-width) solid var(--kit-focus-ring);
    outline-offset: var(--kit-focus-ring-offset);
  }
}
</style>
