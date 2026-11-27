import { afterEach, describe, expect, it } from 'vitest'
import { defineComponent, h } from 'vue'
import { mount } from '@vue/test-utils'
import KitButton from '../components/KitButton.vue'
import KitPageHeader from '../components/KitPageHeader.vue'
import KitPagePanel from '../components/KitPagePanel.vue'
import { axeFindings, kept, unmountKept } from './helpers'

afterEach(unmountKept)

const crumbs = [
  { label: 'Shelves', to: '/shelves' },
  { label: 'Living room', to: { name: 'shelf', params: { id: 3 } } },
]

/** A stand-in for Vue Router's RouterLink, registered on the app as the router registers it. */
const RouterLink = defineComponent({
  props: { to: { type: [String, Object], required: true } },
  setup:
    (props, { slots }) =>
    () =>
      h('a', { href: '#router', 'data-to': JSON.stringify(props.to) }, slots.default?.()),
})

describe('KitPageHeader', () => {
  it('opens the page with its one h1, its line and its actions, with nothing axe finds', async () => {
    const wrapper = kept(
      mount(KitPageHeader, {
        props: { title: 'Living room', description: 'Twelve books, two shelves.' },
        slots: { actions: () => h(KitButton, { variant: 'primary' }, () => 'Add a book') },
        attachTo: document.body,
      }),
    )
    expect(wrapper.get('h1').text()).toBe('Living room')
    expect(wrapper.get('.kit-page-header__description').text()).toBe('Twelve books, two shelves.')
    expect(wrapper.get('.kit-page-header__actions button').text()).toBe('Add a book')
    expect(wrapper.find('nav').exists()).toBe(false)
    expect(await axeFindings(wrapper)).toEqual([])
  })

  it('names only the pages above it, through RouterLink where the app has Vue Router', async () => {
    const wrapper = kept(
      mount(KitPageHeader, {
        props: { title: 'Dune', crumbs },
        global: { components: { RouterLink } },
        attachTo: document.body,
      }),
    )
    const trail = wrapper.get('nav')
    expect(trail.attributes('aria-label')).toBe('Breadcrumb')
    const links = trail.findAll('a')
    expect(links.map((link) => link.text())).toEqual(['Shelves', 'Living room'])
    expect(links[1]?.attributes('data-to')).toBe('{"name":"shelf","params":{"id":3}}')
    expect(trail.text()).not.toContain('Dune')
    for (const separator of trail.findAll('.kit-page-header__separator')) {
      expect(separator.attributes('aria-hidden')).toBe('true')
    }
    expect(await axeFindings(wrapper)).toEqual([])
  })

  it('makes plain links of its crumbs in an app without Vue Router', () => {
    const wrapper = kept(mount(KitPageHeader, { props: { title: 'Dune', crumbs } }))
    const links = wrapper.findAll('nav a')
    expect(links[0]?.attributes('href')).toBe('/shelves')
    // A route object means nothing without a router, so that crumb is no link to anywhere.
    expect(links[1]?.attributes('href')).toBeUndefined()
  })

  it('takes a link back, a line over its title, an icon and a help tip beside it', async () => {
    const wrapper = kept(
      mount(KitPageHeader, {
        props: {
          title: 'The Dispossessed',
          eyebrow: 'Book',
          back: { label: 'Back to the loans', to: '/loans' },
        },
        slots: {
          icon: () => h('svg', { 'data-icon': 'book' }),
          help: () => h(KitButton, { 'aria-label': 'About this book' }, () => '?'),
        },
        attachTo: document.body,
      }),
    )
    const back = wrapper.get('.kit-page-header__back')
    expect(back.element.tagName).toBe('A')
    expect(back.attributes('href')).toBe('/loans')
    expect(back.text()).toBe('Back to the loans')
    expect(back.find('[data-glyph="previous"]').exists()).toBe(true)
    // The line is read before the title, and nothing beside the title joins its name.
    const order = [...wrapper.element.querySelectorAll('.kit-page-header__eyebrow, h1')]
    expect(order.map((element) => element.tagName)).toEqual(['P', 'H1'])
    expect(wrapper.get('.kit-page-header__eyebrow').text()).toBe('Book')
    expect(wrapper.get('h1').text()).toBe('The Dispossessed')
    expect(wrapper.get('.kit-page-header__icon').attributes('aria-hidden')).toBe('true')
    expect(wrapper.get('.kit-page-header__help button').attributes('aria-label')).toBe(
      'About this book',
    )
    expect(await axeFindings(wrapper)).toEqual([])
  })

  it('takes a status line with markup in place of its description', () => {
    const wrapper = kept(
      mount(KitPageHeader, {
        props: { title: 'Dune' },
        slots: { description: () => h('span', { class: 'status' }, 'Lent to Sam') },
      }),
    )
    expect(wrapper.get('.kit-page-header__description .status').text()).toBe('Lent to Sam')
  })
})

