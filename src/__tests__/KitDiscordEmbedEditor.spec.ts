import { afterEach, describe, expect, it } from 'vitest'
import { nextTick } from 'vue'
import { flushPromises, mount, type DOMWrapper, type VueWrapper } from '@vue/test-utils'
import KitColorField from '../components/KitColorField.vue'
import KitDatePicker from '../components/KitDatePicker.vue'
import KitSelect from '../components/KitSelect.vue'
import KitSwitch from '../components/KitSwitch.vue'
import KitTextField from '../components/KitTextField.vue'
import {
  colorHex,
  colorNumber,
  discordEmbedLength,
  tidyEmbed,
  type KitDiscordEmbed,
} from '../discord/embed'
import KitDiscordEmbedEditor from '../editor/KitDiscordEmbedEditor.vue'
import KitMarkdownEditor from '../editor/KitMarkdownEditor.vue'
import { axeFindings, kept, unmountKept } from './helpers'

afterEach(unmountKept)

const PICTURES = [
  { url: 'attachment://shelf.png', label: 'The oak shelf' },
  { url: 'https://example.com/atlas.png', label: 'The atlas' },
]

/** An editor, its model kept as a page's v-model keeps it. */
async function embedEditor(
  embed: KitDiscordEmbed,
  props: Record<string, unknown> = {},
): Promise<{ wrapper: VueWrapper; state: { embed: KitDiscordEmbed } }> {
  const state = { embed }
  const wrapper = kept(
    mount(KitDiscordEmbedEditor, {
      props: {
        modelValue: embed,
        'onUpdate:modelValue': (next: KitDiscordEmbed) => {
          state.embed = next
          void wrapper.setProps({ modelValue: next })
        },
        label: 'Embed 1',
        ...props,
      },
      attachTo: document.body,
    }),
  )
  await flushPromises()
  return { wrapper, state }
}

/** The form field a control sits in, by its label's words. */
function byLabel(wrapper: VueWrapper, words: string): DOMWrapper<Element> {
  const found = wrapper
    .findAll('.kit-form-field')
    .find(
      (f) =>
        f
          .find('.kit-form-field__label')
          .text()
          .replace('(required)', '')
          .replace('*', '')
          .trim() === words,
    )
  if (!found) {
    throw new Error(`No field "${words}".`)
  }
  return found
}

