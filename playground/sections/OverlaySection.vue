<script setup lang="ts">
// KitTooltip on a button and on an icon button; KitPopover and KitHelpTip; KitLoadingOverlay over a
// form while a pretend save runs; KitDrawer at either side; and KitLightbox over three pictures,
// opened at whichever is pressed.
import { ref } from 'vue'
import {
  KitButton,
  KitDrawer,
  KitFormField,
  KitHelpTip,
  KitIconButton,
  KitLightbox,
  KitLoadingOverlay,
  KitPagePanel,
  KitPopover,
  KitTextField,
  KitTooltip,
} from '@jwill89/shared-components-vue'
import type { KitLightboxImage } from '@jwill89/shared-components-vue'
import PlaygroundIcon from '../PlaygroundIcon.vue'

/** A drawn picture to stand in for a photograph: a shape in one hue, as an SVG data URL. */
function picture(hue: number, wide: boolean): string {
  const [width, height] = wide ? [1600, 900] : [900, 1200]
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${String(width)}" height="${String(height)}"><rect width="100%" height="100%" fill="hsl(${String(hue)} 45% 35%)"/><circle cx="50%" cy="50%" r="30%" fill="hsl(${String(hue)} 60% 70%)"/></svg>`
  return `data:image/svg+xml,${encodeURIComponent(svg)}`
}

const pictures: KitLightboxImage[] = [
  {
    src: picture(30, true),
    alt: 'The oak shelf by the window',
    caption: 'Spring, before the move',
    href: picture(30, true),
  },
  { src: picture(200, false), alt: 'The paperbacks, two deep', caption: 'The second shelf' },
  { src: picture(130, true), alt: 'The atlas on its side' },
]
const viewing = ref(false)
const at = ref(0)

function look(index: number): void {
  at.value = index
  viewing.value = true
}

const shelfName = ref('Living room')
const navigating = ref(false)
const saving = ref(false)

function save(): void {
  saving.value = true
  window.setTimeout(() => {
    saving.value = false
  }, 2000)
}
</script>

<template>
  <KitPagePanel id="overlays" class="playground-section" title="Tooltips, covers and pictures">
    <h3>KitTooltip</h3>
    <p class="playground-note">
      On hover or focus, and gone on Escape. It adds to its control’s name and never stands in for
      it.
    </p>
    <div class="playground-row">
      <KitTooltip text="Copies the link to this shelf">
        <KitButton>Copy the link</KitButton>
      </KitTooltip>
      <KitTooltip text="Opens the shelf on a page of its own" side="bottom">
        <KitIconButton label="Open the shelf"><PlaygroundIcon name="arrow" /></KitIconButton>
      </KitTooltip>
    </div>

    <h3>KitPopover and KitHelpTip</h3>
    <p class="playground-note">
      Opened by a press, so they work on a phone; Escape or a press outside closes them.
    </p>
    <div class="playground-row">
      <KitPopover>
        <template #trigger><KitButton>Who can see this shelf?</KitButton></template>
        <p>Only the people you lend to, and only while a loan is open.</p>
        <p><a href="#overlays">How sharing works</a></p>
      </KitPopover>
      <span class="playground-inline">
        Waitlist
        <KitHelpTip topic="the waitlist">
          <p>People who asked for a copy, in the order they asked. The first is offered it next.</p>
        </KitHelpTip>
      </span>
    </div>

    <h3>KitDrawer</h3>
    <p class="playground-note">
      A record’s history at the end of the line; the navigation at its start, as on a phone.
    </p>
    <div class="playground-row">
      <KitDrawer title="History" description="Every change to this shelf, newest first.">
        <template #trigger><KitButton>Show the history</KitButton></template>
        <ol class="overlay-history">
          <li>Renamed to “Living room”, an hour ago.</li>
          <li>Two books added, yesterday.</li>
          <li>Made, on Monday.</li>
        </ol>
        <template #footer><KitButton>Load older changes</KitButton></template>
      </KitDrawer>
      <KitDrawer v-model:open="navigating" title="Pages" side="start">
        <template #trigger><KitButton>Show the pages</KitButton></template>
        <nav aria-label="Playground">
          <ul class="overlay-history">
            <li><a href="#buttons" @click="navigating = false">Buttons</a></li>
            <li><a href="#fields" @click="navigating = false">Fields</a></li>
            <li><a href="#overlays" @click="navigating = false">Tooltips and covers</a></li>
          </ul>
        </nav>
      </KitDrawer>
    </div>

    <h3>KitLoadingOverlay</h3>
    <p class="playground-note">
      Saving covers the form for two seconds: out of reach, marked busy, and saying what is under
      way.
    </p>
    <KitLoadingOverlay :active="saving" label="Saving the shelf…">
      <div class="overlay-form">
        <KitFormField v-slot="field" label="Shelf name">
          <KitTextField v-model="shelfName" v-bind="field" />
        </KitFormField>
        <KitButton variant="primary" @click="save">Save the shelf</KitButton>
      </div>
    </KitLoadingOverlay>

    <h3>KitLightbox</h3>
    <p class="playground-note">
      Opens at the picture pressed; the arrow keys move through them, and Escape or a press beside
      the picture closes it.
    </p>
    <ul class="overlay-pictures">
      <li v-for="(shown, index) in pictures" :key="shown.alt">
        <button type="button" class="overlay-picture" @click="look(index)">
          <img :src="shown.src" :alt="shown.alt" />
        </button>
      </li>
    </ul>
    <KitLightbox v-model:open="viewing" v-model:index="at" :images="pictures" />
  </KitPagePanel>
</template>

<style scoped>
.overlay-form {
  display: flex;
  flex-wrap: wrap;
  align-items: end;
  gap: var(--kit-space-md);
  padding: var(--kit-space-md);
  border: var(--kit-control-border-width) solid var(--kit-hairline);
  border-radius: var(--kit-radius-md);
}

.overlay-history {
  display: grid;
  gap: var(--kit-space-xs);
  margin: 0;
  padding-inline-start: var(--kit-space-lg);
}

.overlay-pictures {
  display: flex;
  flex-wrap: wrap;
  gap: var(--kit-space-sm);
  margin: 0;
  padding: 0;
  list-style: none;
}

.overlay-picture {
  display: block;
  padding: 0;
  border: var(--kit-control-border-width) solid var(--kit-control-border);
  border-radius: var(--kit-radius-md);
  background: none;
  cursor: zoom-in;
}

.overlay-picture:focus-visible {
  outline: var(--kit-focus-ring-width) solid var(--kit-focus-ring);
  outline-offset: var(--kit-focus-ring-offset);
}

.overlay-picture img {
  display: block;
  width: 8rem;
  height: 6rem;
  border-radius: var(--kit-radius-md);
  object-fit: cover;
}
</style>
