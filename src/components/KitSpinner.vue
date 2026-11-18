<script setup lang="ts">
// A turning ring that says something is under way. Alone it is only a picture, hidden from
// screen readers, for a holder that says in words what is loading (a busy button, say). Given
// `label`, it says so itself: the ring and the words, in a status a screen reader reads once,
// politely. It takes the size and color of the text around it.
defineProps<{
  /** What is loading, as a sentence: "Loading the books…". */
  label?: string
}>()
</script>

<template>
  <span
    class="kit-spinner"
    :class="{ 'kit-spinner--labelled': label }"
    :role="label ? 'status' : undefined"
    :aria-hidden="label ? undefined : 'true'"
  >
    <span class="kit-spinner__ring" aria-hidden="true"></span>
    <span v-if="label" class="kit-spinner__label">{{ label }}</span>
  </span>
</template>

<style scoped>
@layer kit {
  .kit-spinner {
    display: inline-flex;
    flex: none;
    align-items: center;
    gap: var(--kit-space-xs);
  }

  .kit-spinner--labelled {
    color: var(--kit-text-muted);
  }

  .kit-spinner__ring {
    box-sizing: border-box;
    display: inline-block;
    flex: none;
    width: 1em;
    height: 1em;
    border: 0.15em solid currentcolor;
    border-right-color: transparent;
    border-radius: var(--kit-radius-full);
    animation: kit-spinner-turn var(--kit-duration-spin) linear infinite;
  }

  /* Slower rather than still, so it still shows that something is happening. */
  @media (prefers-reduced-motion: reduce) {
    .kit-spinner__ring {
      animation-duration: calc(var(--kit-duration-spin) * 4);
    }
  }

  @keyframes kit-spinner-turn {
    to {
      transform: rotate(1turn);
    }
  }
}
</style>
