import { afterEach, describe, expect, it, vi } from 'vitest'
import { h, nextTick } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import KitToastHost from '../components/KitToastHost.vue'
import { ANNOUNCE_DELAY } from '../composables/useAnnouncer'
import {
  dismissAllToasts,
  onToast,
  showToast,
  toastManager,
  useToast,
} from '../composables/useToast'
import { soon } from '../../shared/test/web/wait.js'
import { axeFindings, kept, unmountKept } from './helpers'

afterEach(() => {
  unmountKept()
  vi.useRealTimers()
})

async function settle(): Promise<void> {
  await flushPromises()
  await nextTick()
}

/** The toasts on screen, by their own class, newest first as Reka lists them. */
function toasts(): HTMLElement[] {
  return [...document.querySelectorAll<HTMLElement>('.kit-toast')]
}

describe('useToast', () => {
  it('raises each tone for its own while, announced at once', () => {
    // Stubbed, so nothing waits in the manager for the next spec's host to show.
    const add = vi.spyOn(toastManager, 'add').mockReturnValue('toast-id')
    const toast = useToast()
    toast.success('Saved')
    toast.error('That didn’t save', 'The shelf is gone.')
    toast.warning('Nearly full', 'Two places left on the shelf.')
    toast.info('Heads up')
    expect(add.mock.calls.map(([options]) => options)).toEqual([
      {
        title: 'Saved',
        description: undefined,
        status: 'success',
        type: 'foreground',
        duration: 4000,
      },
      {
        title: 'That didn’t save',
        description: 'The shelf is gone.',
        status: 'error',
        type: 'foreground',
        duration: 8000,
      },
      {
        title: 'Nearly full',
        description: 'Two places left on the shelf.',
        status: 'warning',
        type: 'foreground',
        duration: 8000,
      },
      {
        title: 'Heads up',
        description: undefined,
        status: 'info',
        type: 'foreground',
        duration: 6000,
      },
    ])
    expect(showToast('info', 'Again')).toBe('toast-id')
  })

  it('hands each toast raised to a listener, until it stops listening', () => {
    vi.spyOn(toastManager, 'add').mockReturnValueOnce('toast-a').mockReturnValueOnce('toast-b')
    const heard: unknown[] = []
    const stop = onToast((toast) => heard.push(toast))
    const toast = useToast()
    toast.error('That didn’t save', 'The shelf is gone.')
    stop()
    toast.success('Saved')
    expect(heard).toEqual([
      { id: 'toast-a', tone: 'error', title: 'That didn’t save', detail: 'The shelf is gone.' },
    ])
  })

  it('takes back every toast still up, for a spec to start clean', () => {
    vi.spyOn(toastManager, 'add').mockReturnValueOnce('toast-a').mockReturnValueOnce('toast-b')
    const close = vi.spyOn(toastManager, 'close').mockReturnValue(undefined)
    // The earlier specs' toasts are still counted as up, as a previous test's would be in an app.
    dismissAllToasts()
    close.mockClear()
    const toast = useToast()
    toast.info('One')
    toast.info('Two')
    toast.dismiss('toast-a')
    dismissAllToasts()
    expect(close.mock.calls).toEqual([['toast-a'], ['toast-b']])
    dismissAllToasts()
    expect(close).toHaveBeenCalledTimes(2)
  })

  it('takes a toast back by its id', () => {
    const close = vi.spyOn(toastManager, 'close').mockReturnValue(undefined)
    useToast().dismiss('toast-1')
    expect(close).toHaveBeenCalledWith('toast-1')
  })
})

