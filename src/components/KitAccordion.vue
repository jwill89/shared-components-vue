<script setup lang="ts">
// Parts of a page one under another, each opened by a button in a heading that says what the part
// holds: a changelog's releases, a long form's sections, a deck's cards.
//
//   <KitAccordion v-model="open" :items="releases" multiple toggle-all>
//     <template #default="{ item }">…what the part holds…</template>
//   </KitAccordion>
//
// Its value is the list of the parts open. `multiple` lets several be open at once; otherwise
// opening one closes the other. `toggleAll`, with `multiple`, puts Open all and Close all over
// the parts. Each button sits in a heading of `headingLevel`, so the parts join the page's
// outline, says whether it is open, and turns its chevron; each part is a region named by its
// button. The `title` slot, given the item, draws a button's words where they need markup.
//
// Closed, a part stays in the page, hidden, so a field in it keeps what was typed and the
// browser's find in page reaches into it and opens it. One part alone is a KitDisclosure.
import { computed, onMounted, ref } from 'vue'
import {
  AccordionContent,
  AccordionHeader,
  AccordionItem,
  AccordionRoot,
  AccordionTrigger,
} from 'reka-ui'
import KitButton from './KitButton.vue'
import KitGlyph from './KitGlyph.vue'
import { filled } from './slots'

/** One part: its value, which the list of those open holds, and its button's words. */
export interface KitAccordionItem {
  value: string
  title: string
  disabled?: boolean
}

const props = withDefaults(
  defineProps<{
    items: KitAccordionItem[]
    /** Whether several parts may be open at once. */
    multiple?: boolean
    /** Puts Open all and Close all over the parts, where several may be open. */
    toggleAll?: boolean
    /** The level of the heading each button sits in. */
    headingLevel?: 2 | 3 | 4 | 5 | 6
    openAllLabel?: string
    closeAllLabel?: string
  }>(),
  {
    multiple: false,
    toggleAll: false,
    headingLevel: 3,
    openAllLabel: 'Open all',
    closeAllLabel: 'Close all',
  },
)

const model = defineModel<string[]>({ default: () => [] })

defineSlots<{
  /** What a part holds. */
  default?: (props: { item: KitAccordionItem }) => unknown
  /** A button's words, when they need markup. */
  title?: (props: { item: KitAccordionItem }) => unknown
  /** The chevron, from the app's own icon set; the kit's is drawn when none is given. */
  icon?: () => unknown
}>()

// Reka's button reads its part's id before the part makes it, and nothing has it look again, so
// it would name no part (`aria-controls=""`) until first pressed. It is drawn once more as soon
// as the part is mounted.
const drawn = ref(false)
onMounted(() => {
  drawn.value = true
})

// Reka takes a list where several may be open and one value where one may be, an empty one
// while none is; the page always gets a list.
const opened = computed(() => (props.multiple ? model.value : (model.value[0] ?? '')))

function take(value: unknown): void {
  const values = Array.isArray(value) ? value : [value]
  model.value = values.filter((v): v is string => typeof v === 'string' && v !== '')
}

const openable = computed(() => props.items.filter((item) => !item.disabled).map((i) => i.value))

function openAll(): void {
  model.value = openable.value
}

function closeAll(): void {
  model.value = []
}
</script>

<template>
  <div class="kit-accordion">
    <div v-if="multiple && toggleAll" class="kit-accordion__toolbar">
      <KitButton variant="plain" @click="openAll">{{ openAllLabel }}</KitButton>
      <KitButton variant="plain" @click="closeAll">{{ closeAllLabel }}</KitButton>
    </div>
    <AccordionRoot
      :type="multiple ? 'multiple' : 'single'"
      :model-value="opened"
      collapsible
      :unmount-on-hide="false"
      class="kit-accordion__parts"
      @update:model-value="take"
    >
      <AccordionItem
        v-for="item in items"
        :key="item.value"
        :value="item.value"
        :disabled="item.disabled"
        class="kit-accordion__part"
      >
        <AccordionHeader :as="`h${String(headingLevel)}`" class="kit-disclosure__heading">
          <AccordionTrigger :key="String(drawn)" class="kit-disclosure__trigger">
            <span class="kit-disclosure__summary">
              <slot v-if="filled($slots.title, { item })" name="title" :item="item" />
              <template v-else>{{ item.title }}</template>
            </span>
            <span class="kit-disclosure__chevron" aria-hidden="true">
              <slot v-if="filled($slots.icon)" name="icon" />
              <KitGlyph v-else name="chevron" />
            </span>
          </AccordionTrigger>
        </AccordionHeader>
        <AccordionContent class="kit-disclosure__content">
          <div class="kit-disclosure__body"><slot :item="item" /></div>
        </AccordionContent>
      </AccordionItem>
    </AccordionRoot>
  </div>
</template>

<style scoped>
/* Each part under a hairline, so the parts read as one list of several. */
@layer kit {
  .kit-accordion__toolbar {
    display: flex;
    flex-wrap: wrap;
    justify-content: flex-end;
    gap: var(--kit-space-xs);
    margin-block-end: var(--kit-space-2xs);
  }

  .kit-accordion__part {
    border-bottom: var(--kit-control-border-width) solid var(--kit-hairline);
  }
}
</style>
