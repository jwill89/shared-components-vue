<script setup lang="ts">
// A few drawn icons, standing in for an app's own icon set (its <font-awesome-icon>, say): the
// kit carries no icons, and takes whatever the app passes into its icon slots.
const props = defineProps<{
  name: 'plus' | 'trash' | 'arrow'
}>()

const paths: Record<typeof props.name, string> = {
  plus: 'M7 2h2v5h5v2H9v5H7V9H2V7h5z',
  trash: 'M5 1h6v2h4v2H1V3h4zM2.5 6h11l-1 9h-9z',
  arrow: 'M2 7h9.6L8.3 3.7l1.4-1.4L15.4 8l-5.7 5.7-1.4-1.4L11.6 9H2z',
}
</script>

<template>
  <svg
    viewBox="0 0 16 16"
    width="1em"
    height="1em"
    fill="currentColor"
    aria-hidden="true"
    focusable="false"
  >
    <path :d="paths[props.name]" />
  </svg>
</template>
