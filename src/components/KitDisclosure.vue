<script setup lang="ts">
// A part of a page that opens and closes under a button that says what it holds:
// `<KitDisclosure summary="Older releases">…</KitDisclosure>`. The button says whether it is open
// (`aria-expanded`) and turns its chevron, and Enter or Space opens and closes it. Given
// `headingLevel`, the button sits in a heading of that level, for a part that is a section of the
// page, so it joins the page's outline as a heading would. `v-model:open` holds it open or closed
// from the page; it starts closed.
//
// Closed, what it holds stays in the page, hidden, so a field in it keeps what was typed, and the
// browser's find in page reaches into it and opens it. Several such parts, one under another,
// are a KitAccordion.
import { onMounted, ref } from 'vue'
import { CollapsibleContent, CollapsibleRoot, CollapsibleTrigger } from 'reka-ui'
import KitGlyph from './KitGlyph.vue'
import { filled } from './slots'

withDefaults(
  defineProps<{
    /** The button's words: what the part holds. */
    summary?: string
    /** The heading the button sits in, for a part that is a section of the page. */
    headingLevel?: 2 | 3 | 4 | 5 | 6
    disabled?: boolean
  }>(),
  { summary: undefined, headingLevel: undefined, disabled: false },
)

const open = defineModel<boolean>('open', { default: false })

// Reka's button reads its part's id before the part makes it, and nothing has it look again, so
// it would name no part (`aria-controls=""`) until first pressed. It is drawn once more as soon
// as the part is mounted.
const drawn = ref(false)
onMounted(() => {
  drawn.value = true
})

defineSlots<{
  /** What it holds. */
  default?: () => unknown
  /** The button's words, when they need markup. */
  summary?: () => unknown
  /** The chevron, from the app's own icon set; the kit's is drawn when none is given. */
  icon?: () => unknown
}>()
</script>

<template>
  <CollapsibleRoot
    v-model:open="open"
    :disabled="disabled"
    :unmount-on-hide="false"
    class="kit-disclosure"
  >
    <component
      :is="headingLevel ? `h${String(headingLevel)}` : 'div'"
      class="kit-disclosure__heading"
    >
      <CollapsibleTrigger :key="String(drawn)" class="kit-disclosure__trigger">
        <span class="kit-disclosure__summary">
          <slot v-if="filled($slots.summary)" name="summary" />
          <template v-else>{{ summary }}</template>
        </span>
        <span class="kit-disclosure__chevron" aria-hidden="true">
          <slot v-if="filled($slots.icon)" name="icon" />
          <KitGlyph v-else name="chevron" />
        </span>
      </CollapsibleTrigger>
    </component>
    <CollapsibleContent class="kit-disclosure__content">
      <div class="kit-disclosure__body"><slot /></div>
    </CollapsibleContent>
  </CollapsibleRoot>
</template>
