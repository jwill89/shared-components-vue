<script setup lang="ts">
// What the kit's own components gained for the apps' pages: a panel with a line over its
// heading, an icon and help beside it; tabs with counts; lists of links down the side and in a
// row; a menu whose items are links; dialogs narrow, widest and persistent; a question with more
// than two answers; a toast with Undo; the viewer opened from anywhere; and a table with a choice
// of page size, its pages over the rows too, and buttons of the page's own in its toolbar.
import { ref } from 'vue'
import {
  KitButton,
  KitDataTable,
  KitDialog,
  KitHelpTip,
  KitMenu,
  KitMenuItem,
  KitNavList,
  KitPagePanel,
  KitTabs,
  ask,
  openLightbox,
  useToast,
} from '@jwill89/shared-components-vue'
import type { KitColumn, KitLightboxImage, KitNavItem } from '@jwill89/shared-components-vue'
import PlaygroundIcon from '../PlaygroundIcon.vue'

const tab = ref('readings')

const sections: KitNavItem[] = [
  { label: 'Profile', to: '#layout', group: 'You' },
  { label: 'Passkeys', to: '#layout', group: 'You', current: true },
  { label: 'Members', to: '#layout', group: 'The library' },
  { label: 'Roles', to: '#layout', group: 'The library' },
]
const pages: KitNavItem[] = [
  { label: 'Details', to: '#layout', current: true },
  { label: 'Lending history', to: '#layout' },
  { label: 'Reviews', to: '#layout' },
]

const narrow = ref(false)
const widest = ref(false)
const ageCheck = ref(false)
const answer = ref('')

async function conflict(): Promise<void> {
  const chosen = await ask({
    title: 'This record changed while you were editing',
    message: 'Load theirs to see what changed, or keep yours over it.',
    answers: [
      { value: 'theirs', label: 'Load theirs' },
      { value: 'mine', label: 'Keep mine', primary: true },
    ],
  })
  answer.value = chosen ? `Chose “${chosen}”.` : 'Backed out.'
}

const toast = useToast()
const shelved = ref(true)
function takeOff(): void {
  shelved.value = false
  toast.success('Took “Beloved” off the shelf', undefined, {
    action: {
      label: 'Undo',
      onClick: () => {
        shelved.value = true
      },
    },
  })
}

/** A drawn picture, so the viewer has something to show without a file to fetch. */
function drawn(hue: number): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600"><rect width="100%" height="100%" fill="hsl(${String(hue)} 40% 30%)"/><rect x="25%" y="25%" width="50%" height="50%" fill="hsl(${String(hue)} 55% 65%)"/></svg>`
  return `data:image/svg+xml,${encodeURIComponent(svg)}`
}
const plans: KitLightboxImage[] = [
  { src: drawn(30), alt: 'The reading room, from the door', caption: 'Ground floor' },
  { src: drawn(200), alt: 'The stacks, from above', caption: 'First floor' },
]

interface Visitor {
  id: number
  name: string
  visits: number
}
const visitors: Visitor[] = Array.from({ length: 12 }, (_, at) => ({
  id: at + 1,
  name: `Visitor ${String(at + 1)}`,
  visits: ((at * 7) % 11) + 1,
}))
const visitorColumns: KitColumn<Visitor>[] = [
  { key: 'name', label: 'Name', rowHeader: true },
  { key: 'visits', label: 'Visits', align: 'end' },
]
const visitorPage = ref(1)
const visitorPageSize = ref<number | undefined>(5)
</script>

<template>
  <KitPagePanel id="layout" class="playground-section" title="Pages and overlays">
    <h3>KitPagePanel with a line, an icon and help</h3>
    <KitPagePanel title="Opening hours" eyebrow="This week" :level="3">
      <template #icon><PlaygroundIcon name="arrow" /></template>
      <template #help>
        <KitHelpTip topic="the opening hours">
          <dl>
            <dt>Late opening</dt>
            <dd>Thursdays, until nine.</dd>
            <dt>Closed</dt>
            <dd>On public holidays.</dd>
          </dl>
        </KitHelpTip>
      </template>
      <p>Ten until six, Monday to Saturday.</p>
    </KitPagePanel>

    <h3>KitTabs with counts</h3>
    <KitTabs
      v-model="tab"
      label="Journal"
      :tabs="[
        { key: 'readings', label: 'Readings', count: 12 },
        { key: 'drafts', label: 'Drafts', count: 0 },
      ]"
    >
      <template #readings><p>Twelve readings.</p></template>
      <template #drafts><p>No drafts.</p></template>
    </KitTabs>

    <h3>KitNavList</h3>
    <div class="layout-row">
      <KitNavList label="Settings" :items="sections" foldable class="layout-side" />
      <KitNavList label="This record" :items="pages" horizontal class="layout-wide" />
    </div>

    <h3>A menu whose items are links</h3>
    <KitMenu label="Record links">
      <KitMenuItem to="#layout">Go to the record</KitMenuItem>
      <KitMenuItem href="https://github.com/jwill89/shared-components-vue"
        >The kit’s source</KitMenuItem
      >
    </KitMenu>

    <h3>Dialogs narrow, widest and persistent, and a question with more answers</h3>
    <div class="layout-buttons">
      <KitButton @click="narrow = true">A narrow dialog</KitButton>
      <KitButton @click="widest = true">The widest dialog</KitButton>
      <KitButton @click="ageCheck = true">Check my age</KitButton>
      <KitButton @click="conflict">Save over a change</KitButton>
      <KitButton :disabled="!shelved" @click="takeOff">Take “Beloved” off the shelf</KitButton>
      <KitButton @click="openLightbox(plans, 0)">See the floor plans</KitButton>
    </div>
    <p v-if="answer" class="layout-answer">{{ answer }}</p>
    <KitDialog v-model:open="narrow" title="A short question" width="narrow">
      <p>Narrow, for a line or two.</p>
    </KitDialog>
    <KitDialog v-model:open="widest" title="The whole record" width="widest">
      <p>As wide as a record shown whole.</p>
    </KitDialog>
    <KitDialog v-model:open="ageCheck" title="Are you old enough?" persistent>
      <p>Some of the collection is for adults only.</p>
      <template #footer>
        <KitButton @click="ageCheck = false">No</KitButton>
        <KitButton variant="primary" @click="ageCheck = false">Yes</KitButton>
      </template>
    </KitDialog>

    <h3>KitDataTable with a choice of page size</h3>
    <KitDataTable
      v-model:page="visitorPage"
      v-model:page-size="visitorPageSize"
      :rows="visitors"
      :columns="visitorColumns"
      row-key="id"
      label="Visitors"
      :page-sizes="[5, 10]"
      pages-above
    >
      <template #toolbar>
        <KitButton variant="primary">Sign a visitor in</KitButton>
      </template>
    </KitDataTable>
  </KitPagePanel>
</template>

<style scoped>
.layout-row {
  display: flex;
  flex-wrap: wrap;
  gap: var(--kit-space-lg);
  align-items: start;
}

.layout-side {
  flex: 0 1 14rem;
}

.layout-wide {
  flex: 1 1 18rem;
}

.layout-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: var(--kit-space-xs);
}

.layout-answer {
  color: var(--kit-text-muted);
}
</style>
