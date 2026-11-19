<script setup lang="ts">
// The one modal: a titled panel over the page that holds focus while open, closes on Escape,
// and gives focus back to what opened it. Scroll is locked behind it, nested dialogs counted.
// Open it with `v-model:open`, or put the button that opens it in the `trigger` slot. The
// body is the default slot and the buttons the `footer` slot; the header and footer stay put
// while a long body scrolls between them. A dialog holding a long form is `wide`.
//
// Given `submitLabel`, it is a form: the body sits in a <form>, so Enter in any field submits,
// it opens with focus on its first field, and the footer holds Cancel beside the submit button,
// which shows `busy` while the save runs. It emits `submit` and stays open, so the page closes
// it once the save has worked. A form never closes on a click outside, where it would lose what
// was typed. The browser's own checks are off (novalidate): the page says what is missing beside
// each field, and the submit button is never greyed out for it. A form's other buttons (Reload,
// on a conflict) go in `footer-start`, at the footer's other end; the submit button's icon is
// the `submit-icon` slot; and the body and `footer-start` slots are given the form's id, for a
// button elsewhere that sends it (`form="…"`). The `submit` slot takes the submit button's
// place, as a Reload does once a save has met a conflict and could only be refused again;
// while what it holds is switched off with `v-if`, the kit's own submit button shows.
//
// Cancel is a secondary button in every form, as in KitConfirmDialog, so each dialog's way
// back looks the same in every app, and has an edge beside the filled submit button.
//
// `alert` is its form for a question before an irreversible action (KitConfirmDialog asks
// with it): a screen reader announces it as an alert, it has no Close button, and nothing but
// Escape or a button closes it. Otherwise a click outside closes it too.
import { computed, useId, useTemplateRef } from 'vue'
import {
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogOverlay,
  AlertDialogPortal,
  AlertDialogRoot,
  AlertDialogTitle,
  AlertDialogTrigger,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogOverlay,
  DialogPortal,
  DialogRoot,
  DialogTitle,
  DialogTrigger,
} from 'reka-ui'
import KitAnnouncer from './KitAnnouncer.vue'
import KitButton from './KitButton.vue'
import KitGlyph from './KitGlyph.vue'
import KitIconButton from './KitIconButton.vue'
import { filled } from './slots'

const props = withDefaults(
  defineProps<{
    title: string
    /** A line under the title on what the dialog is for. */
    description?: string
    /** Whether it is as wide as a record page, for a long form. */
    wide?: boolean
    /** The alert-dialog form, for a question before an irreversible action. */
    alert?: boolean
    /** The submit button's words, which make the dialog a form: "Add the book". */
    submitLabel?: string
    cancelLabel?: string
    /** Whether the form's save is running: the submit button shows a spinner, and Cancel waits. */
    busy?: boolean
    /** Whether submitting can't be undone, which the submit button's color says too. */
    danger?: boolean
  }>(),
  {
    description: undefined,
    wide: false,
    alert: false,
    submitLabel: undefined,
    cancelLabel: 'Cancel',
    busy: false,
    danger: false,
  },
)

const emit = defineEmits<{
  /** The form was sent, by its button or by Enter in a field. */
  submit: []
}>()

const open = defineModel<boolean>('open', { default: false })

defineSlots<{
  /** The body; in a form, given the form's id. */
  default?: (props: { formId: string }) => unknown
  /** The buttons, in place of a form's Cancel and submit. */
  footer?: () => unknown
  /** A form's other buttons, at the footer's start, away from Cancel and submit. */
  'footer-start'?: (props: { formId: string }) => unknown
  /** The icon on a form's submit button. */
  'submit-icon'?: () => unknown
  /** What stands in a form's submit button's place, given the form's id. */
  submit?: (props: { formId: string }) => unknown
  trigger?: () => unknown
  /** The Close button's icon, a drawn cross by default. */
  'close-icon'?: () => unknown
}>()

