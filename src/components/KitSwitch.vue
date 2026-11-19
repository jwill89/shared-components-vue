<script setup lang="ts">
// An on and off switch, inside a KitFormField, whose label names what it turns on. Space or a
// click flips it, and so does a click on its label. Beside the thumb it says "On" or "Off" in
// words, so its state never rests on color or position alone; a screen reader hears the state
// from the switch itself, so the words are hidden from it.
import { SwitchRoot, SwitchThumb } from 'reka-ui'

withDefaults(
  defineProps<{
    id?: string
    /** The ids of the text that describes the switch: its error and hint, from KitFormField. */
    describedBy?: string
    invalid?: boolean
    disabled?: boolean
    /** The words beside the thumb when it is on. */
    onLabel?: string
    /** The words beside the thumb when it is off. */
    offLabel?: string
  }>(),
  {
    id: undefined,
    describedBy: undefined,
    invalid: false,
    disabled: false,
    onLabel: 'On',
    offLabel: 'Off',
  },
)

const model = defineModel<boolean>({ required: true })
</script>

<template>
  <span class="kit-switch">
    <SwitchRoot
      :id="id"
      v-model="model"
      class="kit-switch__track"
      :class="{ 'is-invalid': invalid }"
      :disabled="disabled"
      :aria-describedby="describedBy"
      :aria-invalid="invalid || undefined"
    >
      <SwitchThumb class="kit-switch__thumb" />
    </SwitchRoot>
    <span class="kit-switch__state" aria-hidden="true">{{ model ? onLabel : offLabel }}</span>
  </span>
</template>

<style scoped>
@layer kit {
  .kit-switch {
    display: inline-flex;
    align-items: center;
    gap: var(--kit-space-xs);
    min-height: var(--kit-control-height);
  }

  .kit-switch__track {
    position: relative;
    box-sizing: border-box;
    flex: none;
    width: 3.25rem;
    height: 1.75rem;
    padding: 0;
    border: var(--kit-control-border-width) solid var(--kit-control-border);
    border-radius: var(--kit-radius-full);
    background: var(--kit-surface-sunken);
    cursor: pointer;
    transition: background-color var(--kit-duration-quick) ease;
  }

  /* A 44 px touch target around the drawn track. */
  .kit-switch__track::after {
    position: absolute;
    inset: -0.5rem -0.25rem;
    content: '';
  }

  .kit-switch__track:focus-visible {
    outline: var(--kit-focus-ring-width) solid var(--kit-focus-ring);
    outline-offset: var(--kit-focus-ring-offset);
  }

  .kit-switch__track[data-state='checked'] {
    border-color: var(--kit-accent);
    background: var(--kit-accent);
  }

  .kit-switch__track.is-invalid {
    border-color: var(--kit-danger);
    box-shadow: 0 0 0 1px var(--kit-danger);
  }

  .kit-switch__track:disabled {
    cursor: not-allowed;
    opacity: 0.6;
  }

  .kit-switch__thumb {
    display: block;
    width: 1.25rem;
    height: 1.25rem;
    margin-inline-start: 0.1875rem;
    border-radius: var(--kit-radius-full);
    background: var(--kit-control-border);
    transition: transform var(--kit-duration-quick) ease;
  }

  .kit-switch__thumb[data-state='checked'] {
    background: var(--kit-on-accent);
    transform: translateX(1.5rem);
  }

  .kit-switch__state {
    color: var(--kit-text-muted);
    font-weight: var(--kit-font-weight-strong);
  }

  @media (prefers-reduced-motion: reduce) {
    .kit-switch__track,
    .kit-switch__thumb {
      transition: none;
    }
  }
}
</style>