describe('KitPagePanel', () => {
  it('is a section named by its h2, with its line, actions, body and footer', async () => {
    const wrapper = kept(
      mount(KitPagePanel, {
        props: { title: 'Books', description: 'On this shelf, by title.' },
        slots: {
          default: () => h('p', 'The list goes here.'),
          actions: () => h(KitButton, null, () => 'Sort'),
          footer: () => h(KitButton, { variant: 'primary' }, () => 'Save the order'),
        },
        attachTo: document.body,
      }),
    )
    const section = wrapper.get('section')
    const heading = wrapper.get('h2')
    expect(section.attributes('aria-labelledby')).toBe(heading.attributes('id'))
    expect(heading.text()).toBe('Books')
    expect(wrapper.get('.kit-page-panel__description').text()).toBe('On this shelf, by title.')
    expect(wrapper.get('.kit-page-panel__actions').text()).toBe('Sort')
    expect(wrapper.get('.kit-page-panel__body').text()).toBe('The list goes here.')
    expect(wrapper.get('.kit-page-panel__footer').text()).toBe('Save the order')
    expect(await axeFindings(wrapper)).toEqual([])
  })

  it('takes an h3 inside another panel, and needs no heading at all', () => {
    const nested = kept(mount(KitPagePanel, { props: { title: 'Notes', level: 3 } }))
    expect(nested.find('h3').text()).toBe('Notes')
    const bare = kept(mount(KitPagePanel, { slots: { default: () => 'Just the content' } }))
    expect(bare.find('header').exists()).toBe(false)
    expect(bare.attributes('aria-labelledby')).toBeUndefined()
    expect(bare.find('.kit-page-panel__footer').exists()).toBe(false)
    const untitled = kept(
      mount(KitPagePanel, { slots: { actions: () => h(KitButton, null, () => 'Export') } }),
    )
    expect(untitled.find('header').exists()).toBe(true)
    expect(untitled.find('h2').exists()).toBe(false)
    expect(untitled.attributes('aria-labelledby')).toBeUndefined()
  })

  it('takes a line over its heading, an icon and a help tip beside it', async () => {
    const wrapper = kept(
      mount(KitPagePanel, {
        props: { title: 'Loans', eyebrow: 'This week' },
        slots: {
          default: 'Three books out.',
          icon: () => h('svg', { 'data-icon': 'clock' }),
          help: () => h(KitButton, { 'aria-label': 'About the loans' }, () => '?'),
        },
        attachTo: document.body,
      }),
    )
    expect(wrapper.get('.kit-page-panel__eyebrow').text()).toBe('This week')
    expect(wrapper.get('h2').text()).toBe('Loans')
    expect(wrapper.attributes('aria-labelledby')).toBe(wrapper.get('h2').attributes('id'))
    expect(wrapper.get('.kit-page-panel__icon').attributes('aria-hidden')).toBe('true')
    expect(wrapper.find('.kit-page-panel__help button').exists()).toBe(true)
    expect(await axeFindings(wrapper)).toEqual([])
  })
})
