<script setup lang="ts">
// The toasts themselves, for KitToastHost: it reads the list from the provider the host sets
// up, so it sits inside it. Reka draws each toast inside the stack, outside this component's
// tree, where scoped styles can't reach, so the styles below are unscoped, and still in the
// kit's layer. Each new toast is read out through the kit's announcer (KitAnnouncer.vue).
import { watch } from 'vue'
import { ToastClose, ToastDescription, ToastRoot, ToastTitle, useToastManager } from 'reka-ui'
import { announce } from '../composables/useAnnouncer'
import type { KitToastTone } from '../composables/useToast'
import KitGlyph from './KitGlyph.vue'
import KitIconButton from './KitIconButton.vue'
import KitToneIcon from './KitToneIcon.vue'

defineSlots<{
  icon?: (props: { tone: KitToastTone }) => unknown
}>()

const { toasts } = useToastManager()

function toneOf(status: string | undefined): KitToastTone {
  return status === 'success' || status === 'error' || status === 'warning' ? status : 'info'
}

// Each toast is read once, as it arrives: an error or a warning at once, the rest politely.
const heard = new Set<string>()
watch(
  toasts,
  (list) => {
    for (const toast of list) {
      if (heard.has(toast.id)) {
        continue
      }
      heard.add(toast.id)
      const tone = toneOf(toast.status)
      const words = [toast.title, toast.description].filter(Boolean).join('. ')
      announce(words, tone === 'error' || tone === 'warning' ? 'assertive' : 'polite')
    }
  },
  { immediate: true, deep: true },
)
</script>

<template>
  <ToastRoot
    v-for="toast in toasts"
    :key="toast.id"
    :toast="toast"
    class="kit-toast"
    :class="`kit-toast--${toneOf(toast.status)}`"
  >
    <span class="kit-toast__icon" aria-hidden="true">
      <slot name="icon" :tone="toneOf(toast.status)"
        ><KitToneIcon :tone="toneOf(toast.status)"
      /></slot>
    </span>
    <div class="kit-toast__words">
      <ToastTitle class="kit-toast__title" />
      <ToastDescription v-if="toast.description" class="kit-toast__detail" />
    </div>
    <ToastClose as-child>
      <KitIconButton class="kit-toast__close" label="Dismiss" variant="plain"
        ><KitGlyph name="cross"
      /></KitIconButton>
    </ToastClose>
  </ToastRoot>
</template>

<style>
/*
 * Each tone sets the color its toast is washed and edged with. The wash is 10% of the tone over
 * the raised surface; contrast.ts (TOAST_TINT) holds the same number, and contrast.spec.ts
 * measures the words and the icons on it.
 */
@layer kit {
  /* The stack takes no clicks itself, so its empty area never covers what is under it. */
  .kit-toast-stack {
    position: fixed;
    top: var(--kit-toast-inset-top);
    right: 0;
    z-index: var(--kit-layer-toast);
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    gap: var(--kit-space-xs);
    width: min(100%, var(--kit-width-toast));
    max-height: 100vh;
    margin: 0;
    padding: var(--kit-space-md);
    list-style: none;
    outline: none;
    pointer-events: none;
  }

  .kit-toast {
    --kit-toast-tone: var(--kit-text-muted);

    box-sizing: border-box;
    display: flex;
    align-items: flex-start;
    gap: var(--kit-space-sm);
    padding: var(--kit-space-sm) var(--kit-space-sm) var(--kit-space-sm) var(--kit-space-md);
    border: var(--kit-control-border-width) solid var(--kit-toast-tone);
    border-inline-start-width: 0.375rem;
    border-radius: var(--kit-radius-md);
    background: color-mix(in srgb, var(--kit-surface-raised) 90%, var(--kit-toast-tone));
    color: var(--kit-text);
    font-family: var(--kit-font-body);
    box-shadow: var(--kit-shadow-overlay);
    pointer-events: auto;
  }

  .kit-toast--success {
    --kit-toast-tone: var(--kit-success);
  }

  .kit-toast--warning {
    --kit-toast-tone: var(--kit-warning);
  }

  .kit-toast--error {
    --kit-toast-tone: var(--kit-danger);
  }

  .kit-toast__icon {
    display: inline-flex;
    flex: none;
    margin-block-start: 0.2rem;
    color: var(--kit-toast-tone);
  }

  .kit-toast__words {
    flex: 1;
    min-width: 0;
    overflow-wrap: anywhere;
  }

  .kit-toast__title {
    font-weight: var(--kit-font-weight-strong);
  }

  .kit-toast__detail {
    margin-block-start: var(--kit-space-2xs);
  }

  /* The Dismiss button sits in the corner, its touch target reaching into the padding. */
  .kit-toast__close {
    flex: none;
    margin: calc(-1 * var(--kit-space-xs)) calc(-1 * var(--kit-space-xs)) 0 0;
  }

  .kit-toast[data-swipe='move'] {
    transform: translateX(var(--reka-toast-swipe-move-x));
  }

  @media (prefers-reduced-motion: no-preference) {
    .kit-toast[data-state='open'] {
      animation: kit-toast-in var(--kit-duration-quick) ease-out;
    }

    .kit-toast[data-state='closed'] {
      animation: kit-toast-out var(--kit-duration-quick) ease-in forwards;
    }
  }

  /* A toast still leaves when motion is reduced, only without moving: Reka waits for the end
     of its closing animation, which a removed one would never send. */
  @media (prefers-reduced-motion: reduce) {
    .kit-toast[data-state='closed'] {
      animation: kit-toast-fade 1ms forwards;
    }
  }

  @keyframes kit-toast-in {
    from {
      opacity: 0;
      transform: translateY(-0.5rem);
    }
  }

  @keyframes kit-toast-out {
    to {
      opacity: 0;
      transform: translateX(100%);
    }
  }

  @keyframes kit-toast-fade {
    to {
      opacity: 0;
    }
  }
}
</style>
