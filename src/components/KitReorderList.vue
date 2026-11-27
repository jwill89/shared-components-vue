<script setup lang="ts" generic="T extends object">
// A list a person puts in order, its model the rows in the order they stand. Each row moves three
// ways: by its Up and Down buttons, by the arrow keys on its handle (Home and End take it to
// either end), and by dragging its handle, which a finger holds without scrolling the page. What
// was pressed moves with its row and keeps the focus, so a second press goes on from the first,
// and each move is read out: the row's name, and its place among them ("Emma, 2 of 5"). A row
// being dragged is lifted and follows the pointer within the list, and the rows it passes slide
// aside to open the place it would take, so where it lands is where it is seen; held near either
// edge of the list's frame it scrolls it, and Escape puts the row back. A row's content is its
// name, or the `row` slot's.
import { computed, nextTick, ref, useTemplateRef } from 'vue'
import KitButton from './KitButton.vue'
import KitGlyph from './KitGlyph.vue'
import { announce } from '../composables/useAnnouncer'
import { fieldOf, textOf } from './dataTable'

const props = withDefaults(
  defineProps<{
    /** What the list holds, which names it: "Pages, in the order they show". */
    label: string
    /** A row's own key: the name of its field, or what gives it. */
    rowKey: string | ((row: T) => string | number)
    /** A row's name, for its buttons and for what is read as it moves: its field, or what gives it. */
    rowLabel: string | ((row: T) => string)
    disabled?: boolean
    /** What a row's Up button says. */
    upText?: string
    /** What a row's Down button says. */
    downText?: string
    /** A row's Up button's whole name, given the row's. */
    upLabel?: (label: string) => string
    /** A row's Down button's whole name, given the row's. */
    downLabel?: (label: string) => string
    /** A row's handle's name, given the row's. */
    handleLabel?: (label: string) => string
    /** What is read once a row has moved, given its name, its place from 1, and the count. */
    placeText?: (label: string, place: number, count: number) => string
  }>(),
  {
    disabled: false,
    upText: 'Up',
    downText: 'Down',
    upLabel: (label: string) => `Move ${label} up`,
    downLabel: (label: string) => `Move ${label} down`,
    handleLabel: (label: string) => `Move ${label}: drag, or press the up and down arrow keys`,
    placeText: (label: string, place: number, count: number) =>
      `${label}, ${String(place)} of ${String(count)}`,
  },
)

const emit = defineEmits<{
  /** A row has moved, from one place to another, each counted from 0. */
  move: [row: T, from: number, to: number]
}>()

const rows = defineModel<T[]>({ default: () => [] })

defineSlots<{
  /** A row's content; its name by default. */
  row?: (props: { row: T; index: number }) => unknown
  /** The handle's icon; a grip by default. */
  'handle-icon'?: () => unknown
}>()

function keyOf(row: T): string | number {
  if (typeof props.rowKey === 'function') {
    return props.rowKey(row)
  }
  const key = fieldOf(row, props.rowKey)
  return typeof key === 'number' ? key : textOf(key)
}

function nameOf(row: T): string {
  return typeof props.rowLabel === 'function'
    ? props.rowLabel(row)
    : textOf(fieldOf(row, props.rowLabel))
}

const list = useTemplateRef<HTMLOListElement>('list')

/** Moves the row at `from` to `to`, the rest closing up around it, and says where it went. */
function place(from: number, to: number): void {
  const count = rows.value.length
  const row = rows.value[from]
  if (!row || from === to) {
    return
  }
  const next = [...rows.value]
  next.splice(to, 0, ...next.splice(from, 1))
  rows.value = next
  emit('move', row, from, to)
  announce(props.placeText(nameOf(row), to + 1, count), 'polite')
}

type Control = 'handle' | 'up' | 'down'

/** A move by a button or a key, the focus following what was pressed to the row's new place. */
async function step(from: number, to: number, control: Control): Promise<void> {
  if (props.disabled || to < 0 || to >= rows.value.length || to === from) {
    return
  }
  place(from, to)
  await nextTick()
  const row = list.value?.children[to]
  const again = row?.querySelector<HTMLElement>(`[data-move="${control}"]:not(:disabled)`)
  ;(again ?? row?.querySelector<HTMLElement>('[data-move="handle"]'))?.focus()
}

