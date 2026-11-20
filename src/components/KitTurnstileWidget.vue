<script setup lang="ts">
// Cloudflare Turnstile's check that whoever fills in a form isn't a bot. The model is its token:
// '' until the check passes, and again once the token expires, the check fails, or `reset()` is
// called. A token passes the server once, so a form resets the widget after every try. The
// script loads once, the first time a widget needs it, and every widget shares it; it is
// admitted by the page's Content-Security-Policy nonce, Vite's `<meta property="csp-nonce">`
// unless `nonce` gives another. Where it can't load, the widget says so in an alert.
import { onBeforeUnmount, onMounted, ref, useTemplateRef } from 'vue'
import { loadTurnstile, pageNonce } from '../composables/turnstile'
import type { TurnstileApi } from '../composables/turnstile'
import KitAlert from './KitAlert.vue'

const props = withDefaults(
  defineProps<{
    siteKey: string
    /** What the form does ("login"), which the server checks the token was made for. */
    action?: string
    /** The scheme the widget is drawn in; `auto` follows the device, not the page. */
    theme?: 'auto' | 'light' | 'dark'
    /** The page's Content-Security-Policy nonce, where it isn't in Vite's meta tag. */
    nonce?: string
    /** What the alert says when the check can't load. */
    failedText?: string
  }>(),
  {
    action: undefined,
    theme: 'auto',
    nonce: undefined,
    failedText: 'The check that you’re not a bot couldn’t load. Reload the page to try again.',
  },
)

const token = defineModel<string>({ required: true })

const container = useTemplateRef<HTMLDivElement>('container')
const failed = ref(false)
let turnstile: TurnstileApi | null = null
let widgetId: string | null = null
let gone = false

onMounted(async () => {
  try {
    const api = await loadTurnstile(props.nonce ?? pageNonce())
    // The form may have gone while the script loaded.
    if (gone || !container.value) {
      return
    }
    turnstile = api
    widgetId = api.render(container.value, {
      sitekey: props.siteKey,
      action: props.action,
      theme: props.theme,
      callback: (value) => {
        token.value = value
      },
      'expired-callback': () => {
        token.value = ''
      },
      'error-callback': () => {
        token.value = ''
      },
    })
  } catch {
    failed.value = true
  }
})

onBeforeUnmount(() => {
  gone = true
  if (turnstile && widgetId !== null) {
    turnstile.remove(widgetId)
  }
})

/** Clears the token and asks for a fresh one, as a form does after each try. */
function reset(): void {
  token.value = ''
  if (turnstile && widgetId !== null) {
    turnstile.reset(widgetId)
  }
}

defineExpose({ reset })
</script>

<template>
  <div class="kit-turnstile-widget">
    <div v-if="!failed" ref="container" class="kit-turnstile-widget__frame" />
    <KitAlert v-else tone="error" live>{{ failedText }}</KitAlert>
  </div>
</template>

<style scoped>
@layer kit {
  /* Room for Turnstile's frame before it draws, so the form doesn't jump when it does. */
  .kit-turnstile-widget__frame {
    min-height: var(--kit-height-turnstile);
  }
}
</style>
