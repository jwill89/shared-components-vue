<script setup lang="ts">
// KitSpinner alone, as a picture beside words that say what is loading, and with its own words.
import { KitSpinner } from '@jwill89/shared-components-vue'
</script>

<template>
  <section class="playground-section" aria-labelledby="spinner-heading">
    <h2 id="spinner-heading">Spinner</h2>

    <h3>KitSpinner</h3>
    <p class="playground-note">It takes the size and color of the text around it.</p>
    <div class="playground-row">
      <span class="playground-inline"><KitSpinner /> Saving the shelf…</span>
      <KitSpinner label="Loading the books…" />
      <span class="spinner-large"><KitSpinner label="Loading the page…" /></span>
    </div>
  </section>
</template>

<style scoped>
.spinner-large {
  font-size: var(--kit-text-size-lg);
}
</style>
