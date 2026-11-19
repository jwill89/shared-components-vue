<script setup lang="ts">
// What a list or page shows once it has loaded and holds nothing: what isn't there, why or what
// to do (the `message` prop, or its slot for markup such as a link), and the button that does
// it. Never shown while loading, which is KitLoadingState, or after a failed load, which is
// KitErrorState: a list that holds nothing and one nobody could read are not the same news.
defineProps<{
  title: string
  message?: string
}>()

defineSlots<{
  icon?: () => unknown
  message?: () => unknown
  actions?: () => unknown
}>()
</script>

<template>
  <div class="kit-empty-state">
    <span v-if="$slots.icon" class="kit-empty-state__icon" aria-hidden="true">
      <slot name="icon" />
    </span>
    <p class="kit-empty-state__title">{{ title }}</p>
    <p v-if="message || $slots.message" class="kit-empty-state__message">
      <slot name="message">{{ message }}</slot>
    </p>
    <div v-if="$slots.actions" class="kit-empty-state__actions"><slot name="actions" /></div>
  </div>
</template>

<style scoped>
@layer kit {
  .kit-empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--kit-space-xs);
    padding: var(--kit-space-xl) var(--kit-space-md);
    text-align: center;
  }

  .kit-empty-state__icon {
    display: inline-flex;
    color: var(--kit-text-muted);
    font-size: var(--kit-text-size-xl);
  }

  .kit-empty-state__title {
    margin: 0;
    font-size: var(--kit-text-size-lg);
    font-weight: var(--kit-font-weight-strong);
  }

  .kit-empty-state__message {
    max-width: var(--kit-measure-prose);
    margin: 0;
    color: var(--kit-text-muted);
  }

  .kit-empty-state__actions {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: var(--kit-space-xs);
    margin-block-start: var(--kit-space-xs);
  }
}
</style>
