<script setup lang="ts">
// A text box of several lines, inside a KitFormField, with a running count against `limit`
// when there is one. The count never stops the typing: text past the limit stays, marked as
// over, since the server refuses it rather than cutting it short. A screen reader hears the
// count when the box is focused, and is told as the remainder runs low, not at every key.
// Any other textarea attribute (placeholder, name, autocomplete) passes through to the box.
import { computed, useId } from 'vue'
import { formatCount } from '../format'

const props = withDefaults(
  defineProps<{
    id?: string
    /** The ids of the text that describes the box: its error and hint, from KitFormField. */
    describedBy?: string
    invalid?: boolean
    /** The most characters the value may hold, as the server checks it; no count without one. */
    limit?: number
    rows?: number
  }>(),
  { id: undefined, describedBy: undefined, invalid: false, limit: Infinity, rows: 4 },
)

const model = defineModel<string>({ required: true })

// The attributes an app gives (placeholder, name) belong on the box, not the wrapper round it.
defineOptions({ inheritAttrs: false })

/** The point from which the remainder is announced as it falls. */
const warnAt = 20

const countId = `${useId()}-count`
// Counted in code points, so an emoji counts once, as a server counting runes does.
const used = computed(() => Array.from(model.value).length)
const counted = computed(() => Number.isFinite(props.limit))
const left = computed(() => props.limit - used.value)
const over = computed(() => left.value < 0)
const describedBy = computed(
  () => [props.describedBy, counted.value ? countId : ''].filter(Boolean).join(' ') || undefined,
)
const count = computed(() => {
  const shown = `${formatCount(used.value)} / ${formatCount(props.limit)}`
  return over.value ? `${shown} (${formatCount(-left.value)} over)` : shown
})
const announcement = computed(() => {
  if (left.value > warnAt) {
    return ''
  }
  return over.value
    ? `${formatCount(-left.value)} characters over the limit`
    : `${formatCount(left.value)} characters left`
})
</script>

<template>
  <div class="kit-textarea">
    <textarea
      v-bind="$attrs"
      :id="id"
      v-model="model"
      class="kit-textarea__box"
      :rows="rows"
      :aria-describedby="describedBy"
      :aria-invalid="invalid || over || undefined"
    ></textarea>
    <template v-if="counted">
      <p :id="countId" class="kit-textarea__count" :class="{ 'is-over': over }">{{ count }}</p>
      <p class="kit-textarea__announcement" aria-live="polite">{{ announcement }}</p>
    </template>
  </div>
</template>

<style scoped>
@layer kit {
  .kit-textarea {
    display: flex;
    flex-direction: column;
    gap: var(--kit-space-2xs);
    min-width: 0;
  }

  .kit-textarea__box {
    box-sizing: border-box;
    width: 100%;
    min-width: 0;
    padding: var(--kit-space-xs) var(--kit-space-sm);
    border: var(--kit-control-border-width) solid var(--kit-control-border);
    border-radius: var(--kit-radius-md);
    background: var(--kit-surface-raised);
    color: var(--kit-text);
    font: inherit;
    line-height: var(--kit-line-height-prose);
    resize: vertical;
  }

  /* The browser's own placeholder grey falls short of AAA; the muted text color holds 7:1. */
  .kit-textarea__box::placeholder {
    color: var(--kit-text-muted);
    opacity: 1;
  }

  .kit-textarea__box:focus-visible {
    outline: var(--kit-focus-ring-width) solid var(--kit-focus-ring);
    outline-offset: var(--kit-focus-ring-offset);
  }

  .kit-textarea__box[aria-invalid='true'] {
    border-color: var(--kit-danger);
    box-shadow: inset 0 0 0 1px var(--kit-danger);
  }

  .kit-textarea__box:disabled {
    cursor: not-allowed;
    opacity: 0.6;
  }

  .kit-textarea__count {
    align-self: flex-end;
    margin: 0;
    color: var(--kit-text-muted);
    font-size: var(--kit-text-size-sm);
    font-variant-numeric: tabular-nums;
  }

  .kit-textarea__count.is-over {
    color: var(--kit-danger);
    font-weight: var(--kit-font-weight-strong);
  }

  /* Read by a screen reader as the remainder runs low, never shown: the count says it. */
  .kit-textarea__announcement {
    position: absolute;
    width: 1px;
    height: 1px;
    margin: 0;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
  }
}
</style>