function onHandleKey(event: KeyboardEvent, index: number): void {
  if (event.key === 'Escape' && drag.value) {
    event.preventDefault()
    drag.value = undefined
    return
  }
  const to = {
    ArrowUp: index - 1,
    ArrowDown: index + 1,
    Home: 0,
    End: rows.value.length - 1,
  }[event.key]
  if (to === undefined) {
    return
  }
  event.preventDefault()
  void step(index, to, 'handle')
}

/**
 * The row in hand: where it started and where it would land, how far it has been carried, and
 * what was measured as it was picked up, in the page as it then stood: its top and bottom, the
 * room it may move in, every row's middle, and how far the frame had scrolled.
 */
interface Drag {
  from: number
  to: number
  offset: number
  startY: number
  top: number
  bottom: number
  least: number
  most: number
  middles: number[]
  frame: Element
  scrolled: number
}
const drag = ref<Drag>()

/** The nearest frame that scrolls the list, or the page. */
function frameOf(element: Element): Element {
  for (let at = element.parentElement; at; at = at.parentElement) {
    const { overflowY } = getComputedStyle(at)
    if ((overflowY === 'auto' || overflowY === 'scroll') && at.scrollHeight > at.clientHeight) {
      return at
    }
  }
  return document.scrollingElement ?? document.documentElement
}

function grab(event: PointerEvent, index: number): void {
  const rowsDrawn = list.value ? [...list.value.children] : []
  const held = rowsDrawn[index]?.getBoundingClientRect()
  if (
    !held ||
    !list.value ||
    props.disabled ||
    (event.pointerType === 'mouse' && event.button !== 0)
  ) {
    return
  }
  ;(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)
  const room = list.value.getBoundingClientRect()
  const frame = frameOf(list.value)
  drag.value = {
    from: index,
    to: index,
    offset: 0,
    startY: event.clientY,
    top: held.top,
    bottom: held.bottom,
    least: room.top - held.top,
    most: room.bottom - held.bottom,
    middles: rowsDrawn.map((row) => {
      const box = row.getBoundingClientRect()
      return box.top + box.height / 2
    }),
    frame,
    scrolled: frame.scrollTop,
  }
}

/** How near either edge of its frame a row in hand scrolls it, in px. */
const EDGE = 48
/** How far a frame scrolls for each move near its edge, in px. */
const NUDGE = 16

function carry(event: PointerEvent): void {
  const held = drag.value
  if (!held) {
    return
  }
  // Carried as far as the pointer has moved, and the frame scrolled, within the list. Going up,
  // it lands before each row whose middle its top has passed; going down, after each row whose
  // middle its bottom has passed, so held against either end of the list it lands there.
  const scrolled = held.frame.scrollTop - held.scrolled
  held.offset = Math.min(Math.max(event.clientY - held.startY + scrolled, held.least), held.most)
  const heldTop = held.top + held.offset
  const heldBottom = held.bottom + held.offset
  const passedAbove = held.middles.slice(0, held.from).filter((middle) => heldTop < middle).length
  const passedBelow = held.middles
    .slice(held.from + 1)
    .filter((middle) => heldBottom > middle).length
  held.to = held.from - passedAbove + passedBelow
  const frame = held.frame
  const page = frame === document.scrollingElement || frame === document.documentElement
  const top = page ? 0 : frame.getBoundingClientRect().top
  const bottom = page ? window.innerHeight : frame.getBoundingClientRect().bottom
  if (event.clientY < top + EDGE) {
    frame.scrollBy(0, -NUDGE)
  } else if (event.clientY > bottom - EDGE) {
    frame.scrollBy(0, NUDGE)
  }
}

function drop(): void {
  const held = drag.value
  drag.value = undefined
  if (held) {
    place(held.from, held.to)
  }
}

/**
 * Where a row is drawn while one is in hand: the held row where it has been carried, and each row
 * between where it was and where it would land moved aside by its height, to make the room.
 */
function shiftOf(index: number): Record<string, string> | undefined {
  const held = drag.value
  if (!held) {
    return undefined
  }
  let by = 0
  if (index === held.from) {
    by = held.offset
  } else if (held.from < index && index <= held.to) {
    by = -(held.bottom - held.top)
  } else if (held.to <= index && index < held.from) {
    by = held.bottom - held.top
  }
  return { transform: `translateY(${String(by)}px)` }
}

