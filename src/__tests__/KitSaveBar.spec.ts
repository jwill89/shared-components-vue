import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, nextTick, ref } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import KitConfirmHost from '../components/KitConfirmHost.vue'
import KitSaveBar from '../components/KitSaveBar.vue'
import type { KitSaveState } from '../components/KitSaveBar.vue'
import { announce } from '../composables/useAnnouncer'
import { useLeaveGuard } from '../composables/useLeaveGuard'
import type { KitLeaveGuard, KitLeaveGuardOptions } from '../composables/useLeaveGuard'
import { axeFindings, kept, unmountKept } from './helpers'

vi.mock(import('../composables/useAnnouncer'), async (original) => ({
  ...(await original()),
  announce: vi.fn(),
}))

afterEach(unmountKept)
beforeEach(() => {
  vi.mocked(announce).mockClear()
})

async function settle(): Promise<void> {
  await flushPromises()
  await nextTick()
}

function button(name: string): HTMLButtonElement {
  const found = [...document.querySelectorAll('button')].find(
    (candidate) => candidate.textContent.trim() === name,
  )
  if (!found) {
    throw new Error(`No "${name}" button.`)
  }
  return found
}

function words(wrapper: ReturnType<typeof mount>): string[] {
  return wrapper.findAll('button').map((found) => found.text())
}

describe('KitSaveBar', () => {
  it('shows nothing while clean, and Save and Discard while dirty, with nothing axe finds', async () => {
    const wrapper = kept(mount(KitSaveBar, { props: { state: 'clean' }, attachTo: document.body }))
    expect(wrapper.find('.kit-save-bar').exists()).toBe(false)

    await wrapper.setProps({ state: 'dirty' })
    expect(wrapper.get('.kit-save-bar__message').text()).toBe('You have unsaved changes.')
    expect(words(wrapper)).toEqual(['Discard', 'Save'])
    expect(announce).toHaveBeenCalledWith('You have unsaved changes.', 'polite')
    expect(await axeFindings(wrapper)).toEqual([])

    await wrapper.get('button.kit-button--primary').trigger('click')
    await wrapper.get('button.kit-button--quiet').trigger('click')
    expect(wrapper.emitted('save')).toHaveLength(1)
    expect(wrapper.emitted('discard')).toHaveLength(1)
  })

  it('holds both buttons while saving, then says it saved', async () => {
    const wrapper = kept(mount(KitSaveBar, { props: { state: 'dirty' as KitSaveState } }))
    await wrapper.setProps({ state: 'saving' })
    expect(wrapper.get('.kit-save-bar__message').text()).toBe('Saving…')
    expect(wrapper.findAll('button').every((found) => found.element.disabled)).toBe(true)
    expect(wrapper.get('button.kit-button--primary').attributes('aria-busy')).toBe('true')

    await wrapper.setProps({ state: 'saved' })
    expect(wrapper.get('.kit-save-bar__message').text()).toBe('Saved.')
    expect(wrapper.findAll('button')).toHaveLength(0)
    expect(announce).toHaveBeenLastCalledWith('Saved.', 'polite')
  })

  it('offers Reload on a conflict, washed in the warning tone, and says so at once', async () => {
    const wrapper = kept(
      mount(KitSaveBar, {
        props: { state: 'dirty' as KitSaveState, reloadLabel: 'Load theirs' },
        slots: { 'reload-icon': () => h('svg', { 'data-icon': 'reload' }) },
        attachTo: document.body,
      }),
    )
    await wrapper.setProps({ state: 'conflict' })
    expect(wrapper.get('.kit-save-bar').classes()).toContain('kit-save-bar--conflict')
    expect(words(wrapper)).toEqual(['Load theirs'])
    expect(wrapper.find('[data-icon="reload"]').exists()).toBe(true)
    expect(announce).toHaveBeenLastCalledWith(
      expect.stringContaining('changed somewhere else') as string,
      'assertive',
    )
    expect(await axeFindings(wrapper)).toEqual([])
    await wrapper.get('button').trigger('click')
    expect(wrapper.emitted('reload')).toHaveLength(1)

    vi.mocked(announce).mockClear()
    await wrapper.setProps({ state: 'clean' })
    expect(announce).not.toHaveBeenCalled()
  })
})

/** A page holding work or not, with the guard set up in its setup. */
function guarded(options: KitLeaveGuardOptions = {}) {
  const holding = ref(true)
  let guard: KitLeaveGuard | undefined
  const page = kept(
    mount(
      defineComponent({
        setup() {
          guard = useLeaveGuard(() => holding.value, options)
          return () => h('p', 'A form')
        },
      }),
    ),
  )
  if (!guard) {
    throw new Error('The guard wasn’t set up.')
  }
  return { holding, guard, page }
}

describe('useLeaveGuard', () => {
  it('has the browser ask before the page goes while it holds work, until let go', () => {
    const { holding, page } = guarded()
    const leaving = new Event('beforeunload', { cancelable: true })
    window.dispatchEvent(leaving)
    expect(leaving.defaultPrevented).toBe(true)

    holding.value = false
    const clean = new Event('beforeunload', { cancelable: true })
    window.dispatchEvent(clean)
    expect(clean.defaultPrevented).toBe(false)

    holding.value = true
    page.unmount()
    const after = new Event('beforeunload', { cancelable: true })
    window.dispatchEvent(after)
    expect(after.defaultPrevented).toBe(false)
  })

  it('asks through the confirm dialog before a move the router makes, and goes only if told', async () => {
    kept(mount(KitConfirmHost, { attachTo: document.body }))
    let routeGuard: (() => boolean | Promise<boolean>) | undefined
    const { holding } = guarded({
      onBeforeRouteLeave: (given) => {
        routeGuard = given
      },
    })
    const staying = routeGuard?.()
    await settle()
    const question = document.querySelector('[role="alertdialog"]')
    expect(question?.textContent).toContain('Leave without saving?')
    button('Stay').click()
    expect(await staying).toBe(false)
    await settle()

    const going = routeGuard?.()
    await settle()
    button('Leave').click()
    expect(await going).toBe(true)

    holding.value = false
    expect(routeGuard?.()).toBe(true)
  })

  it('asks in its own words before a leaving of the page’s own, and not at all with nothing held', async () => {
    kept(mount(KitConfirmHost, { attachTo: document.body }))
    const { holding, guard } = guarded({
      title: 'Close without saving?',
      message: 'The note you were writing goes.',
      leaveLabel: 'Close it',
      stayLabel: 'Keep writing',
    })
    const closing = guard.mayLeave()
    await settle()
    expect(document.querySelector('[role="alertdialog"]')?.textContent).toContain(
      'Close without saving?',
    )
    button('Keep writing').click()
    expect(await closing).toBe(false)

    holding.value = false
    expect(await guard.mayLeave()).toBe(true)
  })
})