const parts = computed(() =>
  props.alert
    ? {
        Root: AlertDialogRoot,
        Trigger: AlertDialogTrigger,
        Portal: AlertDialogPortal,
        Overlay: AlertDialogOverlay,
        Content: AlertDialogContent,
        Title: AlertDialogTitle,
        Description: AlertDialogDescription,
      }
    : {
        Root: DialogRoot,
        Trigger: DialogTrigger,
        Portal: DialogPortal,
        Overlay: DialogOverlay,
        Content: DialogContent,
        Title: DialogTitle,
        Description: DialogDescription,
      },
)

const formId = useId()
const isForm = computed(() => props.submitLabel !== undefined)
const form = useTemplateRef<HTMLFormElement>('form')

/** A form keeps what was typed: a press outside it doesn't close it. */
function onPointerDownOutside(event: Event): void {
  if (isForm.value) {
    event.preventDefault()
  }
}

/**
 * What a form's first field can be: a native control, a control drawn on a button or a span
 * (KitSelect's trigger, KitSwitch), a group of options that is itself in the tab order and hands
 * focus to its chosen option (KitSegmentedControl, a radio group), or a button that opens a
 * picker. A plain button is an action, not a field. One a keyboard can't reach is passed over:
 * disabled, hidden from screen readers, or out of the tab order, as a group's options are until
 * the group hands focus on, and as the hidden inputs Reka keeps for a form's sake are.
 */
const FIELD = [
  'input:not([type="hidden"])',
  'textarea',
  'select',
  '[role="combobox"]',
  '[role="switch"]',
  '[role="checkbox"]',
  '[role="group"][tabindex="0"]',
  '[role="radiogroup"]',
  '[role="radio"]',
  '[role="slider"]',
  '[role="spinbutton"]',
  '[role="textbox"]',
  'button[aria-haspopup]',
]
  .map(
    (field) =>
      `${field}:not(:disabled, [data-disabled], [aria-disabled="true"], [aria-hidden="true"], [tabindex="-1"])`,
  )
  .join(', ')

/**
 * A form opens on its first field, ready to type in, rather than on the Close button Reka
 * would choose as the first thing it can focus: the first, in the form's order, that takes focus,
 * since one inside something closed or not shown can't. Anything else opens as Reka has it.
 */
function onOpenAutoFocus(event: Event): void {
  for (const field of form.value?.querySelectorAll<HTMLElement>(FIELD) ?? []) {
    field.focus()
    if (field.contains(document.activeElement)) {
      event.preventDefault()
      return
    }
  }
}
</script>

<template>
  <component :is="parts.Root" v-model:open="open">
    <component :is="parts.Trigger" v-if="$slots.trigger" as-child>
      <slot name="trigger" />
    </component>
    <component :is="parts.Portal">
      <component :is="parts.Overlay" class="kit-dialog__overlay" />
      <component
        :is="parts.Content"
        class="kit-dialog"
        :class="{ 'kit-dialog--wide': wide }"
        aria-modal="true"
        v-bind="description ? {} : { 'aria-describedby': undefined }"
        @pointer-down-outside="onPointerDownOutside"
        @open-auto-focus="onOpenAutoFocus"
      >
        <header class="kit-dialog__header">
          <component :is="parts.Title" class="kit-dialog__title">{{ title }}</component>
          <DialogClose v-if="!alert" as-child>
            <KitIconButton class="kit-dialog__close" label="Close" variant="plain">
              <slot name="close-icon"><KitGlyph name="cross" /></slot>
            </KitIconButton>
          </DialogClose>
        </header>
        <component :is="parts.Description" v-if="description" class="kit-dialog__description">
          {{ description }}
        </component>
        <form
          v-if="isForm"
          :id="formId"
          ref="form"
          class="kit-dialog__body"
          novalidate
          @submit.prevent="emit('submit')"
        >
          <slot :form-id="formId" />
        </form>
        <div v-else-if="filled($slots.default, { formId })" class="kit-dialog__body">
          <slot :form-id="formId" />
        </div>
        <footer v-if="isForm || filled($slots.footer)" class="kit-dialog__footer">
          <slot name="footer">
            <div v-if="filled($slots['footer-start'], { formId })" class="kit-dialog__footer-start">
              <slot name="footer-start" :form-id="formId" />
            </div>
            <KitButton :disabled="busy" @click="open = false">{{ cancelLabel }}</KitButton>
            <slot name="submit" :form-id="formId">
              <KitButton
                type="submit"
                :form="formId"
                :variant="danger ? 'danger' : 'primary'"
                :loading="busy"
              >
                <template v-if="filled($slots['submit-icon'])" #icon>
                  <slot name="submit-icon" />
                </template>
                {{ submitLabel }}
              </KitButton>
            </slot>
          </slot>
        </footer>
        <!-- While it is open, a toast is read out from here: some screen readers hear no live
             region outside an aria-modal dialog. -->
        <KitAnnouncer />
      </component>
    </component>
  </component>
