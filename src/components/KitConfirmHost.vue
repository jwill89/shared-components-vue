<script setup lang="ts">
// Answers `confirm()` and `ask()` with the one KitConfirmDialog, one question at a time. The app mounts it
// once, at its root; `confirm()` refuses to ask while none is mounted.
import { onBeforeUnmount } from 'vue'
import { registerConfirmHost, useConfirmQueue } from '../composables/useConfirmQueue'
import KitConfirmDialog from './KitConfirmDialog.vue'

const { current, answer } = useConfirmQueue()
onBeforeUnmount(registerConfirmHost())
</script>

<template>
  <KitConfirmDialog
    :open="current !== undefined"
    :title="current?.title ?? ''"
    :message="current?.message ?? ''"
    :answers="current?.answers ?? []"
    :cancel-label="current?.cancelLabel"
    @choose="answer"
    @cancel="answer(null)"
  />
</template>
