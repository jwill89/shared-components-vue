import { afterEach, describe, expect, it } from 'vitest'
import { defineComponent, h, nextTick, ref } from 'vue'
import { mount } from '@vue/test-utils'
import KitPagination from '../components/KitPagination.vue'
import { axeFindings, kept, unmountKept } from './helpers'

afterEach(unmountKept)

function page(pageCount: number, start = 1) {
  const shown = ref(start)
  const wrapper = kept(
    mount(
      defineComponent({
        setup: () => () =>
          h(KitPagination, {
            pageCount,
            label: 'Pages of books',
            page: shown.value,
            'onUpdate:page': (next: number) => {
              shown.value = next
            },
          }),
      }),
      { attachTo: document.body },
    ),
  )
  return { wrapper, shown }
}

function names(root: Element): string[] {
  return [...root.querySelectorAll('li > button, li > span')].map(
    (el) => el.getAttribute('aria-label') ?? el.textContent.trim(),
  )
}

describe('KitPagination', () => {
  it('is navigation named by its label, the page shown marked current, with nothing axe finds', async () => {
    const { wrapper } = page(9, 5)
    await nextTick()
    const nav = wrapper.get('nav')
    expect(nav.attributes('aria-label')).toBe('Pages of books')
    expect(names(nav.element)).toEqual([
      'Previous',
      'Page 1',
      '…',
      'Page 4',
      'Page 5',
      'Page 6',
      '…',
      'Page 9',
      'Next',
    ])
    expect(wrapper.get('[aria-current="page"]').text()).toBe('5')
    expect(await axeFindings(wrapper)).toEqual([])
  })

  it('moves by its buttons, and can’t go before the first page or past the last', async () => {
    const { wrapper, shown } = page(3)
    await nextTick()
    const previous = wrapper.get('button[aria-label="Previous"]')
    expect(previous.attributes('disabled')).toBeDefined()
    await wrapper.get('button[aria-label="Next"]').trigger('click')
    expect(shown.value).toBe(2)
    await wrapper.get('button[aria-label="Page 3"]').trigger('click')
    expect(shown.value).toBe(3)
    expect(wrapper.get('button[aria-label="Next"]').attributes('disabled')).toBeDefined()
  })

  it('goes straight to a page typed in its box, held to the pages there are', async () => {
    const { wrapper, shown } = page(40)
    await nextTick()
    const box = wrapper.get('input[type="number"]')
    expect(wrapper.get(`label[for="${box.attributes('id') ?? ''}"]`).text()).toBe('Go to page')
    await box.setValue('17')
    await wrapper.get('form').trigger('submit')
    expect(shown.value).toBe(17)
    await box.setValue('400')
    await wrapper.get('form').trigger('submit')
    expect(shown.value).toBe(40)
    await box.setValue('')
    await wrapper.get('form').trigger('submit')
    expect(shown.value).toBe(40)
  })

  it('has no box to go to a page with few pages, and shows nothing with one', async () => {
    const few = page(4)
    await nextTick()
    expect(few.wrapper.find('form').exists()).toBe(false)
    unmountKept()
    const one = page(1)
    await nextTick()
    expect(one.wrapper.find('nav').exists()).toBe(false)
  })
})
