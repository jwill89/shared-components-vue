<script setup lang="ts">
// A text box of several lines, inside a KitFormField, with a running count against `limit`
// when there is one. The count never stops the typing: text past the limit stays, marked as
// over, since the server refuses it rather than cutting it short. A screen reader hears the
// count when the box is focused, and is told as the remainder runs low, not at every key.
// Any other textarea attribute (placeholder, name, autocomplete) passes through to the box.
//
// Given `grow`, the box grows with its text from `rows` lines up to `maxRows`, then scrolls, so
// what is typed is never hidden behind a scroll bar in a box with room to spare. The browser
// grows it where it can (`field-sizing: content`); elsewhere the box is measured as it changes.
import { computed, nextTick, onBeforeUnmount, onMounted, useId, useTemplateRef, watch } from 'vue'
import { formatCount } from '../format'

const props = withDefaults(
  defineProps<{
    id?: string
    /** The ids of the text that describes the box: its error and hint, from KitFormField. */
    describedBy?: string
    invalid?: boolean
    /** The most characters the value may hold, as the server checks it; no count without one. */
    limit?: number
    /** Its height in lines, or the least it is, where it grows. */
    rows?: number
    /** Grows with its text. */
    grow?: boolean
    /** The most lines it grows to before it scrolls. */
    maxRows?: number
  }>(),
  {
    id: undefined,
    describedBy: undefined,
    invalid: false,
    limit: Infinity,
    rows: 4,
    grow: false,
    maxRows: 12,
  },
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
const box = useTemplateRef<HTMLTextAreaElement>('box')

// Where the browser can't size the box to its text, it is measured: its height let go, then set
// to what its text takes, at each change of the text and of the box's width.
const measured = typeof CSS === 'undefined' || !CSS.supports('field-sizing', 'content')
let width = 0
let watcher: ResizeObserver | undefined

function fit(): void {
  const element = box.value
  if (!props.grow || !measured || !element) {
    return
  }
  const edges = element.offsetHeight - element.clientHeight
  element.style.height = 'auto'
  element.style.height = `${String(element.scrollHeight + edges)}px`
}

watch(
  () => [model.value, props.grow],
  () => {
    void nextTick(fit)
  },
)

onMounted(() => {
  fit()
  if (measured && typeof ResizeObserver !== 'undefined' && box.value) {
    watcher = new ResizeObserver(([entry]) => {
      const now = entry?.contentRect.width ?? 0
      if (now !== width) {
        width = now
        fit()
      }
    })
    watcher.observe(box.value)
  }
})

onBeforeUnmount(() => {
  watcher?.disconnect()
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
      ref="box"
      v-model="model"
      class="kit-textarea__box"
      :class="{ 'is-growing': grow }"
      :style="
        grow ? { '--kit-textarea-rows': rows, '--kit-textarea-max-rows': maxRows } : undefined
      "
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

  /* Growing, the box is as tall as its text, between its rows and its most, which take in its
     space and edges; the browser sizes it where it can, and the script where it can't. */
  .kit-textarea__box.is-growing {
    --kit-textarea-rows: 4;
    --kit-textarea-max-rows: 12;
    --kit-textarea-edges: calc(2 * var(--kit-space-xs) + 2 * var(--kit-control-border-width));

    min-height: calc(var(--kit-textarea-rows) * 1lh + var(--kit-textarea-edges));
    max-height: calc(var(--kit-textarea-max-rows) * 1lh + var(--kit-textarea-edges));
    overflow-y: auto;
    resize: none;
    field-sizing: content;
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