describe('KitToastHost', () => {
  it('shows each toast with its words and tone, with nothing axe finds', async () => {
    kept(mount(KitToastHost, { attachTo: document.body }))
    const toast = useToast()
    toast.success('Saved the shelf')
    toast.error('That didn’t save', 'The shelf is gone.')
    await settle()

    const shown = toasts()
    expect(shown).toHaveLength(2)
    const failed = shown.find((element) => element.classList.contains('kit-toast--error'))
    expect(failed?.querySelector('.kit-toast__title')?.textContent).toBe('That didn’t save')
    expect(failed?.querySelector('.kit-toast__detail')?.textContent).toBe('The shelf is gone.')
    const saved = shown.find((element) => element.classList.contains('kit-toast--success'))
    expect(saved?.querySelector('.kit-toast__detail')).toBeNull()
    // With no icon from the app, the kit draws each tone's own shape, hidden from screen readers.
    expect(saved?.querySelector('.kit-toast__icon')?.getAttribute('aria-hidden')).toBe('true')
    expect(saved?.querySelector('svg[data-tone="success"]')).not.toBeNull()
    expect(failed?.querySelector('svg[data-tone="error"]')).not.toBeNull()
    expect(await axeFindings(document.body)).toEqual([])
  })

  it('shows a toast raised before it mounted, once it does', async () => {
    useToast().info('Raised early')
    kept(mount(KitToastHost, { attachTo: document.body }))
    await settle()
    expect(toasts().map((element) => element.textContent)).toContain('Raised early')
  })

  it('draws each tone’s icon from the app’s own icon set', async () => {
    kept(
      mount(KitToastHost, {
        slots: { icon: ({ tone }: { tone: string }) => h('svg', { 'data-icon': tone }) },
        attachTo: document.body,
      }),
    )
    const toast = useToast()
    toast.warning('Nearly full')
    toast.info('Heads up')
    toastManager.add({ title: 'From elsewhere', type: 'foreground' })
    await settle()
    const icons = toasts().map((element) =>
      element.querySelector('.kit-toast__icon svg')?.getAttribute('data-icon'),
    )
    expect(icons.sort()).toEqual(['info', 'info', 'warning'])
    expect(
      toasts().filter((element) => element.classList.contains('kit-toast--info')),
    ).toHaveLength(2)
  })

  it('reads each toast out once, an error at once and the rest politely', async () => {
    vi.useFakeTimers()
    kept(mount(KitToastHost, { attachTo: document.body }))
    const toast = useToast()
    toast.success('Saved the shelf')
    await settle()
    vi.advanceTimersByTime(ANNOUNCE_DELAY)
    await nextTick()
    expect(document.querySelector('.kit-announcer [aria-live="polite"]')?.textContent).toBe(
      'Saved the shelf',
    )

    toast.error('That didn’t save', 'The shelf is gone.')
    await settle()
    vi.advanceTimersByTime(ANNOUNCE_DELAY)
    await nextTick()
    expect(document.querySelector('.kit-announcer [aria-live="assertive"]')?.textContent).toBe(
      'That didn’t save. The shelf is gone.',
    )
  })

  it('leaves Reka’s own announcer hidden, so no toast is read twice', async () => {
    // Reka 2.11 hides its toasts' announcer from screen readers, which is why the kit has its
    // own. The day this fails, Reka's speaks: remove KitAnnouncer from the toasts then, or
    // every toast is read twice.
    kept(mount(KitToastHost, { attachTo: document.body }))
    useToast().warning('Nearly full')
    await settle()
    // Reka adds its announcer a couple of frames after the toast.
    await soon(() => {
      expect(
        document.querySelectorAll('.kit-toast [role="alert"], [role="alert"][data-hidden]').length,
      ).toBeGreaterThan(0)
    })
    const reka = [...document.querySelectorAll('[role="alert"]')].filter(
      (element) => !element.closest('.kit-announcer'),
    )
    expect(reka.length).toBeGreaterThan(0)
    expect(reka.every((element) => element.getAttribute('aria-hidden') === 'true')).toBe(true)
  })

  it('closes a toast on its Dismiss button', async () => {
    kept(mount(KitToastHost, { attachTo: document.body }))
    useToast().success('Saved')
    await settle()
    const dismiss = toasts()[0]?.querySelector<HTMLButtonElement>('button[aria-label="Dismiss"]')
    expect(dismiss?.getAttribute('title')).toBe('Dismiss')
    dismiss?.click()
    await settle()
    expect(toasts().every((element) => element.dataset.state === 'closed')).toBe(true)
  })
})
