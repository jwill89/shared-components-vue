<script setup lang="ts">
// A button that copies some text, and says how it went: `<KitCopyButton :text="link">Copy the
// link</KitCopyButton>`. Pressed, its words turn to "Copied" for a moment, and a screen reader
// hears it; where the browser refuses, they turn to "Couldn't copy", and a screen reader hears
// that at once, with what to do instead, so a copy never says it worked when it didn't. `html`
// goes on the clipboard beside the text, for a page that pastes markup.
//
// `copied` reports how it went, so the page can do more where the copy failed, such as selecting
// the text for the person to copy themselves. Its icon, from the app's own set, comes from the
// `icon` slot; the kit draws two sheets where none is given.
import { onBeforeUnmount, ref } from 'vue'
import KitButton from './KitButton.vue'
import type { KitButtonVariant } from './KitButton.vue'
import KitGlyph from './KitGlyph.vue'
import { announce } from '../composables/useAnnouncer'
import { copyText } from '../composables/clipboard'
import { filled } from './slots'

const props = withDefaults(
  defineProps<{
    /** What to copy, or a function that gives it at the moment of the press. */
    text: string | (() => string)
    /** Markup to copy beside the text. */
    html?: string
    variant?: KitButtonVariant
    disabled?: boolean
    /** Its words for a moment after the copy worked. */
    copiedLabel?: string
    /** Its words for a moment after the copy failed. */
    failedLabel?: string
    /** What to do instead where the copy failed, read after `failedLabel`. */
    failedHint?: string
  }>(),
  {
    html: undefined,
    variant: 'secondary',
    disabled: false,
    copiedLabel: 'Copied',
    failedLabel: 'Couldn’t copy',
    failedHint: 'Select it and copy it by hand.',
  },
)

const emit = defineEmits<{
  /** How the copy went: whether it worked. */
  copied: [worked: boolean]
}>()

defineSlots<{
  /** Its words, which say what it copies: "Copy the link". */
  default?: () => unknown
  icon?: () => unknown
}>()

/** How long its words say how it went before they go back: a failure stays to be read twice. */
const SHOWN_FOR = { worked: 2000, failed: 6000 } as const

const outcome = ref<'worked' | 'failed' | null>(null)
let timer: ReturnType<typeof setTimeout> | undefined

async function copy(): Promise<void> {
  const text = typeof props.text === 'function' ? props.text() : props.text
  const worked = await copyText(text, props.html)
  const result = worked ? 'worked' : 'failed'
  outcome.value = result
  if (worked) {
    announce(`${props.copiedLabel}.`, 'polite')
  } else {
    announce(`${props.failedLabel}. ${props.failedHint}`, 'assertive')
  }
  clearTimeout(timer)
  timer = setTimeout(() => {
    outcome.value = null
  }, SHOWN_FOR[result])
  emit('copied', worked)
}

onBeforeUnmount(() => {
  clearTimeout(timer)
})
</script>

<template>
  <KitButton class="kit-copy-button" :variant="variant" :disabled="disabled" @click="copy">
    <template #icon>
      <slot v-if="filled($slots.icon)" name="icon" />
      <KitGlyph v-else name="copy" />
    </template>
    <template v-if="outcome === 'worked'">{{ copiedLabel }}</template>
    <template v-else-if="outcome === 'failed'">{{ failedLabel }}</template>
    <slot v-else />
  </KitButton>
</template>
