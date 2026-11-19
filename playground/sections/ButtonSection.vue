<script setup lang="ts">
// KitButton and KitIconButton in each variant and each state. A hover can't be shown at rest,
// so its colors are in the color pairs below, measured.
import { KitPagePanel, KitButton, KitIconButton } from '@jwill89/shared-components-vue'
import type { KitButtonVariant } from '@jwill89/shared-components-vue'
import PlaygroundIcon from '../PlaygroundIcon.vue'

const variants: { variant: KitButtonVariant; label: string }[] = [
  { variant: 'primary', label: 'Primary' },
  { variant: 'secondary', label: 'Secondary' },
  { variant: 'danger', label: 'Danger' },
  { variant: 'quiet', label: 'Quiet' },
  { variant: 'plain', label: 'Plain' },
]
</script>

<template>
  <KitPagePanel id="buttons" class="playground-section" title="Buttons">
    <h3>KitButton</h3>
    <p class="playground-note">At rest, with an icon, busy, and disabled.</p>
    <div class="playground-row">
      <KitButton v-for="{ variant, label } in variants" :key="variant" :variant="variant">
        {{ label }}
      </KitButton>
    </div>
    <div class="playground-row">
      <KitButton v-for="{ variant, label } in variants" :key="variant" :variant="variant">
        <template #icon><PlaygroundIcon name="plus" /></template>
        {{ label }}
      </KitButton>
    </div>
    <div class="playground-row">
      <KitButton v-for="{ variant, label } in variants" :key="variant" :variant="variant" loading>
        <template #icon><PlaygroundIcon name="plus" /></template>
        {{ label }}
      </KitButton>
    </div>
    <div class="playground-row">
      <KitButton v-for="{ variant, label } in variants" :key="variant" :variant="variant" disabled>
        {{ label }}
      </KitButton>
    </div>

    <h3>As a link</h3>
    <p class="playground-note">For an action that opens another page.</p>
    <div class="playground-row">
      <KitButton href="#buttons" variant="primary">
        <template #icon><PlaygroundIcon name="arrow" /></template>
        Continue
      </KitButton>
      <KitButton href="#buttons">Read more</KitButton>
    </div>

    <h3>KitIconButton</h3>
    <p class="playground-note">
      Named by its label, which also shows as the browser's tooltip. At rest, busy, and disabled.
    </p>
    <div class="playground-row">
      <KitIconButton
        v-for="{ variant, label } in variants"
        :key="variant"
        :variant="variant"
        :label="`Add (${label.toLowerCase()})`"
      >
        <PlaygroundIcon name="plus" />
      </KitIconButton>
    </div>
    <div class="playground-row">
      <KitIconButton
        v-for="{ variant, label } in variants"
        :key="variant"
        :variant="variant"
        :label="`Delete (${label.toLowerCase()}, busy)`"
        loading
      >
        <PlaygroundIcon name="trash" />
      </KitIconButton>
    </div>
    <div class="playground-row">
      <KitIconButton
        v-for="{ variant, label } in variants"
        :key="variant"
        :variant="variant"
        :label="`Delete (${label.toLowerCase()}, disabled)`"
        disabled
      >
        <PlaygroundIcon name="trash" />
      </KitIconButton>
    </div>
  </KitPagePanel>
</template>
