<script setup lang="ts">
// A one-line text box, inside a KitFormField: `<KitTextField v-model="name" v-bind="field" />`.
// Any other input attribute (placeholder, autocomplete, inputmode, maxlength, name) passes
// through to the box.
withDefaults(
  defineProps<{
    id?: string
    /** The ids of the text that describes the box: its error and hint, from KitFormField. */
    describedBy?: string
    /** Whether the value is in error, which a screen reader says and the border shows. */
    invalid?: boolean
    type?: 'text' | 'email' | 'url' | 'search' | 'tel' | 'password' | 'date' | 'time'
  }>(),
  { id: undefined, describedBy: undefined, invalid: false, type: 'text' },
)

const model = defineModel<string>({ required: true })
</script>

<template>
  <input
    :id="id"
    v-model="model"
    :type="type"
    class="kit-text-field"
    :aria-describedby="describedBy"
    :aria-invalid="invalid || undefined"
  />
</template>

<style scoped>
@layer kit {
  .kit-text-field {
    box-sizing: border-box;
    width: 100%;
    min-width: 0;
    min-height: var(--kit-control-height);
    padding: var(--kit-space-xs) var(--kit-space-sm);
    border: var(--kit-control-border-width) solid var(--kit-control-border);
    border-radius: var(--kit-radius-md);
    background: var(--kit-surface-raised);
    color: var(--kit-text);
    font: inherit;
  }

  /* The browser's own placeholder grey falls short of AAA; the muted text color holds 7:1. */
  .kit-text-field::placeholder {
    color: var(--kit-text-muted);
    opacity: 1;
  }

  .kit-text-field:focus-visible {
    outline: var(--kit-focus-ring-width) solid var(--kit-focus-ring);
    outline-offset: var(--kit-focus-ring-offset);
  }

  .kit-text-field[aria-invalid='true'] {
    border-color: var(--kit-danger);
    box-shadow: inset 0 0 0 1px var(--kit-danger);
  }

  .kit-text-field:disabled {
    cursor: not-allowed;
    opacity: 0.6;
  }
}
</style>
