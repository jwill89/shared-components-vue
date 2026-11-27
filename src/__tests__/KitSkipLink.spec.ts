import { afterEach, describe, expect, it } from 'vitest'
import { h } from 'vue'
import { mount } from '@vue/test-utils'
import KitSkipLink from '../components/KitSkipLink.vue'
import { axeFindings, kept, unmountKept } from './helpers'

afterEach(unmountKept)

/** A shell: the skip link, a header with a link in it, and the page's main content. */
function shell(target?: string): ReturnType<typeof mount> {
  return kept(
    mount(
      {
        render: () => [
          h(KitSkipLink, target ? { target } : {}),
          h('header', [h('a', { href: '/' }, 'Home')]),
          h('main', { id: target ?? 'main-content' }, [h('h1', 'Books')]),
        ],
      },
      { attachTo: document.body },
    ),
  )
}

describe('KitSkipLink', () => {
  it('moves focus to the main content, putting nothing in the address', async () => {
    const wrapper = shell()
    const link = wrapper.get('.kit-skip-link')
    expect(link.text()).toBe('Skip to main content')
    expect(link.attributes('href')).toBe('#main-content')
    expect(await axeFindings(wrapper)).toEqual([])

    const before = window.location.href
    const click = new MouseEvent('click', { bubbles: true, cancelable: true })
    link.element.dispatchEvent(click)
    expect(click.defaultPrevented).toBe(true)
    expect(window.location.href).toBe(before)
    const main = document.getElementById('main-content')
    expect(document.activeElement).toBe(main)
    expect(main?.getAttribute('tabindex')).toBe('-1')
  })

  it('goes to the target given, and leaves a target that is focusable as it is', async () => {
    const wrapper = shell('content')
    const main = document.getElementById('content')
    main?.setAttribute('tabindex', '0')
    await wrapper.get('.kit-skip-link').trigger('click')
    expect(document.activeElement).toBe(main)
    expect(main?.getAttribute('tabindex')).toBe('0')
  })

  it('follows its own address where there is no such target', () => {
    const wrapper = kept(mount(KitSkipLink, { props: { target: 'nowhere' } }))
    const click = new MouseEvent('click', { bubbles: true, cancelable: true })
    wrapper.element.dispatchEvent(click)
    expect(click.defaultPrevented).toBe(false)
  })
})
