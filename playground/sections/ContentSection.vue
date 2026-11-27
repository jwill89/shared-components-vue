<script setup lang="ts">
// What a page shows rather than asks: badges in each tone, a record's details, a part that opens,
// parts one under another, and how far a long job has got.
import { ref } from 'vue'
import {
  KitAccordion,
  KitBadge,
  KitDescriptionItem,
  KitDescriptionList,
  KitDisclosure,
  KitPagePanel,
  KitProgress,
} from '@jwill89/shared-components-vue'
import type { KitAccordionItem } from '@jwill89/shared-components-vue'
import PlaygroundIcon from '../PlaygroundIcon.vue'

const releases: KitAccordionItem[] = [
  { value: 'unreleased', title: 'Unreleased' },
  { value: '1.1.0', title: 'Version 1.1.0' },
  { value: '1.0.0', title: 'Version 1.0.0' },
]
const opened = ref(['unreleased'])
const question = ref<string[]>([])

const looked = 3
const lookups = 8
const countText = (value: number, max: number): string =>
  `${String(value)} of ${String(max)} covers`
</script>

<template>
  <KitPagePanel id="content" class="playground-section" title="Content">
    <h3>KitBadge</h3>
    <p class="content-row">
      <KitBadge>Owner</KitBadge>
      <KitBadge tone="success">Returned</KitBadge>
      <KitBadge tone="error">
        <template #icon><PlaygroundIcon name="trash" /></template>
        Overdue
      </KitBadge>
      <KitBadge tone="warning">Due soon</KitBadge>
      <KitBadge tone="info">
        <template #icon><PlaygroundIcon name="arrow" /></template>
        Reserved
      </KitBadge>
    </p>

    <h3>KitDescriptionList</h3>
    <KitDescriptionList>
      <KitDescriptionItem term="Author">Ursula K. Le Guin</KitDescriptionItem>
      <KitDescriptionItem term="Call number">813.54 LEG</KitDescriptionItem>
      <KitDescriptionItem term="Published">1969, by Ace</KitDescriptionItem>
      <KitDescriptionItem>
        <template #term><abbr title="International Standard Book Number">ISBN</abbr></template>
        <a href="#content">978-0-441-47812-5</a>
      </KitDescriptionItem>
      <KitDescriptionItem term="State">
        <KitBadge tone="success">On the shelf</KitBadge>
      </KitDescriptionItem>
    </KitDescriptionList>

    <h3>KitDisclosure</h3>
    <KitDisclosure summary="Where the collection came from" :heading-level="4">
      <p>
        Most of it from a house clearance in 1998; the atlases from a school that closed, and the
        poetry a shelf at a time from friends.
      </p>
    </KitDisclosure>
    <KitDisclosure summary="Can’t be opened" disabled>
      <p>Nothing here.</p>
    </KitDisclosure>

    <h3>KitAccordion</h3>
    <div class="content-stack">
      <KitAccordion v-model="opened" :items="releases" multiple toggle-all :heading-level="4">
        <template #default="{ item }">
          <p>
            What changed in {{ item.title.toLowerCase() }}: the shelves, the lending and the search.
          </p>
        </template>
      </KitAccordion>
      <KitAccordion
        v-model="question"
        :heading-level="4"
        :items="[
          { value: 'lend', title: 'How long is a loan?' },
          { value: 'late', title: 'What if it comes back late?' },
        ]"
      >
        <template #default="{ item }">
          <p v-if="item.value === 'lend'">Three weeks, and three more if no one is waiting.</p>
          <p v-else>Nothing, unless someone is waiting; then a reminder every few days.</p>
        </template>
      </KitAccordion>
    </div>

    <h3>KitProgress</h3>
    <div class="content-stack">
      <KitProgress label="Looking up covers" :value="looked" :max="lookups" :value-text="countText">
        {{ looked }} done, {{ lookups - looked }} to go.
      </KitProgress>
      <KitProgress label="Sorting the catalogue" :value="62" />
      <KitProgress label="Loading the catalogue" :value="null" />
    </div>
  </KitPagePanel>
</template>

<style scoped>
.content-row {
  display: flex;
  flex-wrap: wrap;
  gap: var(--kit-space-xs);
}

.content-stack {
  display: grid;
  gap: var(--kit-space-md);
}
</style>
