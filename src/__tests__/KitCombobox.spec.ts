import { afterEach, describe, expect, it } from 'vitest'
import { h, reactive } from 'vue'
import { flushPromises } from '@vue/test-utils'
import KitCombobox from '../components/KitCombobox.vue'
import { axeFindings, field, openOptions, option, unmountKept } from './helpers'

afterEach(unmountKept)

const genres = [
  { value: 'fantasy', label: 'Fantasy', group: 'Fiction' },
  { value: 'mystery', label: 'Mystery', group: 'Fiction' },
  { value: 'history', label: 'History', group: 'Non-fiction' },
  { value: 7, label: 'Seventh shelf' },
]

describe('KitCombobox', () => {
  it('narrows the list as the person types, under each group’s heading', async () => {
    const { wrapper, state } = field(KitCombobox, null, { label: 'Genre' }, { options: genres })
    const input = wrapper.get('input')
    expect(wrapper.get('label').attributes('for')).toBe(input.attributes('id'))
    expect(await axeFindings(wrapper)).toEqual([])

    await input.trigger('click')
    await flushPromises()
    expect(openOptions()).toEqual(['Fantasy', 'Mystery', 'History', 'Seventh shelf'])
    expect(
      [...document.querySelectorAll('.kit-option-list__group-label')].map((g) =>
        g.textContent.trim(),
      ),
    ).toEqual(['Fiction', 'Non-fiction'])
    expect(await axeFindings(document.body)).toEqual([])

    await input.setValue('his')
    await flushPromises()
    expect(openOptions()).toEqual(['History'])

    await input.setValue('zzz')
    await flushPromises()
    expect(document.querySelector('.kit-option-list__empty')?.textContent.trim()).toBe(
      'Nothing matches',
    )

    await input.setValue('sev')
    await flushPromises()
    option('Seventh shelf').click()
    await flushPromises()
    expect(state.value).toBe(7)
  })

  it('names as its active option only one that is still in the open list', async () => {
    const { wrapper } = field(KitCombobox, null, { label: 'Genre' }, { options: genres })
    const input = wrapper.get('input')
    await input.trigger('click')
    await flushPromises()
    await input.trigger('keydown', { key: 'ArrowDown' })
    await flushPromises()
    const active = input.attributes('aria-activedescendant')
    expect(active && document.getElementById(active)).toBeTruthy()

    await input.setValue('zzz')
    await flushPromises()
    const after = input.attributes('aria-activedescendant')
    expect(after === undefined || document.getElementById(after) !== null).toBe(true)
  })

  it('shows the chosen label in the box, and clears it when it may', async () => {
    const { wrapper, state } = field(
      KitCombobox,
      'mystery',
      { label: 'Genre', error: 'Not on this shelf.' },
      { options: genres, clearable: true },
    )
    await flushPromises()
    const input = wrapper.get('input')
    expect(input.element.value).toBe('Mystery')
    expect(input.attributes('aria-invalid')).toBe('true')
    expect(wrapper.get('.kit-combobox__box').classes()).toContain('is-invalid')

    await wrapper.get('button[aria-label="Clear"]').trigger('click')
    expect(state.value).toBeNull()
    await flushPromises()
    expect(wrapper.find('button[aria-label="Clear"]').exists()).toBe(false)
  })

  it('offers no Clear button while it can’t be changed', async () => {
    const { wrapper } = field(
      KitCombobox,
      'mystery',
      { label: 'Genre' },
      { options: genres, clearable: true, disabled: true },
    )
    await flushPromises()
    expect(wrapper.find('button[aria-label="Clear"]').exists()).toBe(false)
  })

  it('shows several choices as chips, each with its own Remove button', async () => {
    const { wrapper, state } = field(
      KitCombobox,
      ['fantasy', 'history', 'gone'],
      { label: 'Genres' },
      { options: genres, multiple: true },
      { chip: ({ option: chosen }: { option: { label: string } }) => h('b', chosen.label) },
    )
    await flushPromises()
    expect(wrapper.findAll('.kit-chip').map((chip) => chip.text())).toEqual(['Fantasy', 'History'])
    expect(await axeFindings(wrapper)).toEqual([])

    await wrapper.get('button[aria-label="Remove Fantasy"]').trigger('click')
    expect(state.value).toEqual(['history', 'gone'])

    await wrapper.get('input').trigger('click')
    await flushPromises()
    option('Mystery').click()
    await flushPromises()
    expect(state.value).toEqual(['history', 'gone', 'mystery'])
  })

  it('shows a chip’s label when the app draws no chip of its own', async () => {
    const { wrapper } = field(
      KitCombobox,
      ['mystery'],
      { label: 'Genres' },
      { options: genres, multiple: true },
    )
    await flushPromises()
    expect(wrapper.get('.kit-chip__label').text()).toBe('Mystery')
  })

  it('draws each option through the app’s own slot', async () => {
    const { wrapper } = field(
      KitCombobox,
      null,
      { label: 'Genre' },
      { options: genres },
      { option: ({ option: shown }: { option: { label: string } }) => h('i', shown.label) },
    )
    await wrapper.get('input').trigger('click')
    await flushPromises()
    expect(option('Fantasy').querySelector('i')?.textContent).toBe('Fantasy')
  })
  it('hands the search to the app, shows what it gives back, and keeps a choice’s words', async () => {
    // The app's own props, which it changes as its search answers.
    const app = reactive({
      options: genres.slice(0, 1),
      multiple: true,
      search: true,
      loading: true,
    })
    const { wrapper, state } = field(KitCombobox, ['fantasy'], { label: 'Genres' }, app)
    const combobox = wrapper.findComponent(KitCombobox)
    const input = wrapper.get('input')
    await input.trigger('click')
    await flushPromises()
    expect(
      document.querySelector('.kit-option-list__empty[role="status"]')?.textContent.trim(),
    ).toBe('Searching…')
    await input.setValue('his')
    expect(combobox.emitted('search')?.at(-1)).toEqual(['his'])
    // The app hands back its results, which the list shows as they are, unfiltered.
    app.options = genres.slice(1, 3)
    app.loading = false
    await flushPromises()
    expect(openOptions()).toEqual(['Mystery', 'History'])
    // The chosen genre is no longer among the results, and its chip keeps its words.
    expect(wrapper.findAll('.kit-chip__label').map((chip) => chip.text())).toEqual(['Fantasy'])
    option('History').click()
    await flushPromises()
    expect(state.value).toEqual(['fantasy', 'history'])
  })

  it('counts its choices against its most, and holds the rest back once it is reached', async () => {
    const { wrapper, state } = field(
      KitCombobox,
      ['fantasy'],
      { label: 'Genres', hint: 'Two at most.' },
      { options: genres, multiple: true, max: 2 },
    )
    const input = wrapper.get('input')
    const count = wrapper.get('.kit-combobox__count')
    expect(count.text()).toBe('1 of 2 chosen')
    expect(input.attributes('aria-describedby')).toContain(String(count.attributes('id')))
    await input.trigger('click')
    await flushPromises()
    option('Mystery').click()
    await flushPromises()
    expect(state.value).toEqual(['fantasy', 'mystery'])
    expect(wrapper.get('.kit-combobox__count').text()).toBe(
      '2 of 2 chosen; remove one to choose another',
    )
    expect(option('History').getAttribute('data-disabled')).toBe('')
    expect(option('Fantasy').hasAttribute('data-disabled')).toBe(false)
  })
})