</template>

<style scoped>
@layer kit {
  .kit-dialog__overlay {
    position: fixed;
    inset: 0;
    z-index: var(--kit-layer-dialog);
    background: var(--kit-scrim);
  }

  .kit-dialog {
    box-sizing: border-box;
    position: fixed;
    top: 50%;
    left: 50%;
    z-index: var(--kit-layer-dialog);
    display: flex;
    flex-direction: column;
    gap: var(--kit-space-md);
    width: min(calc(100% - 2 * var(--kit-space-md)), var(--kit-width-dialog));
    max-height: calc(100% - 2 * var(--kit-space-md));
    padding: var(--kit-space-lg);
    border: var(--kit-control-border-width) solid var(--kit-control-border);
    border-radius: var(--kit-radius-md);
    background: var(--kit-surface-raised);
    color: var(--kit-text);
    box-shadow: var(--kit-shadow-overlay);
    transform: translate(-50%, -50%);
  }

  .kit-dialog--wide {
    width: min(calc(100% - 2 * var(--kit-space-md)), var(--kit-width-dialog-wide));
  }

  /* Reka focuses the panel itself only when it holds nothing to focus; the ring belongs on
     the controls. */
  .kit-dialog:focus {
    outline: none;
  }

  .kit-dialog__header {
    display: flex;
    flex: none;
    align-items: flex-start;
    justify-content: space-between;
    gap: var(--kit-space-sm);
  }

  .kit-dialog__title {
    margin: 0;
    font-family: var(--kit-font-heading);
    font-size: var(--kit-text-size-lg);
    line-height: var(--kit-line-height-heading);
  }

  /* The Close button sits in the corner, its touch target reaching into the padding. */
  .kit-dialog__close {
    flex: none;
    margin: calc(-1 * var(--kit-space-sm)) calc(-1 * var(--kit-space-sm)) 0 0;
  }

  .kit-dialog__description {
    flex: none;
    max-width: var(--kit-measure-prose);
    margin: 0;
  }

  /* The body scrolls between the header and the footer, which stay in view. */
  .kit-dialog__body {
    display: flex;
    flex-direction: column;
    gap: var(--kit-space-md);
    min-height: 0;
    margin: calc(-1 * var(--kit-focus-ring-width) - var(--kit-focus-ring-offset));
    padding: calc(var(--kit-focus-ring-width) + var(--kit-focus-ring-offset));
    overflow-y: auto;
  }

  .kit-dialog__footer {
    display: flex;
    flex: none;
    flex-wrap: wrap;
    justify-content: flex-end;
    gap: var(--kit-space-xs);
  }

  /* A form's other buttons sit at the footer's start, away from Cancel and submit. */
  .kit-dialog__footer-start {
    display: flex;
    flex-wrap: wrap;
    gap: var(--kit-space-xs);
    margin-inline-end: auto;
  }
}
</style>
