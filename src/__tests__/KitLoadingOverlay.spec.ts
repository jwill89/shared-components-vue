import { afterEach, describe, expect, it } from 'vitest'
import { defineComponent, h, nextTick, ref } from 'vue'
import { mount } from '@vue/test-utils'
import KitButton from '../components/KitButton.vue'
import KitLoadingOverlay from '../components/KitLoadingOverlay.vue'
import { axeFindings, kept, unmountKept } from './helpers'

afterEach(unmountKept)

/** A region holding a Save button, under an overlay `active` switches, with a button beside it. */
function page() {
  const active = ref(false)
  const wrapper = kept(
    mount(
      defineComponent({
        setup: () => () => [
          h(KitLoadingOverlay, { active: active.value, label: 'Saving the shelf…' }, () =>
            h(KitButton, null, () => 'Save'),
          ),
          h(KitButton, null, () => 'Elsewhere'),
        ],
      }),
      { attachTo: document.body },
    ),
  )
  const button = (name: string): HTMLButtonElement => {
    const found = [...document.querySelectorAll('button')].find(
      (candidate) => candidate.textContent.trim() === name,
    )
    if (!found) {
      throw new Error(`No "${name}" button.`)
    }
    return found
  }
  return { wrapper, active, button }
}

describe('KitLoadingOverlay', () => {
  it('covers its content, out of reach and marked busy, and says what is under way', async () => {
    const { wrapper, active } = page()
    const content = wrapper.get('.kit-loading-overlay__content')
    expect(content.attributes('inert')).toBeUndefined()
    expect(wrapper.find('.kit-loading-overlay__cover').exists()).toBe(false)

    active.value = true
    await nextTick()
    expect(content.attributes('inert')).toBeDefined()
    expect(content.attributes('aria-busy')).toBe('true')
    expect(wrapper.get('[role="status"]').text()).toBe('Saving the shelf…')
    expect(await axeFindings(wrapper)).toEqual([])

    active.value = false
    await nextTick()
    expect(content.attributes('inert')).toBeUndefined()
    expect(content.attributes('aria-busy')).toBeUndefined()
    expect(wrapper.find('.kit-loading-overlay__cover').exists()).toBe(false)
  })

  it('holds focus that was in the content on its panel, and gives it back after', async () => {
    const { wrapper, active, button } = page()
    const save = button('Save')
    save.focus()

    active.value = true
    await nextTick()
    await nextTick()
    expect(document.activeElement).toBe(wrapper.get('.kit-loading-overlay__panel').element)

    active.value = false
    await nextTick()
    await nextTick()
    expect(document.activeElement).toBe(save)
  })

  it('leaves focus that was elsewhere where it is', async () => {
    const { active, button } = page()
    const elsewhere = button('Elsewhere')
    elsewhere.focus()

    active.value = true
    await nextTick()
    await nextTick()
    expect(document.activeElement).toBe(elsewhere)

    active.value = false
    await nextTick()
    await nextTick()
    expect(document.activeElement).toBe(elsewhere)
  })
})
