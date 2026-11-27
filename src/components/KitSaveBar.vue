<script setup lang="ts">
// The bar a form saves from, held at the foot of the screen while there is something to say:
// unsaved changes with Save and Discard, then saving, then saved for a moment, or a conflict, the
// record having changed elsewhere since the page loaded, with Reload. The page keeps the state
// (`KitSaveState`) and how long "saved" shows, and acts on each button; each new state is read
// out once, a conflict at once. Its icons come from the slots.
import { computed, watch } from 'vue'
import KitButton from './KitButton.vue'
import { announce } from '../composables/useAnnouncer'
import { filled } from './slots'

/** Where a form stands, as its save bar shows it. */
export type KitSaveState = 'clean' | 'dirty' | 'saving' | 'saved' | 'conflict'

const props = withDefaults(
  defineProps<{
    state: KitSaveState
    dirtyText?: string
    savingText?: string
    savedText?: string
    conflictText?: string
    saveLabel?: string
    discardLabel?: string
    reloadLabel?: string
  }>(),
  {
    dirtyText: 'You have unsaved changes.',
    savingText: 'Saving…',
    savedText: 'Saved.',
    conflictText:
      'This changed somewhere else since the page opened. Reload to see it, then make your changes again.',
    saveLabel: 'Save',
    discardLabel: 'Discard',
    reloadLabel: 'Reload',
  },
)

const emit = defineEmits<{
  save: []
  discard: []
  /** Take the server's copy, dropping the edits that met a change made elsewhere. */
  reload: []
}>()

const slots = defineSlots<{
  'save-icon'?: () => unknown
  'reload-icon'?: () => unknown
}>()

const message = computed(
  () =>
    ({
      clean: '',
      dirty: props.dirtyText,
      saving: props.savingText,
      saved: props.savedText,
      conflict: props.conflictText,
    })[props.state],
)

watch(
  () => props.state,
  (state) => {
    if (state !== 'clean') {
      announce(message.value, state === 'conflict' ? 'assertive' : 'polite')
    }
  },
)
</script>

<template>
  <div
    v-if="state !== 'clean'"
    class="kit-save-bar"
    :class="{ 'kit-save-bar--conflict': state === 'conflict' }"
  >
    <p class="kit-save-bar__message">{{ message }}</p>
    <div class="kit-save-bar__actions">
      <KitButton v-if="state === 'conflict'" variant="primary" @click="emit('reload')">
        <template v-if="filled(slots['reload-icon'])" #icon><slot name="reload-icon" /></template>
        {{ reloadLabel }}
      </KitButton>
      <template v-else-if="state === 'dirty' || state === 'saving'">
        <KitButton variant="quiet" :disabled="state === 'saving'" @click="emit('discard')">
          {{ discardLabel }}
        </KitButton>
        <KitButton variant="primary" :loading="state === 'saving'" @click="emit('save')">
          <template v-if="filled(slots['save-icon'])" #icon><slot name="save-icon" /></template>
          {{ saveLabel }}
        </KitButton>
      </template>
    </div>
  </div>
</template>

<style>
@layer kit {
  /* Held at the foot of the screen, over what scrolls under it, until its form is out of view. */
  .kit-save-bar {
    box-sizing: border-box;
    position: sticky;
    bottom: var(--kit-space-md);
    z-index: var(--kit-layer-sticky);
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: var(--kit-space-sm);
    padding: var(--kit-space-sm) var(--kit-space-md);
    border: var(--kit-control-border-width) solid var(--kit-control-border);
    border-radius: var(--kit-radius-md);
    background: var(--kit-surface-raised);
    color: var(--kit-text);
    box-shadow: var(--kit-shadow-overlay);
  }

  /* A conflict is washed in the warning tone, as a warning toast is, and edged in it. */
  .kit-save-bar--conflict {
    border-color: var(--kit-warning);
    background: color-mix(in srgb, var(--kit-surface-raised) 90%, var(--kit-warning));
  }

  .kit-save-bar__message {
    max-width: var(--kit-measure-prose);
    margin: 0;
    font-weight: var(--kit-font-weight-strong);
  }

  .kit-save-bar__actions {
    display: flex;
    flex-wrap: wrap;
    gap: var(--kit-space-xs);
    margin-inline-start: auto;
  }
}
</style>
