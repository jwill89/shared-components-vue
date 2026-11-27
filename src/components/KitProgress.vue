<script setup lang="ts">
// How far a long job has got, as a bar under its name:
// `<KitProgress label="Looking up covers" :value="done" :max="total" :value-text="countText" />`.
// A `value` of null is a job that can't say how far it has got: the bar moves along the track,
// and stands still, striped, where the device asks for less motion, so it never reads as full.
//
// The name shows over the bar unless `labelHidden`, as for a bar across the top of the page, and
// names it either way. `valueText` says how far in words, read with the bar (`aria-valuetext`)
// and shown beside the name: "3 of 8 books". Without it, the bar says its share of the whole,
// "40%". A line under the bar, such as the counts, goes in the default slot.
//
// A bar says nothing as it moves: a screen reader reads it where it stands. What someone must
// hear as the job goes, such as that it has finished, the page says through a toast or its own
// status line.
import { computed, useId } from 'vue'
import { ProgressIndicator, ProgressRoot } from 'reka-ui'
import { formatCount } from '../format'
import { filled } from './slots'

const props = withDefaults(
  defineProps<{
    /** What the job is, which names the bar. */
    label: string
    /** How far it has got, from 0 to `max`; null while it can't say. */
    value: number | null
    max?: number
    /** How far, in words, as the bar is read and shown. */
    valueText?: (value: number, max: number) => string
    /** Whether the name is read but not shown. */
    labelHidden?: boolean
  }>(),
  { max: 100, valueText: undefined, labelHidden: false },
)

defineSlots<{
  /** A line under the bar, such as the counts. */
  default?: () => unknown
}>()

const labelId = `${useId()}-label`

const share = computed(() =>
  props.value === null ? 0 : Math.min(Math.max(props.value / props.max, 0), 1),
)

const said = computed(() => {
  if (props.value === null) {
    return undefined
  }
  return props.valueText
    ? props.valueText(props.value, props.max)
    : `${formatCount(Math.round(share.value * 100))}%`
})
</script>

<template>
  <div class="kit-progress" :class="{ 'is-unknown': value === null }">
    <div class="kit-progress__head" :class="{ 'is-hidden': labelHidden }">
      <span :id="labelId" class="kit-progress__label">{{ label }}</span>
      <span v-if="said" class="kit-progress__value" aria-hidden="true">{{ said }}</span>
    </div>
    <!-- Reka names a bar by its share ("40%") unless told otherwise; the name says what it is. -->
    <ProgressRoot
      :model-value="value"
      :max="max"
      :get-value-label="() => undefined"
      :get-value-text="() => said"
      class="kit-progress__track"
      :aria-labelledby="labelId"
    >
      <ProgressIndicator
        class="kit-progress__bar"
        :style="
          value === null ? undefined : { transform: `translateX(-${String(100 - share * 100)}%)` }
        "
      />
    </ProgressRoot>
    <div v-if="filled($slots.default)" class="kit-progress__note"><slot /></div>
  </div>
</template>

<style scoped>
/*
 * The track is sunken and edged as a field is, and the bar across it the accent, which holds
 * 7:1 on the sunken surface. A bar that can't say how far slides a third of the track's width
 * along it; with less motion asked for, it stands still across the whole track in stripes.
 */
@layer kit {
  .kit-progress {
    display: flex;
    flex-direction: column;
    gap: var(--kit-space-2xs);
    min-width: 0;
  }

  .kit-progress__head {
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    gap: var(--kit-space-xs);
  }

  .kit-progress__head.is-hidden {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
  }

  .kit-progress__label {
    font-weight: var(--kit-font-weight-strong);
  }

  .kit-progress__value {
    color: var(--kit-text-muted);
    font-variant-numeric: tabular-nums;
  }

  .kit-progress__track {
    position: relative;
    box-sizing: border-box;
    height: 0.75rem;
    overflow: hidden;
    border: var(--kit-control-border-width) solid var(--kit-control-border);
    border-radius: var(--kit-radius-full);
    background: var(--kit-surface-sunken);
  }

  .kit-progress__bar {
    width: 100%;
    height: 100%;
    background: var(--kit-accent);
    transition: transform var(--kit-duration-quick) ease;
  }

  .kit-progress.is-unknown .kit-progress__bar {
    width: 33%;
    animation: kit-progress-slide calc(var(--kit-duration-spin) * 1.5) ease-in-out infinite;
  }

  .kit-progress__note {
    color: var(--kit-text-muted);
    font-size: var(--kit-text-size-sm);
  }

  @keyframes kit-progress-slide {
    from {
      transform: translateX(-100%);
    }

    to {
      transform: translateX(300%);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .kit-progress__bar {
      transition: none;
    }

    .kit-progress.is-unknown .kit-progress__bar {
      width: 100%;
      background: repeating-linear-gradient(
        135deg,
        var(--kit-accent) 0 0.5rem,
        transparent 0.5rem 1rem
      );
      animation: none;
    }
  }
}
</style>
