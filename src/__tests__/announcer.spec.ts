import { afterEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import KitAnnouncer from '../components/KitAnnouncer.vue'
import { ANNOUNCE_DELAY, announce } from '../composables/useAnnouncer'
import { kept, unmountKept } from './helpers'

afterEach(() => {
  unmountKept()
  vi.useRealTimers()
})

/** Two announcers, as the toast host's and an open dialog's would be, each marked. */
function twoAnnouncers() {
  const Page = defineComponent({
    setup: () => () => [
      h('div', { id: 'page' }, h(KitAnnouncer)),
      h('div', { id: 'dialog' }, h(KitAnnouncer)),
    ],
  })
  return kept(mount(Page, { attachTo: document.body }))
}

function said(where: string, role: 'status' | 'alert'): string | undefined {
  return document.querySelector(`#${where} [role="${role}"]`)?.textContent ?? undefined
}

describe('announce', () => {
  it('reads from the newest announcer, after a moment of quiet', async () => {
    vi.useFakeTimers()
    twoAnnouncers()
    announce('Copied the link', 'polite')
    await nextTick()
    expect(said('dialog', 'status')).toBe('')
    vi.advanceTimersByTime(ANNOUNCE_DELAY)
    await nextTick()
    expect(said('dialog', 'status')).toBe('Copied the link')
    expect(said('page', 'status')).toBe('')

    announce('That didn’t save', 'assertive')
    vi.advanceTimersByTime(ANNOUNCE_DELAY)
    await nextTick()
    expect(said('dialog', 'alert')).toBe('That didn’t save')
  })

  it('reads the same message twice by emptying the region first', async () => {
    vi.useFakeTimers()
    twoAnnouncers()
    announce('Saved', 'polite')
    vi.advanceTimersByTime(ANNOUNCE_DELAY)
    await nextTick()
    announce('Saved', 'polite')
    await nextTick()
    expect(said('dialog', 'status')).toBe('')
    vi.advanceTimersByTime(ANNOUNCE_DELAY)
    await nextTick()
    expect(said('dialog', 'status')).toBe('Saved')
  })

  it('falls back to the older announcer once the newer one goes', async () => {
    vi.useFakeTimers()
    kept(mount(KitAnnouncer, { attachTo: document.body }))
    const dialog = mount(KitAnnouncer, { attachTo: document.body })
    dialog.unmount()
    announce('Back on the page', 'polite')
    vi.advanceTimersByTime(ANNOUNCE_DELAY)
    await nextTick()
    expect(document.querySelector('[role="status"]')?.textContent).toBe('Back on the page')
  })

  it('does nothing with no announcer on the page', () => {
    expect(() => {
      announce('Nobody listening', 'polite')
    }).not.toThrow()
  })
})
