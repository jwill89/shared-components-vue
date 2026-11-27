import { afterEach, describe, expect, it } from 'vitest'
import { nextTick } from 'vue'
import { flushPromises, mount, type DOMWrapper, type VueWrapper } from '@vue/test-utils'
import KitColorField from '../components/KitColorField.vue'
import KitDatePicker from '../components/KitDatePicker.vue'
import KitSelect from '../components/KitSelect.vue'
import KitSwitch from '../components/KitSwitch.vue'
import KitTextField from '../components/KitTextField.vue'
import {
  actionRows,
  colorHex,
  colorNumber,
  discordEmbedLength,
  emojiText,
  linkButtons,
  readEmoji,
  tidyEmbed,
  type KitDiscordActionRow,
  type KitDiscordEmbed,
  type KitDiscordLinkButton,
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

  it('takes a time for the footer as a date with its time, and clears it', async () => {
    const { wrapper, state } = await embedEditor({})
    const picker = byLabel(wrapper, 'Time in the footer').findComponent(KitDatePicker)
    expect(picker.props('time')).toBe(true)
    expect(wrapper.find('button[aria-label="Clear the time of Embed 1"]').exists()).toBe(false)
    picker.vm.$emit('update:modelValue', '2026-11-27T19:30:00Z')
    await nextTick()
    expect(state.embed.timestamp).toBe('2026-11-27T19:30:00Z')
    expect(picker.props('modelValue')).toBe('2026-11-27T19:30:00Z')
    await wrapper.get('button[aria-label="Clear the time of Embed 1"]').trigger('click')
    expect(state.embed.timestamp).toBeUndefined()
    expect(picker.props('modelValue')).toBe('')
  })

  it('edits no buttons unless the page binds the message’s rows of them', async () => {
    const { wrapper } = await embedEditor({ title: 'News' })
    expect(wrapper.text()).not.toContain('Add a button')
  })
})

/** An editor with the message's buttons bound too, both models kept as a page keeps them. */
async function withButtons(
  rows: KitDiscordActionRow[],
  props: Record<string, unknown> = {},
): Promise<{ wrapper: VueWrapper; state: { rows: KitDiscordActionRow[] } }> {
  const state = { rows }
  const wrapper = kept(
    mount(KitDiscordEmbedEditor, {
      props: {
        modelValue: {},
        components: rows,
        'onUpdate:components': (next: KitDiscordActionRow[] | undefined) => {
          state.rows = next ?? []
          void wrapper.setProps({ components: next })
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

function buttonAdder(wrapper: VueWrapper): DOMWrapper<HTMLButtonElement> {
  const found = wrapper
    .findAll('button')
    .find((candidate) => candidate.text().includes('Add a button'))
  if (!found) {
    throw new Error('No Add a button.')
  }
  return found
}

describe('KitDiscordEmbedEditor’s buttons', () => {
  it('adds a link button and writes its words, link and emoji in Discord’s shape', async () => {
    const { wrapper, state } = await withButtons([])
    await buttonAdder(wrapper).trigger('click')
    await nextTick()
    expect(state.rows).toEqual([{ type: 1, components: [{ type: 2, style: 5, url: '' }] }])
    await byLabel(wrapper, 'Button 1’s words').get('input').setValue('Read more')
    await byLabel(wrapper, 'Button 1’s link').get('input').setValue('https://example.com/news')
    await byLabel(wrapper, 'Button 1’s emoji').get('input').setValue('📖')
    expect(state.rows).toEqual([
      {
        type: 1,
        components: [
          {
            type: 2,
            style: 5,
            url: 'https://example.com/news',
            label: 'Read more',
            emoji: { name: '📖' },
          },
        ],
      },
    ])
    await byLabel(wrapper, 'Button 1’s emoji').get('input').setValue('<a:party:123>')
    expect(linkButtons(state.rows)[0]?.emoji).toEqual({ name: 'party', id: '123', animated: true })
    await byLabel(wrapper, 'Button 1’s words').get('input').setValue('')
    await byLabel(wrapper, 'Button 1’s emoji').get('input').setValue(' ')
    expect(linkButtons(state.rows)[0]).toEqual({
      type: 2,
      style: 5,
      url: 'https://example.com/news',
    })
    expect(byLabel(wrapper, 'Button 1’s words').get('input').attributes('maxlength')).toBe('80')
    expect(await axeFindings(wrapper)).toEqual([])
  })

  it('holds no more than its most, shows each error by its place, and removes a button', async () => {
    const button = (label: string): KitDiscordLinkButton => ({
      type: 2,
      style: 5,
      label,
      url: `https://example.com/${label}`,
    })
    const { wrapper, state } = await withButtons(
      [{ type: 1, components: [button('one'), button('two')] }],
      { maxButtons: 2, errors: { 'components[0].components[1].url': 'Discord can’t open that.' } },
    )
    expect(buttonAdder(wrapper).element.disabled).toBe(true)
    expect(wrapper.text()).toContain('A message holds at most 2 buttons here.')
    expect(byLabel(wrapper, 'Button 2’s link').text()).toContain('Discord can’t open that.')
    const remove = wrapper
      .findAll('button')
      .find((candidate) => candidate.text() === 'Remove button 1')
    await remove?.trigger('click')
    expect(state.rows).toEqual([{ type: 1, components: [button('two')] }])
    const last = wrapper
      .findAll('button')
      .find((candidate) => candidate.text() === 'Remove button 1')
    await last?.trigger('click')
    expect(state.rows).toEqual([])
  })

  it('lays more than five buttons out five to a row, as Discord does', async () => {
    const { wrapper, state } = await withButtons([], { maxButtons: 25 })
    for (let made = 0; made < 6; made++) {
      await buttonAdder(wrapper).trigger('click')
    }
    expect(state.rows.map((row) => row.components.length)).toEqual([5, 1])
    await byLabel(wrapper, 'Button 6’s words').get('input').setValue('Sixth')
    expect(state.rows[1]?.components[0]?.label).toBe('Sixth')
  })
})

describe('a message’s buttons’ helpers', () => {
  it('read and write an emoji as it is typed, and rows of buttons both ways', () => {
    expect(readEmoji('')).toBeUndefined()
    expect(readEmoji('<:shelf:42>')).toEqual({ name: 'shelf', id: '42' })
    expect(emojiText({ name: 'shelf', id: '42' })).toBe('<:shelf:42>')
    expect(emojiText({ name: '📖' })).toBe('📖')
    expect(emojiText(undefined)).toBe('')
    expect(emojiText({})).toBe('')
    expect(emojiText({ id: '42', animated: true })).toBe('<a::42>')
    expect(actionRows([])).toEqual([])
    expect(linkButtons(undefined)).toEqual([])
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
