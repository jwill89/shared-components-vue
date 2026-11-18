<script setup lang="ts">
// The playground: every color pair the default theme holds, with its ratio in the scheme on
// screen, and every component in each of its states as each lands. The end-to-end suite runs
// axe on it in both schemes, with the AAA rules on.
import { computed, onBeforeUnmount, ref, watchEffect } from 'vue'
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

// The page's scheme is one attribute on <html>, as in an app; the kit's colors follow it.
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
    <header class="playground__header">
      <h1 class="playground__title">shared-components-vue</h1>
      <p class="playground__intro">
        Every color pair the default theme holds, measured in the scheme on screen. Each component
        joins this page, in each of its states, as it lands.
      </p>
      <label class="playground__scheme">
        Color scheme
        <select v-model="scheme" class="playground__select">
          <option value="device">Device</option>
          <option value="light">Light</option>
          <option value="dark">Dark</option>
        </select>
      </label>
    </header>

    <section class="playground__section" aria-labelledby="pairs-heading">
      <h2 id="pairs-heading">Color pairs</h2>
      <TokenPairs :key="shownScheme" />
    </section>
  </main>
</template>

<style scoped>
.playground {
  max-width: var(--kit-width-dialog-wide);
  margin: 0 auto;
  padding: var(--kit-space-lg) var(--kit-space-md);
}

.playground__title {
  margin: 0 0 var(--kit-space-xs);
  font-size: var(--kit-text-size-xl);
}

.playground__intro {
  max-width: var(--kit-measure-prose);
  margin: 0 0 var(--kit-space-md);
  color: var(--kit-text-muted);
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

.playground__section {
  margin-top: var(--kit-space-xl);
}
</style>
