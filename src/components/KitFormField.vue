<script setup lang="ts">
// The one field wrapper: the label above, the control in the slot, the error and the hint
// below, each tied to the control. The slot's props are what the control binds
// (`v-slot="field"`, then `v-bind="field"` on any of the kit's controls): its id, which the
// label's `for` names, the ids of the error and hint that describe it, and whether it is in
// error. The hint is the `hint` prop, or the `hint` slot when it needs markup, such as a link.
//
// A control that is a group of buttons (KitSegmentedControl), which a label's `for` can't name,
// sits in a `group` field: its caption is a span, not a label, and the binding adds the
// caption's id as `labelledBy`, which the group names itself by.
//
// `required` marks a field the form can't be sent without: the label draws the asterisk and
// says "(required)" in words to a screen reader. A field that always holds a value, such as a
// choice with a default, needs no mark.
//
// The wrapper may shrink below its control's preferred width, so a long value never widens a
// form past a phone's screen, and it grows no wider than --kit-width-field, so a field on a row
// of its own stays a readable width on a wide screen.
import { computed, useId } from 'vue'

const props = defineProps<{
  label: string
  /** The control's id; one is made when it isn't given. */
  id?: string
  /** A line on what the field is for or what it takes, shown under it. */
  hint?: string
  /** What is wrong with the value, shown under it and read with it. */
  error?: string
  required?: boolean
  /** Whether the control is a group of buttons, named by the caption rather than a label. */
  group?: boolean
}>()

/** What the slot hands its control. */
export interface KitFieldBinding {
  id: string
  describedBy: string | undefined
  invalid: boolean
  /** In a `group` field, the caption's id, which the group names itself by. */
  labelledBy?: string
}

const slots = defineSlots<{
  default: (field: KitFieldBinding) => unknown
  /** The hint, when it needs markup. */
  hint?: () => unknown
}>()

const madeId = useId()
const controlId = computed(() => props.id ?? madeId)
const errorId = computed(() => `${controlId.value}-error`)
const hintId = computed(() => `${controlId.value}-hint`)
const captionId = computed(() => `${controlId.value}-caption`)

/** Whether there is a hint to show, from the prop or the slot. Read at each render, since a
 * slot's presence isn't reactive. */
function hasHint(): boolean {
  return Boolean(props.hint) || slots.hint !== undefined
}

/** What the control binds, made at each render for the same reason. */
function binding(): KitFieldBinding {
  const describedBy =
    [props.error ? errorId.value : '', hasHint() ? hintId.value : ''].filter(Boolean).join(' ') ||
    undefined
  const field = { id: controlId.value, describedBy, invalid: Boolean(props.error) }
  // Only a group takes `labelledBy`: on any other control it would land as a stray attribute.
  return props.group ? { ...field, labelledBy: captionId.value } : field
}
</script>

<template>
  <div class="kit-form-field">
    <component
      :is="group ? 'span' : 'label'"
      :id="group ? captionId : undefined"
      :for="group ? undefined : controlId"
      class="kit-form-field__label"
    >
      {{ label }}
      <template v-if="required">
        <span class="kit-form-field__required" aria-hidden="true">*</span>
        <span class="kit-form-field__required-words">(required)</span>
      </template>
    </component>
    <slot v-bind="binding()" />
    <p v-if="error" :id="errorId" class="kit-form-field__error">{{ error }}</p>
    <p v-if="hasHint()" :id="hintId" class="kit-form-field__hint">
      <slot name="hint">{{ hint }}</slot>
    </p>
  </div>
</template>

<style scoped>
@layer kit {
  .kit-form-field {
    display: flex;
    flex-direction: column;
    gap: var(--kit-space-2xs);
    min-width: 0;
    max-width: var(--kit-width-field);
  }

  .kit-form-field__label {
    font-weight: var(--kit-font-weight-strong);
  }

  .kit-form-field__required {
    margin-inline-start: var(--kit-space-2xs);
    color: var(--kit-danger);
  }

  /* Read by a screen reader, never shown: the asterisk says it to the eye. */
  .kit-form-field__required-words {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
  }

  .kit-form-field__error,
  .kit-form-field__hint {
    max-width: var(--kit-measure-prose);
    margin: 0;
    font-size: var(--kit-text-size-sm);
  }

  .kit-form-field__error {
    color: var(--kit-danger);
  }

  .kit-form-field__hint {
    color: var(--kit-text-muted);
  }
}
</style>
