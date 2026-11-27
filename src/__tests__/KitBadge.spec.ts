import { afterEach, describe, expect, it } from 'vitest'
import { h } from 'vue'
import { mount } from '@vue/test-utils'
import KitBadge from '../components/KitBadge.vue'
import KitDescriptionItem from '../components/KitDescriptionItem.vue'
import KitDescriptionList from '../components/KitDescriptionList.vue'
import { axeFindings, kept, unmountKept } from './helpers'

afterEach(unmountKept)

describe('KitBadge', () => {
  it('says its state in words, its icon hidden, in its tone', async () => {
    const wrapper = kept(
      mount(KitBadge, {
        props: { tone: 'error' },
        slots: { default: 'Overdue', icon: () => h('svg', { 'data-icon': 'clock' }) },
        attachTo: document.body,
      }),
    )
    expect(wrapper.text()).toBe('Overdue')
    expect(wrapper.classes()).toContain('kit-badge--error')
    expect(wrapper.get('.kit-badge__icon').attributes('aria-hidden')).toBe('true')
    expect(wrapper.find('[data-icon="clock"]').exists()).toBe(true)
    expect(await axeFindings(wrapper)).toEqual([])
  })

  it('has no tone unless given one, and no icon box without an icon', () => {
    const wrapper = kept(
      mount(KitBadge, { slots: { default: 'Owner', icon: () => null }, attachTo: document.body }),
    )
    expect(wrapper.classes()).toContain('kit-badge--neutral')
    expect(wrapper.find('.kit-badge__icon').exists()).toBe(false)
  })
})

describe('KitDescriptionList', () => {
  it('marks each term and what it names up as a description list', async () => {
    const wrapper = kept(
      mount(
        {
          render: () =>
            h(KitDescriptionList, null, {
              default: () => [
                h(KitDescriptionItem, { term: 'Author' }, { default: () => 'Jane Austen' }),
                // A row left out, as a `v-if` leaves it.
                null,
                h(
                  KitDescriptionItem,
                  {},
                  {
                    term: () => h('abbr', { title: 'International Standard Book Number' }, 'ISBN'),
                    default: () => h('a', { href: '/isbn/1' }, '978-0-14-143951-8'),
                  },
                ),
              ],
            }),
        },
        { attachTo: document.body },
      ),
    )
    const list = wrapper.get('dl')
    expect(list.findAll('dt').map((term) => term.text())).toEqual(['Author', 'ISBN'])
    expect(list.findAll('dd').map((detail) => detail.text())).toEqual([
      'Jane Austen',
      '978-0-14-143951-8',
    ])
    expect(list.find('dt abbr').exists()).toBe(true)
    expect(await axeFindings(wrapper)).toEqual([])
  })
})
