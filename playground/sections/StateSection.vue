<script setup lang="ts">
// KitAlert in each tone, as it sits on a page and as it appears while the page is open; then
// the three states a list can be in once asked for its data: loading, empty and failed.
import { ref } from 'vue'
import {
  KitAlert,
  KitButton,
  KitEmptyState,
  KitErrorState,
  KitLoadingState,
  KitPagePanel,
} from '@jwill89/shared-components-vue'
import type { KitAlertTone } from '@jwill89/shared-components-vue'
import PlaygroundIcon from '../PlaygroundIcon.vue'

const tones: { tone: KitAlertTone; title: string; text: string }[] = [
  { tone: 'info', title: 'Shared with Sam', text: 'Sam can see this shelf but not change it.' },
  { tone: 'success', title: 'All caught up', text: 'Every book on this shelf has a cover.' },
  { tone: 'warning', title: 'Nearly full', text: 'Two places are left on this shelf.' },
  { tone: 'error', title: 'The import stopped', text: 'Line 14 of the file has no title.' },
]

const liveShown = ref(false)
const retrying = ref(false)
const retries = ref(0)

async function retry(): Promise<void> {
  retrying.value = true
  await new Promise((resolve) => setTimeout(resolve, 800))
  retrying.value = false
  retries.value++
}
</script>

<template>
  <KitPagePanel id="states" class="playground-section" title="Alerts and states">
    <h3>KitAlert</h3>
    <p class="playground-note">
      Flat in the page, unlike a toast: each tone's wash and its own icon, the words in the text
      color.
    </p>
    <div class="state-stack">
      <KitAlert v-for="{ tone, title, text } in tones" :key="tone" :tone="tone" :title="title">
        {{ text }}
        <template v-if="tone === 'warning'" #actions>
          <KitButton>Make room</KitButton>
          <KitButton variant="quiet">Move some books</KitButton>
        </template>
      </KitAlert>
      <KitAlert tone="info" title="With a link">
        Read <a href="#states">how shelves fill up</a> before you add more.
      </KitAlert>
    </div>

    <h3>A live alert</h3>
    <p class="playground-note">One that appears while the page is open is read out at once.</p>
    <div class="playground-row">
      <KitButton @click="liveShown = !liveShown">
        {{ liveShown ? 'Hide the live alert' : 'Show a live alert' }}
      </KitButton>
    </div>
    <KitAlert v-if="liveShown" tone="error" title="The shelf was deleted elsewhere" live>
      Its books are back with the unshelved ones.
    </KitAlert>

    <h3>Loading, empty and failed</h3>
    <div class="state-stack">
      <KitPagePanel title="Loading" :level="3">
        <KitLoadingState label="Loading the shelves…" />
      </KitPagePanel>
      <KitPagePanel title="Empty" :level="3">
        <KitEmptyState title="No books on this shelf" message="Add one, or move one here.">
          <template #icon><PlaygroundIcon name="plus" /></template>
          <template #actions><KitButton variant="primary">Add the first book</KitButton></template>
        </KitEmptyState>
      </KitPagePanel>
      <KitPagePanel title="Failed" :level="3">
        <KitErrorState
          title="Couldn’t load the shelves"
          :message="
            retries === 0
              ? 'The server said: try again in a moment.'
              : `Still failing (${retries}).`
          "
          :retrying="retrying"
          @retry="retry"
        />
      </KitPagePanel>
    </div>
  </KitPagePanel>
</template>

<style scoped>
.state-stack {
  display: flex;
  flex-direction: column;
  gap: var(--kit-space-sm);
  margin-bottom: var(--kit-space-lg);
}
</style>
