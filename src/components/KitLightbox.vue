<script setup lang="ts">
// Images shown one at a time, as large as the screen allows, over the page: a modal that holds
// focus, locks the page behind it, closes on Escape or a press beside the image, and gives focus
// back to what opened it. Open it with `v-model:open`, at the image `v-model:index` names; it is
// named by the image's own description. With several images, the arrow keys and the Previous and
// Next buttons move through them, going round at either end, and each is read out as it shows.
// "Full size" shows an image at its own size, to scroll round. A bar below holds the caption, the
// image's place among the rest and a link to its original, on the raised surface, so its words
// keep their contrast whatever the image is. Icons come from the slots, the kit's own by default.
//
// On a touch screen a swipe across the image moves to the next or the previous. At full size the
// image pans by dragging it, as well as by scrolling and by the arrow keys; a drag is never taken
// for the press beside the image that closes the viewer. The `actions` slot, given the image on
// screen and its place, puts the app's own buttons in the bar, such as Report. A page that opens
// the viewer from anywhere, without a component of its own, calls `openLightbox()`, which a
// KitLightboxHost at the app's root answers.
import { computed, ref, useTemplateRef, watch } from 'vue'
import { DialogContent, DialogOverlay, DialogPortal, DialogRoot, DialogTitle } from 'reka-ui'
import { announce } from '../composables/useAnnouncer'
import KitAnnouncer from './KitAnnouncer.vue'
import KitButton from './KitButton.vue'
import KitGlyph from './KitGlyph.vue'
import KitIconButton from './KitIconButton.vue'
import type { KitLightboxImage } from './lightbox'

const props = withDefaults(
  defineProps<{
    images: KitLightboxImage[]
    closeLabel?: string
    previousLabel?: string
    nextLabel?: string
    fullSizeLabel?: string
    originalLabel?: string
  }>(),
  {
    closeLabel: 'Close',
    previousLabel: 'Previous image',
    nextLabel: 'Next image',
    fullSizeLabel: 'Full size',
    originalLabel: 'Open the original in a new tab',
  },
)

const open = defineModel<boolean>('open', { default: false })
const index = defineModel<number>('index', { default: 0 })

defineSlots<{
  /** The app's own buttons in the bar, given the image on screen and its place among the rest. */
  actions?: (props: { image: KitLightboxImage; index: number }) => unknown
  'close-icon'?: () => unknown
  'previous-icon'?: () => unknown
  'next-icon'?: () => unknown
  'original-icon'?: () => unknown
}>()

const fullSize = ref(false)
const close = useTemplateRef<{ $el: HTMLElement }>('close')

const count = computed(() => props.images.length)
const shown = computed(() => Math.min(Math.max(index.value, 0), Math.max(count.value - 1, 0)))
const current = computed(() => props.images[shown.value])
const place = computed(() => `${String(shown.value + 1)} of ${String(count.value)}`)

watch(open, () => {
  fullSize.value = false
})

// Read out from the new place itself: where the page holds the index, the model still gives the
// old one until the page has passed the new one back.
function move(step: number): void {
  const next = (shown.value + step + count.value) % count.value
  index.value = next
  fullSize.value = false
  const image = props.images[next]
  if (image) {
    announce(`${image.alt}, ${String(next + 1)} of ${String(count.value)}`, 'polite')
  }
}

// At its own size, an image scrolls under the arrow keys, so they move through the images only
// while it fits the screen.
function onKeydown(event: KeyboardEvent): void {
  if (count.value < 2 || fullSize.value) {
    return
  }
  if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
    event.preventDefault()
    move(event.key === 'ArrowLeft' ? -1 : 1)
  }
}

// How far a swipe goes, in pixels, before it moves to another image, and how far any press
// may wander before it is a drag rather than a press.
const SWIPE = 48
const WANDER = 4

let swipeFrom: { x: number; y: number } | undefined
let panFrom: { x: number; y: number; left: number; top: number } | undefined
// Whether the press under way has moved, so the click it ends in closes nothing.
let dragged = false

