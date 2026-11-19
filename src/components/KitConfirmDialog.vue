<script setup lang="ts">
// The question before an irreversible action, in KitDialog's alert form: focus starts on
// Cancel, the safe choice; Escape or Cancel back out, and a click outside does nothing. Going
// ahead emits `confirm` and leaves the dialog open, so the page can show `busy` while the
// action runs and close it after; while busy, nothing closes it. A page asks through
// `confirm()`, which KitConfirmHost answers with this dialog; it uses the component itself
// only when the dialog must stay open while the action runs.
import { AlertDialogCancel } from 'reka-ui'
import KitButton from './KitButton.vue'
import KitDialog from './KitDialog.vue'

const props = withDefaults(
  defineProps<{
    /** The question: "Delete this shelf?". */
    title: string
    /** What going ahead does, and how much it removes: "Its 12 books go back to unshelved." */
    message: string
    /** The button that goes ahead, named for what it does: "Delete". */
    confirmLabel: string
    cancelLabel?: string
    /** Whether going ahead can't be undone, which the button's color says too. */
    danger?: boolean
    /** Whether the action is running, so the buttons wait. */
    busy?: boolean
  }>(),
  { cancelLabel: 'Cancel', danger: false, busy: false },
)

const emit = defineEmits<{
  /** The person went ahead. */
  confirm: []
  /** The person backed out, by Cancel or Escape; the dialog has closed. */
  cancel: []
}>()

const open = defineModel<boolean>('open', { default: false })

// With no trigger of its own, the dialog only ever asks to close: on Cancel or Escape. While
// the action runs it stays, since backing out can't stop what has begun.
function backOut(): void {
  if (props.busy) {
    return
  }
  open.value = false
  emit('cancel')
}
</script>

<template>
  <KitDialog :open="open" alert :title="title" :description="message" @update:open="backOut">
    <template #footer>
      <AlertDialogCancel as-child>
        <KitButton :disabled="busy">{{ cancelLabel }}</KitButton>
      </AlertDialogCancel>
      <KitButton :variant="danger ? 'danger' : 'primary'" :loading="busy" @click="emit('confirm')">
        {{ confirmLabel }}
      </KitButton>
    </template>
  </KitDialog>
</template>
