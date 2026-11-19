<script setup lang="ts">
// The playground: every color pair the kit names, in the playground's own colors with its ratio
// in the scheme on screen, and every component in each of its states as each lands. The end-to-end suite runs
// axe on it in both schemes, with the AAA rules on.
import { computed, onBeforeUnmount, ref, watchEffect } from 'vue'
import {
  KitConfirmHost,
  KitPageHeader,
  KitPagePanel,
  KitToastHost,
} from '@jwill89/shared-components-vue'
import ButtonSection from './sections/ButtonSection.vue'
import ChoiceSection from './sections/ChoiceSection.vue'
import DialogSection from './sections/DialogSection.vue'
import FieldSection from './sections/FieldSection.vue'
import SpinnerSection from './sections/SpinnerSection.vue'
import StateSection from './sections/StateSection.vue'
import ToastSection from './sections/ToastSection.vue'
import TokenPairs from './TokenPairs.vue'

type Scheme = 'device' | 'light' | 'dark'

const scheme = ref<Scheme>('device')

// The device's own scheme, followed while "Device" is picked, so the ratios are measured again
// when it changes.
const darkQuery = window.matchMedia('(prefers-color-scheme: dark)')
const deviceDark = ref(darkQuery.matches)
function followDevice(event: MediaQueryListEvent): void {
  deviceDark.value = event.matches
}
darkQuery.addEventListener('change', followDevice)
onBeforeUnmount(() => {
  darkQuery.removeEventListener('change', followDevice)
})

// The page's scheme is one attribute on <html>, as in an app; the page's colors follow it.
watchEffect(() => {
  const root = document.documentElement
  if (scheme.value === 'device') {
    root.removeAttribute('data-theme')
  } else {
    root.setAttribute('data-theme', scheme.value)
  }
})

// A new key draws the pairs again, and they measure what is on screen when they mount.
const shownScheme = computed(() => `${scheme.value}-${String(deviceDark.value)}`)
</script>

<template>
  <main id="main-content" class="playground">
    <!-- The page's own header and panels are the kit's, as an app's are. -->
    <KitPageHeader
      title="Playground"
      description="Every component in each of its states, and every color pair the kit names, measured in the playground’s colors in the scheme on screen."
      :crumbs="[
        { label: 'shared-components-vue', to: 'https://github.com/jwill89/shared-components-vue' },
      ]"
    >
      <template #actions>
        <label class="playground__scheme">
          Color scheme
          <select v-model="scheme" class="playground__select">
            <option value="device">Device</option>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
        </label>
      </template>
    </KitPageHeader>

    <ButtonSection />
    <SpinnerSection />
    <FieldSection />
    <ChoiceSection />
    <DialogSection />
    <ToastSection />
    <StateSection />

    <KitPagePanel id="pairs" class="playground-section" title="Color pairs">
      <TokenPairs :key="shownScheme" />
    </KitPagePanel>
  </main>
  <!-- Answers confirm() and shows the toasts, once each, at the root, as in an app. -->
  <KitConfirmHost />
  <KitToastHost />
</template>

<style scoped>
.playground {
  max-width: var(--kit-width-dialog-wide);
  margin: 0 auto;
  padding: var(--kit-space-lg) var(--kit-space-md);
}

.playground__scheme {
  display: inline-flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--kit-space-xs);
  font-weight: var(--kit-font-weight-strong);
}

.playground__select {
  min-height: var(--kit-control-height);
  padding: 0 var(--kit-space-sm);
  border: var(--kit-control-border-width) solid var(--kit-control-border);
  border-radius: var(--kit-radius-md);
  background: var(--kit-surface-raised);
  color: var(--kit-text);
  font: inherit;
}
</style>
