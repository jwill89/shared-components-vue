import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, ref } from 'vue'
import type { Component, Ref } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import type { TurnstileApi, TurnstileOptions } from '../composables/turnstile'
import { soon } from '../../shared/test/web/wait.js'
import { axeFindings, kept, unmountKept } from './helpers'

const SCRIPT = 'script[src^="https://challenges.cloudflare.com/turnstile/"]'

// The loader keeps Cloudflare's script for the page, as it should; each test starts from a page
// that has never loaded it, with the widget and its loader imported afresh.
let KitTurnstileWidget: Component
beforeEach(async () => {
  vi.resetModules()
  KitTurnstileWidget = (await import('../components/KitTurnstileWidget.vue')).default
})

afterEach(() => {
  unmountKept()
  document.querySelectorAll(`${SCRIPT}, meta[property="csp-nonce"]`).forEach((el) => {
    el.remove()
  })
  delete (window as { turnstile?: TurnstileApi }).turnstile
})

/** Turnstile's script as a stand-in: each widget it draws, by id, with what it was drawn with. */
function cloudflare() {
  const drawn = new Map<string, TurnstileOptions>()
  const api = {
    render: vi.fn((_container: HTMLElement, options: TurnstileOptions) => {
      const id = `w${String(drawn.size + 1)}`
      drawn.set(id, options)
      return id
    }),
    reset: vi.fn(),
    remove: vi.fn(),
  }
  return { api, drawn }
}

/** A widget with its token kept, as a form's v-model keeps it. */
function widget(props: Record<string, unknown> = {}): {
  token: Ref<string>
  exposed: () => { reset: () => void }
  unmount: () => void
} {
  const token = ref('stale')
  let instance: { reset: () => void } | null = null
  const wrapper = kept(
    mount(
      defineComponent({
        setup: () => () =>
          h(KitTurnstileWidget, {
            siteKey: '1x00000000000000000000AA',
            action: 'login',
            ...props,
            modelValue: token.value,
            'onUpdate:modelValue': (next: string) => {
              token.value = next
            },
            ref: (el: unknown) => {
              instance = el as { reset: () => void } | null
            },
          }),
      }),
      { attachTo: document.body },
    ),
  )
  return {
    token,
    exposed: () => {
      if (!instance) {
        throw new Error('No widget.')
      }
      return instance
    },
    unmount: () => {
      wrapper.unmount()
    },
  }
}

/** Cloudflare's script, as the page holds it. */
function script(): HTMLScriptElement {
  const found = document.querySelector<HTMLScriptElement>(SCRIPT)
  if (!found) {
    throw new Error('No Turnstile script.')
  }
  return found
}

function loads(api: TurnstileApi): void {
  ;(window as { turnstile?: TurnstileApi }).turnstile = api
  script().dispatchEvent(new Event('load'))
}

describe('KitTurnstileWidget', () => {
  it('loads Cloudflare’s script once for every widget, admitted by the page’s nonce', async () => {
    const meta = document.createElement('meta')
    meta.setAttribute('property', 'csp-nonce')
    meta.nonce = 'n0nce'
    document.head.append(meta)

    const { api, drawn } = cloudflare()
    widget()
    widget({ action: 'register' })
    await flushPromises()
    expect(document.querySelectorAll(SCRIPT)).toHaveLength(1)
    expect(script().nonce).toBe('n0nce')

    loads(api)
    await soon(() => {
      expect(api.render).toHaveBeenCalledTimes(2)
    })
    expect([...drawn.values()].map((options) => options.action)).toEqual(['login', 'register'])
    expect(drawn.get('w1')?.sitekey).toBe('1x00000000000000000000AA')
  })

  it('holds the token while it is good, and clears it when it expires, fails or is reset', async () => {
    const { api, drawn } = cloudflare()
    const { token, exposed, unmount } = widget()
    await flushPromises()
    loads(api)
    const options = await soon(() => {
      const found = drawn.get('w1')
      expect(found).toBeDefined()
      return found
    })

    options?.callback('t0ken')
    expect(token.value).toBe('t0ken')
    options?.['expired-callback']()
    expect(token.value).toBe('')
    options?.callback('again')
    options?.['error-callback']()
    expect(token.value).toBe('')

    options?.callback('spent')
    exposed().reset()
    expect(token.value).toBe('')
    expect(api.reset).toHaveBeenCalledWith('w1')

    unmount()
    expect(api.remove).toHaveBeenCalledWith('w1')
  })

  it('says so when the script can’t load, and the next widget tries again', async () => {
    widget()
    await flushPromises()
    script().dispatchEvent(new Event('error'))
    const alert = await soon(() => {
      const found = document.querySelector('.kit-turnstile-widget [role="alert"]')
      expect(found?.textContent).toContain('couldn’t load')
      return found
    })
    expect(alert).not.toBeNull()
    expect(document.querySelector(SCRIPT)).toBeNull()
    expect(await axeFindings(document.body)).toEqual([])

    widget()
    await flushPromises()
    expect(document.querySelectorAll(SCRIPT)).toHaveLength(1)
  })

  it('draws nothing for a form that went while the script loaded', async () => {
    const { api } = cloudflare()
    const { unmount } = widget()
    await flushPromises()
    unmount()
    loads(api)
    await flushPromises()
    expect(api.render).not.toHaveBeenCalled()
  })
})