const last = computed(() => rows.value.length - 1)
</script>

<template>
  <ol
    ref="list"
    class="kit-reorder-list"
    :class="{ 'kit-reorder-list--moving': drag }"
    :aria-label="label"
  >
    <li
      v-for="(row, index) in rows"
      :key="keyOf(row)"
      class="kit-reorder-list__row"
      :class="{ 'kit-reorder-list__row--held': drag?.from === index }"
      :style="shiftOf(index)"
    >
      <button
        type="button"
        class="kit-reorder-list__handle"
        data-move="handle"
        :aria-label="handleLabel(nameOf(row))"
        :disabled="disabled"
        @pointerdown="grab($event, index)"
        @pointermove="carry"
        @pointerup="drop"
        @pointercancel="drag = undefined"
        @keydown="onHandleKey($event, index)"
      >
        <slot name="handle-icon"><KitGlyph name="grip" /></slot>
      </button>
      <span class="kit-reorder-list__content">
        <slot name="row" :row="row" :index="index">{{ nameOf(row) }}</slot>
      </span>
      <KitButton
        variant="plain"
        size="small"
        data-move="up"
        :aria-label="upLabel(nameOf(row))"
        :disabled="disabled || index === 0"
        @click="step(index, index - 1, 'up')"
      >
        {{ upText }}
      </KitButton>
      <KitButton
        variant="plain"
        size="small"
        data-move="down"
        :aria-label="downLabel(nameOf(row))"
        :disabled="disabled || index === last"
        @click="step(index, index + 1, 'down')"
      >
        {{ downText }}
      </KitButton>
    </li>
  </ol>
</template>

<style>
@layer kit {
  .kit-reorder-list {
    margin: 0;
    padding: 0;
    border-bottom: var(--kit-control-border-width) solid var(--kit-hairline);
    list-style: none;
  }

  .kit-reorder-list__row {
    position: relative;
    box-sizing: border-box;
    display: flex;
    align-items: center;
    gap: var(--kit-space-xs);
    min-height: var(--kit-control-height);
    border-top: var(--kit-control-border-width) solid var(--kit-hairline);
  }

  .kit-reorder-list__content {
    flex: 1;
    min-width: 0;
    overflow-wrap: anywhere;
  }

  /* The handle takes the touch for itself: a finger on it drags the row and doesn't scroll. */
  .kit-reorder-list__handle {
    box-sizing: border-box;
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
    color: var(--kit-text-muted);
    cursor: grab;
    touch-action: none;
  }

  .kit-reorder-list__handle:focus-visible {
    outline: var(--kit-focus-ring-width) solid var(--kit-focus-ring);
    outline-offset: calc(-1 * var(--kit-focus-ring-width));
  }

  .kit-reorder-list__handle:disabled {
    cursor: not-allowed;
    opacity: 0.6;
  }

  /* While a row is in hand, the others slide aside to make its room; once it is let go, each is
     drawn where it now stands, with nothing left to slide. Nothing is picked up as text. */
  .kit-reorder-list--moving {
    user-select: none;
  }

  .kit-reorder-list--moving .kit-reorder-list__row {
    transition: transform var(--kit-duration-quick) ease-out;
  }

  /* The row in hand is lifted over the others, on a surface and a shadow of its own, and follows
     the pointer without lag; its handle takes the accent. */
  .kit-reorder-list--moving .kit-reorder-list__row--held {
    z-index: 1;
    border-radius: var(--kit-radius-md);
    background: var(--kit-surface-raised);
    box-shadow: var(--kit-shadow-overlay);
    transition: none;
  }

  .kit-reorder-list__row--held .kit-reorder-list__handle {
    color: var(--kit-accent);
    cursor: grabbing;
  }

  /* A handle under the pointer is washed as a plain button is. */
  .kit-reorder-list__handle:hover:not(:disabled) {
    background: color-mix(in srgb, var(--kit-text) 6%, transparent);
    color: var(--kit-text);
  }

  @media (prefers-reduced-motion: reduce) {
    .kit-reorder-list--moving .kit-reorder-list__row {
      transition: none;
    }
  }
}
</style>