describe('KitDiscordEmbedEditor', () => {
  it('edits each part into Discord’s shape, leaving out what is empty, with nothing axe finds', async () => {
    const { wrapper, state } = await embedEditor({ title: 'Book club' })
    expect(await axeFindings(wrapper)).toEqual([])

    byLabel(wrapper, 'Title')
      .findComponent(KitMarkdownEditor)
      .vm.$emit('update:modelValue', '**Book** club')
    byLabel(wrapper, 'Title’s link')
      .findComponent(KitTextField)
      .vm.$emit('update:modelValue', 'https://x.y')
    byLabel(wrapper, 'Words')
      .findComponent(KitMarkdownEditor)
      .vm.$emit('update:modelValue', 'Meet <#3>')
    byLabel(wrapper, 'Author')
      .findComponent(KitTextField)
      .vm.$emit('update:modelValue', 'The shelf bot')
    byLabel(wrapper, 'Author’s link')
      .findComponent(KitTextField)
      .vm.$emit('update:modelValue', 'https://a.b')
    byLabel(wrapper, 'Color').findComponent(KitColorField).vm.$emit('update:modelValue', '#5865f2')
    byLabel(wrapper, 'Footer')
      .findComponent(KitMarkdownEditor)
      .vm.$emit('update:modelValue', 'Posted weekly')
    await nextTick()
    expect(state.embed).toEqual({
      title: '**Book** club',
      url: 'https://x.y',
      description: 'Meet <#3>',
      author: { name: 'The shelf bot', url: 'https://a.b' },
      color: 0x5865f2,
      footer: { text: 'Posted weekly' },
    })

    byLabel(wrapper, 'Title’s link').findComponent(KitTextField).vm.$emit('update:modelValue', '')
    byLabel(wrapper, 'Author').findComponent(KitTextField).vm.$emit('update:modelValue', '')
    byLabel(wrapper, 'Author’s link').findComponent(KitTextField).vm.$emit('update:modelValue', '')
    byLabel(wrapper, 'Color').findComponent(KitColorField).vm.$emit('update:modelValue', '')
    await nextTick()
    expect(state.embed).toEqual({
      title: '**Book** club',
      description: 'Meet <#3>',
      footer: { text: 'Posted weekly' },
    })
  })

  it('offers the app’s pictures, by URL, only when it gives some', async () => {
    const bare = await embedEditor({})
    expect(bare.wrapper.find('.kit-form-field').exists()).toBe(true)
    expect(() => byLabel(bare.wrapper, 'Picture, large')).toThrow()

    const { wrapper, state } = await embedEditor({}, { pictures: PICTURES })
    byLabel(wrapper, 'Picture, large')
      .findComponent(KitSelect)
      .vm.$emit('update:modelValue', 'attachment://shelf.png')
    byLabel(wrapper, 'Picture, small')
      .findComponent(KitSelect)
      .vm.$emit('update:modelValue', 'https://example.com/atlas.png')
    byLabel(wrapper, 'Author’s picture')
      .findComponent(KitSelect)
      .vm.$emit('update:modelValue', 'attachment://shelf.png')
    byLabel(wrapper, 'Footer’s picture')
      .findComponent(KitSelect)
      .vm.$emit('update:modelValue', 'attachment://shelf.png')
    await nextTick()
    expect(state.embed).toEqual({
      image: { url: 'attachment://shelf.png' },
      thumbnail: { url: 'https://example.com/atlas.png' },
      author: { name: '', icon_url: 'attachment://shelf.png' },
      footer: { text: '', icon_url: 'attachment://shelf.png' },
    })
    byLabel(wrapper, 'Picture, large')
      .findComponent(KitSelect)
      .vm.$emit('update:modelValue', 'none')
    byLabel(wrapper, 'Author’s picture')
      .findComponent(KitSelect)
      .vm.$emit('update:modelValue', 'none')
    await nextTick()
    expect(state.embed.image).toBeUndefined()
    expect(state.embed.author).toBeUndefined()
  })

  it('adds, changes and removes fields, up to Discord’s 25', async () => {
    const { wrapper, state } = await embedEditor({})
    const add = () => wrapper.findAll('button').find((b) => b.text().startsWith('Add a field'))
    expect(add()?.text()).toBe('Add a field to Embed 1')
    await add()?.trigger('click')
    await add()?.trigger('click')
    expect(state.embed.fields).toEqual([
      { name: '', value: '', inline: false },
      { name: '', value: '', inline: false },
    ])
    byLabel(wrapper, 'Field 1’s name')
      .findComponent(KitMarkdownEditor)
      .vm.$emit('update:modelValue', 'When')
    byLabel(wrapper, 'Field 1’s words')
      .findComponent(KitMarkdownEditor)
      .vm.$emit('update:modelValue', 'Friday')
    byLabel(wrapper, 'Field 2 beside its neighbours')
      .findComponent(KitSwitch)
      .vm.$emit('update:modelValue', true)
    await nextTick()
    expect(state.embed.fields).toEqual([
      { name: 'When', value: 'Friday', inline: false },
      { name: '', value: '', inline: true },
    ])
    expect(await axeFindings(wrapper)).toEqual([])

    const remove = wrapper.findAll('button').find((b) => b.text() === 'Remove field 1 of Embed 1')
    await remove?.trigger('click')
    expect(state.embed.fields).toEqual([{ name: '', value: '', inline: true }])
    await wrapper
      .findAll('button')
      .find((b) => b.text() === 'Remove field 1 of Embed 1')
      ?.trigger('click')
    expect(state.embed.fields).toBeUndefined()

    await wrapper.setProps({
      modelValue: { fields: Array.from({ length: 25 }, () => ({ name: 'a', value: 'b' })) },
    })
    expect(add()?.attributes('disabled')).toBeDefined()
    expect(wrapper.text()).toContain('An embed holds at most 25 fields.')
  })

  it('shows each part’s error, and counts the embed against Discord’s 6,000', async () => {
    const { wrapper } = await embedEditor(
      { title: 'a'.repeat(5995), description: 'abcdefghij' },
      { errors: { title: 'Too long.', 'fields[0].value': 'Say something.', fields: 'Too many.' } },
    )
    expect(byLabel(wrapper, 'Title').text()).toContain('Too long.')
    expect(wrapper.text()).toContain('Too many.')
    const count = wrapper.get('.kit-discord-embed-editor__count')
    expect(count.text()).toBe('6,005 / 6,000 characters in Embed 1 (5 over)')
    expect(count.classes()).toContain('is-over')
    expect(wrapper.get('[aria-live="polite"].kit-discord-embed-editor__hidden').text()).toBe(
      '5 characters over Discord’s limit for Embed 1',
    )
    await wrapper.setProps({ modelValue: { title: 'a'.repeat(5950) } })
    expect(wrapper.get('[aria-live="polite"].kit-discord-embed-editor__hidden').text()).toBe(
      '50 characters left in Embed 1',
    )
  })

  it('takes a time for the footer from a date and a time of day, and clears it', async () => {
    const { wrapper, state } = await embedEditor({ timestamp: 'not a time' })
    expect(() => byLabel(wrapper, 'Time of day')).toThrow()
    byLabel(wrapper, 'Time in the footer')
      .findComponent(KitDatePicker)
      .vm.$emit('update:modelValue', '2026-11-27')
    await nextTick()
    const local = new Date('2026-11-27T00:00')
    expect(state.embed.timestamp).toBe(local.toISOString())
    byLabel(wrapper, 'Time of day')
      .findComponent(KitTextField)
      .vm.$emit('update:modelValue', '19:30')
    await nextTick()
    expect(state.embed.timestamp).toBe(new Date('2026-11-27T19:30').toISOString())
    expect(byLabel(wrapper, 'Time of day').findComponent(KitTextField).props('modelValue')).toBe(
      '19:30',
    )
    await wrapper.get('button[aria-label="Clear the time of Embed 1"]').trigger('click')
    expect(state.embed.timestamp).toBeUndefined()
  })
})

describe('an embed’s helpers', () => {
  it('count its words, turn its color both ways, and leave out its empty parts', () => {
    expect(
      discordEmbedLength({
        title: '👋 hi',
        description: 'abc',
        footer: { text: 'f' },
        author: { name: 'au' },
        fields: [{ name: 'n', value: 'vv' }],
      }),
    ).toBe(4 + 3 + 1 + 2 + 3)
    expect(colorHex(0x5865f2)).toBe('#5865f2')
    expect(colorHex(0)).toBe('')
    expect(colorHex(undefined)).toBe('')
    expect(colorNumber('#1ABC9C')).toBe(0x1abc9c)
    expect(colorNumber('teal')).toBeUndefined()
    expect(
      tidyEmbed({
        title: '',
        author: { name: '', url: '' },
        footer: { text: '' },
        image: { url: '' },
        thumbnail: { url: 'https://x.y/t.png' },
        fields: [],
        color: 0,
      }),
    ).toEqual({ thumbnail: { url: 'https://x.y/t.png' }, color: 0 })
  })
})