function onPointerDown(event: PointerEvent): void {
  dragged = false
  const stage = event.currentTarget as HTMLElement
  if (fullSize.value && event.pointerType === 'mouse' && event.button === 0) {
    panFrom = { x: event.clientX, y: event.clientY, left: stage.scrollLeft, top: stage.scrollTop }
    stage.setPointerCapture(event.pointerId)
  } else if (!fullSize.value && event.pointerType !== 'mouse' && count.value > 1) {
    swipeFrom = { x: event.clientX, y: event.clientY }
  }
}

function onPointerMove(event: PointerEvent): void {
  const from = panFrom ?? swipeFrom
  if (!from) {
    return
  }
  const [dx, dy] = [event.clientX - from.x, event.clientY - from.y]
  if (Math.hypot(dx, dy) > WANDER) {
    dragged = true
  }
  if (panFrom) {
    const stage = event.currentTarget as HTMLElement
    stage.scrollLeft = panFrom.left - dx
    stage.scrollTop = panFrom.top - dy
  }
}

function onPointerUp(event: PointerEvent): void {
  if (swipeFrom) {
    const [dx, dy] = [event.clientX - swipeFrom.x, event.clientY - swipeFrom.y]
    if (Math.abs(dx) > SWIPE && Math.abs(dx) > 2 * Math.abs(dy)) {
      dragged = true
      move(dx < 0 ? 1 : -1)
    }
  }
  swipeFrom = undefined
  panFrom = undefined
}

/** A press beside the image closes the viewer, unless it was a drag or a swipe. */
function pressedBeside(): void {
  if (!dragged) {
    open.value = false
  }
  dragged = false
}

/** It opens on Close, the way out, rather than on Previous, the first thing it holds. */
function onOpenAutoFocus(event: Event): void {
  event.preventDefault()
  close.value?.$el.focus()
}
</script>

<template>
  <DialogRoot v-model:open="open">
    <DialogPortal>
      <DialogOverlay class="kit-lightbox__overlay" />
      <DialogContent
        class="kit-lightbox"
        aria-modal="true"
        v-bind="{ 'aria-describedby': undefined }"
        @keydown="onKeydown"
        @open-auto-focus="onOpenAutoFocus"
      >
        <DialogTitle class="kit-lightbox__title">{{ current?.alt }}</DialogTitle>
        <!-- A press beside the image is the pointer's way out, as Escape is the keyboard's. -->
        <!-- eslint-disable-next-line vuejs-accessibility/click-events-have-key-events, vuejs-accessibility/no-static-element-interactions -- the pointer's Escape -->
        <div
          class="kit-lightbox__stage"
          :class="{ 'kit-lightbox__stage--full-size': fullSize }"
          :tabindex="fullSize ? 0 : undefined"
          :role="fullSize ? 'group' : undefined"
          :aria-label="fullSize ? current?.alt : undefined"
          @click.self="pressedBeside"
          @pointerdown="onPointerDown"
          @pointermove="onPointerMove"
          @pointerup="onPointerUp"
          @pointercancel="onPointerUp"
        >
          <picture v-if="current" :key="shown" class="kit-lightbox__picture">
            <source
              v-for="source in current.sources ?? []"
              :key="source.srcset"
              :srcset="source.srcset"
              :type="source.type"
            />
            <img class="kit-lightbox__image" :src="current.src" :alt="current.alt" />
          </picture>
          <template v-if="count > 1">
            <KitIconButton
              class="kit-lightbox__step kit-lightbox__step--previous"
              :label="previousLabel"
              variant="secondary"
              @click="move(-1)"
            >
              <slot name="previous-icon"><KitGlyph name="previous" /></slot>
            </KitIconButton>
            <KitIconButton
              class="kit-lightbox__step kit-lightbox__step--next"
              :label="nextLabel"
              variant="secondary"
              @click="move(1)"
            >
              <slot name="next-icon"><KitGlyph name="next" /></slot>
            </KitIconButton>
          </template>
        </div>
        <div class="kit-lightbox__bar">
          <p class="kit-lightbox__caption">
            <span v-if="current?.caption">{{ current.caption }}</span>
            <span v-if="count > 1" class="kit-lightbox__place">{{ place }}</span>
          </p>
          <div class="kit-lightbox__actions">
            <slot v-if="current" name="actions" :image="current" :index="shown" />
            <KitButton
              v-if="current?.href"
              :href="current.href"
              variant="quiet"
              target="_blank"
              rel="noopener"
            >
              <template #icon><slot name="original-icon" /></template>
              {{ originalLabel }}
            </KitButton>
            <KitButton variant="plain" :aria-pressed="fullSize" @click="fullSize = !fullSize">
              {{ fullSizeLabel }}
            </KitButton>
            <KitButton ref="close" variant="plain" @click="open = false">
              <template #icon
                ><slot name="close-icon"><KitGlyph name="cross" /></slot
              ></template>
              {{ closeLabel }}
            </KitButton>
          </div>
        </div>
        <!-- While it is open, a move and a toast are read out from here: some screen readers hear
             no live region outside an aria-modal dialog. -->
        <KitAnnouncer />
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>

