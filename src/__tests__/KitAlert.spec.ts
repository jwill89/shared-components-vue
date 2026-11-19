import { afterEach, describe, expect, it } from 'vitest'
import { h } from 'vue'
import { mount } from '@vue/test-utils'
import KitAlert from '../components/KitAlert.vue'
import KitButton from '../components/KitButton.vue'
import KitEmptyState from '../components/KitEmptyState.vue'
import KitErrorState from '../components/KitErrorState.vue'
import KitLoadingState from '../components/KitLoadingState.vue'
import { axeFindings, kept, unmountKept } from './helpers'

afterEach(unmountKept)

describe('KitAlert', () => {
  it('sits flat in the page, its words and buttons with nothing axe finds', async () => {
    const wrapper = kept(
      mount(KitAlert, {
        props: { tone: 'warning', title: 'The bot can’t post here' },
        slots: {
          default: () => 'It needs the Send Messages permission in #general.',
          actions: () => h(KitButton, null, () => 'Check again'),
        },
        attachTo: document.body,
      }),
    )
    expect(wrapper.classes()).toContain('kit-alert--warning')
    expect(wrapper.attributes('role')).toBeUndefined()
    expect(wrapper.get('.kit-alert__title').text()).toBe('The bot can’t post here')
    expect(wrapper.get('.kit-alert__text').text()).toContain('Send Messages')
    expect(wrapper.get('.kit-alert__actions button').text()).toBe('Check again')
    expect(await axeFindings(wrapper)).toEqual([])
  })

  it('draws each tone’s own shape when the app gives no icon, and the app’s when it does', () => {
    for (const tone of ['info', 'success', 'warning', 'error'] as const) {
      const wrapper = kept(mount(KitAlert, { props: { tone }, slots: { default: () => 'Note' } }))
      expect(wrapper.get('.kit-alert__icon').attributes('aria-hidden')).toBe('true')
      expect(wrapper.find(`svg[data-tone="${tone}"]`).exists()).toBe(true)
    }
    const own = kept(
      mount(KitAlert, {
        slots: { icon: () => h('svg', { 'data-icon': 'bell' }), default: () => 'x' },
      }),
    )
    expect(own.find('[data-icon="bell"]').exists()).toBe(true)
    expect(own.find('svg[data-tone]').exists()).toBe(false)
  })

  it('is read out when it appears while the page is open, an error at once', () => {
    const note = kept(mount(KitAlert, { props: { live: true }, slots: { default: () => 'x' } }))
    expect(note.attributes('role')).toBe('status')
    const error = kept(
      mount(KitAlert, { props: { live: true, tone: 'error' }, slots: { default: () => 'x' } }),
    )
    expect(error.attributes('role')).toBe('alert')
    const bare = kept(mount(KitAlert, { props: { title: 'Only a title' } }))
    expect(bare.find('.kit-alert__text').exists()).toBe(false)
    expect(bare.find('.kit-alert__actions').exists()).toBe(false)
  })
})

describe('KitEmptyState', () => {
  it('says what isn’t there and what to do, with nothing axe finds', async () => {
    const wrapper = kept(
      mount(KitEmptyState, {
        props: { title: 'No books on this shelf', message: 'Add one, or move one here.' },
        slots: {
          icon: () => h('svg', { 'data-icon': 'books' }),
          actions: () => h(KitButton, { variant: 'primary' }, () => 'Add a book'),
        },
        attachTo: document.body,
      }),
    )
    expect(wrapper.get('.kit-empty-state__title').text()).toBe('No books on this shelf')
    expect(wrapper.get('.kit-empty-state__message').text()).toBe('Add one, or move one here.')
    expect(wrapper.get('.kit-empty-state__icon').attributes('aria-hidden')).toBe('true')
    expect(wrapper.get('.kit-empty-state__actions button').text()).toBe('Add a book')
    expect(await axeFindings(wrapper)).toEqual([])
  })

  it('takes a message with markup, and needs neither an icon nor actions', () => {
    const wrapper = kept(
      mount(KitEmptyState, {
        props: { title: 'Nothing yet' },
        slots: { message: () => h('a', { href: '#help' }, 'How shelves work') },
      }),
    )
    expect(wrapper.get('.kit-empty-state__message a').text()).toBe('How shelves work')
    expect(wrapper.find('.kit-empty-state__icon').exists()).toBe(false)
    expect(wrapper.find('.kit-empty-state__actions').exists()).toBe(false)
  })
})

describe('KitErrorState', () => {
  it('says what failed and why, as an alert, and asks to try again', async () => {
    const wrapper = kept(
      mount(KitErrorState, {
        props: { title: 'Couldn’t load the shelves', message: 'The server is restarting.' },
        attachTo: document.body,
      }),
    )
    expect(wrapper.attributes('role')).toBe('alert')
    expect(wrapper.get('.kit-error-state__title').text()).toBe('Couldn’t load the shelves')
    expect(wrapper.get('.kit-error-state__message').text()).toBe('The server is restarting.')
    expect(wrapper.find('svg[data-tone="error"]').exists()).toBe(true)
    expect(await axeFindings(wrapper)).toEqual([])

    await wrapper.get('button').trigger('click')
    expect(wrapper.emitted('retry')).toHaveLength(1)
  })

  it('waits while the retry runs, and takes its own words and icon', () => {
    const wrapper = kept(
      mount(KitErrorState, {
        props: { title: 'Couldn’t load', retrying: true, retryLabel: 'Load again' },
        slots: { icon: () => h('svg', { 'data-icon': 'plug' }) },
      }),
    )
    const button = wrapper.get('button')
    expect(button.text()).toBe('Load again')
    expect(button.attributes('aria-busy')).toBe('true')
    expect(wrapper.find('[data-icon="plug"]').exists()).toBe(true)
    expect(wrapper.find('.kit-error-state__message').exists()).toBe(false)
  })
})

describe('KitLoadingState', () => {
  it('says what is loading, as a status, with nothing axe finds', async () => {
    const wrapper = kept(
      mount(KitLoadingState, { props: { label: 'Loading the shelves…' }, attachTo: document.body }),
    )
    const status = wrapper.get('[role="status"]')
    expect(status.text()).toBe('Loading the shelves…')
    expect(await axeFindings(wrapper)).toEqual([])
    const plain = kept(mount(KitLoadingState))
    expect(plain.get('[role="status"]').text()).toBe('Loading…')
  })
})
