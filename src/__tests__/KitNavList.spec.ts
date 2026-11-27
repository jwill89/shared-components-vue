import { afterEach, describe, expect, it } from 'vitest'
import { defineComponent, h, nextTick } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import KitButton from '../components/KitButton.vue'
import KitMenu from '../components/KitMenu.vue'
import KitMenuItem from '../components/KitMenuItem.vue'
import KitNavList from '../components/KitNavList.vue'
import { soon } from '../../shared/test/web/wait.js'
import { axeFindings, kept, unmountKept } from './helpers'

afterEach(unmountKept)

const sections = [
  { label: 'Profile', to: '/settings/profile', group: 'You' },
  { label: 'Passkeys', to: '/settings/passkeys', group: 'You', current: true },
  { label: 'Members', to: '/settings/members', group: 'Server' },
  { label: 'Roles', to: '/settings/roles', group: 'Server' },
]

/** A stand-in for Vue Router's RouterLink, registered as an app with the router has it. */
const RouterLink = defineComponent({
  props: { to: { type: [String, Object], required: true } },
  setup:
    (props, { slots }) =>
    () =>
      h(
        'a',
        {
          href: `#router${typeof props.to === 'string' ? props.to : JSON.stringify(props.to)}`,
          'data-router': '',
        },
        slots.default?.(),
      ),
})

describe('KitNavList', () => {
  it('is a navigation of links, the page on screen marked current, with nothing axe finds', async () => {
    const wrapper = kept(
      mount(KitNavList, {
        props: { label: 'Settings', items: sections },
        slots: {
          icon: ({ item }: { item: { label: string } }) => h('svg', { 'data-icon': item.label }),
        },
        attachTo: document.body,
      }),
    )
    const nav = wrapper.get('nav')
    expect(nav.attributes('aria-label')).toBe('Settings')
    const links = nav.findAll('a')
    expect(links.map((link) => link.text())).toEqual(['Profile', 'Passkeys', 'Members', 'Roles'])
    expect(links.map((link) => link.attributes('href'))).toEqual([
      '/settings/profile',
      '/settings/passkeys',
      '/settings/members',
      '/settings/roles',
    ])
    expect(links.map((link) => link.attributes('aria-current'))).toEqual([
      undefined,
      'page',
      undefined,
      undefined,
    ])
    // Each heading names the list under it.
    const lists = nav.findAll('ul')
    expect(
      lists.map((list) => nav.get(`[id="${String(list.attributes('aria-labelledby'))}"]`).text()),
    ).toEqual(['You', 'Server'])
    expect(wrapper.find('[data-icon="Roles"]').exists()).toBe(true)
    expect(await axeFindings(wrapper)).toEqual([])
  })

  it('folds a group away by its heading, the one holding the page on screen open', async () => {
    const wrapper = kept(
      mount(KitNavList, {
        props: { label: 'Settings', items: sections, foldable: true },
        attachTo: document.body,
      }),
    )
    const [you, server] = wrapper.findAll('.kit-nav-list__fold')
    expect(you?.attributes('aria-expanded')).toBe('true')
    expect(server?.attributes('aria-expanded')).toBe('false')
    const serverList = wrapper.get(`[id="${String(server?.attributes('aria-controls'))}"]`)
    expect(serverList.isVisible()).toBe(false)
    await server?.trigger('click')
    expect(server?.attributes('aria-expanded')).toBe('true')
    expect(serverList.isVisible()).toBe(true)
    expect(await axeFindings(wrapper)).toEqual([])
  })

  it('opens and closes behind its button on a phone, which names it', async () => {
    const wrapper = kept(mount(KitNavList, { props: { label: 'Settings', items: sections } }))
    const toggle = wrapper.get('.kit-nav-list__toggle')
    expect(toggle.text()).toBe('Settings')
    expect(toggle.attributes('aria-controls')).toBe(
      wrapper.get('.kit-nav-list__body').attributes('id'),
    )
    expect(toggle.attributes('aria-expanded')).toBe('false')
    await toggle.trigger('click')
    expect(toggle.attributes('aria-expanded')).toBe('true')
    expect(wrapper.classes()).toContain('is-open')
  })

  it('lays its links in a row with no button, and links through RouterLink where there is one', () => {
    const wrapper = kept(
      mount(KitNavList, {
        props: { label: 'This book', items: sections.slice(0, 2), horizontal: true },
        global: { components: { RouterLink } },
      }),
    )
    expect(wrapper.find('.kit-nav-list__toggle').exists()).toBe(false)
    expect(wrapper.classes()).toContain('is-horizontal')
    expect(wrapper.findAll('a[data-router]').map((link) => link.attributes('href'))).toEqual([
      '#router/settings/profile',
      '#router/settings/passkeys',
    ])
  })
})

describe('links in menus and buttons', () => {
  it('makes a menu item a link to where it leads, through RouterLink where there is one', async () => {
    const wrapper = kept(
      mount(KitMenu, {
        props: { label: 'Shelf actions' },
        slots: {
          default: () => [
            h(KitMenuItem, { to: '/shelves/3' }, () => 'Open the shelf'),
            h(KitMenuItem, { href: 'https://example.test/help' }, () => 'Help'),
            h(KitMenuItem, null, () => 'Rename'),
          ],
        },
        global: { components: { RouterLink } },
        attachTo: document.body,
      }),
    )
    await nextTick()
    const trigger = wrapper.get<HTMLButtonElement>('button').element
    trigger.focus()
    trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    await flushPromises()
    await soon(() => {
      if (!document.querySelector('[role="menu"]')) {
        throw new Error('No menu is open.')
      }
    })
    const items = [...document.querySelectorAll('[role="menuitem"]')]
    expect(items.map((item) => item.tagName)).toEqual(['A', 'A', 'DIV'])
    expect(items.map((item) => item.getAttribute('href'))).toEqual([
      '#router/shelves/3',
      'https://example.test/help',
      null,
    ])
    expect(await axeFindings(document.body)).toEqual([])
  })

  it('makes a button a link to a page of the app’s own, and draws it small or large', () => {
    const link = kept(mount(KitButton, { props: { to: '/loans' }, slots: { default: 'Loans' } }))
    expect(link.element.tagName).toBe('A')
    expect(link.attributes('href')).toBe('/loans')

    const small = kept(mount(KitButton, { props: { size: 'small' }, slots: { default: 'Edit' } }))
    expect(small.classes()).toContain('kit-button--small')
    const large = kept(mount(KitButton, { props: { size: 'large' }, slots: { default: 'Serve' } }))
    expect(large.classes()).toContain('kit-button--large')
  })
})