<style scoped>
@layer kit {
  .kit-lightbox__overlay {
    position: fixed;
    inset: 0;
    z-index: var(--kit-layer-dialog);
    background: var(--kit-scrim);
  }

  /* The whole screen: the image over the scrim, and the bar along the bottom. */
  .kit-lightbox {
    box-sizing: border-box;
    position: fixed;
    inset: 0;
    z-index: var(--kit-layer-dialog);
    display: grid;
    grid-template-rows: minmax(0, 1fr) auto;
  }

  .kit-lightbox:focus {
    outline: none;
  }

  .kit-lightbox__title {
    position: absolute;
    width: 1px;
    height: 1px;
    margin: -1px;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
  }

  /* One cell the size of the stage, so an image that fits is held to it. */
  .kit-lightbox__stage {
    box-sizing: border-box;
    position: relative;
    display: grid;
    grid-template: minmax(0, 1fr) / minmax(0, 1fr);
    place-items: center;
    min-height: 0;
    padding: var(--kit-space-md);
    overflow: hidden;
    touch-action: pan-y pinch-zoom;
  }

  .kit-lightbox__stage--full-size {
    place-items: start;
    overflow: auto;
    cursor: grab;
    touch-action: auto;
  }

  .kit-lightbox__stage--full-size:active {
    cursor: grabbing;
  }

  .kit-lightbox__stage--full-size:focus-visible {
    outline: var(--kit-focus-ring-width) solid var(--kit-focus-ring);
    outline-offset: calc(-1 * var(--kit-focus-ring-width));
  }

  .kit-lightbox__picture {
    display: contents;
  }

  .kit-lightbox__image {
    display: block;
    max-width: 100%;
    max-height: 100%;
    object-fit: contain;
  }

  .kit-lightbox__stage--full-size .kit-lightbox__image {
    max-width: none;
    max-height: none;
  }

  .kit-lightbox__step {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
  }

  .kit-lightbox__step--previous {
    left: var(--kit-space-md);
  }

  .kit-lightbox__step--next {
    right: var(--kit-space-md);
  }

  .kit-lightbox__bar {
    box-sizing: border-box;
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: var(--kit-space-xs) var(--kit-space-md);
    padding: var(--kit-space-xs) var(--kit-space-md);
    border-top: var(--kit-control-border-width) solid var(--kit-hairline);
    background: var(--kit-surface-raised);
    color: var(--kit-text);
  }

  .kit-lightbox__caption {
    display: flex;
    flex-wrap: wrap;
    gap: var(--kit-space-2xs) var(--kit-space-sm);
    max-width: var(--kit-measure-prose);
    margin: 0;
  }

  .kit-lightbox__place {
    color: var(--kit-text-muted);
  }

  .kit-lightbox__actions {
    display: flex;
    flex-wrap: wrap;
    gap: var(--kit-space-xs);
    margin-inline-start: auto;
  }
}
</style>
