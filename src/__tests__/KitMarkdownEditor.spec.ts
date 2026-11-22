import { afterEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { Extension, type Editor } from '@tiptap/core'
import KitMarkdownEditor from '../editor/KitMarkdownEditor.vue'
import type { KitDiscordSuggestion } from '../editor/suggest'
import { soon } from '../../shared/test/web/wait.js'
import { axeFindings, field, kept, unmountKept } from './helpers'

afterEach(unmountKept)

/** An editor in a `group` field, as a page puts one. */
async function editor(
  value: string,
  props: Record<string, unknown> = {},
  fieldProps: Record<string, unknown> = {},
): Promise<{ wrapper: VueWrapper; state: { value: unknown }; tiptap: Editor }> {
  const made = field(
    KitMarkdownEditor,
    value,
    { label: 'Message', group: true, ...fieldProps },
    props,
  )
  await nextTick()
  const component = made.wrapper.findComponent(KitMarkdownEditor)
  const tiptap = (component.vm as unknown as { editor: () => Editor | undefined }).editor()
  if (!tiptap) {
    throw new Error('The editor did not start.')
  }
  return { ...made, tiptap }
}

/** An editor on its own, for a test that changes its props as a page would. */
async function alone(
  props: { modelValue: string } & Record<string, unknown>,
): Promise<{ wrapper: VueWrapper; tiptap: Editor }> {
  const wrapper = kept(
    mount(KitMarkdownEditor, {
      props: { label: 'Message', 'onUpdate:modelValue': () => undefined, ...props },
      attachTo: document.body,
    }),
  )
  await nextTick()
  const tiptap = (wrapper.vm as unknown as { editor: () => Editor | undefined }).editor()
  if (!tiptap) {
    throw new Error('The editor did not start.')
  }
  return { wrapper, tiptap }
}

function toolNames(root: Element): string[] {
  return [...root.querySelectorAll('[role="toolbar"] button')].map(
    (button) => button.getAttribute('aria-label') ?? '',
  )
}

function tool(root: Element, name: string): HTMLButtonElement {
  const found = [...root.querySelectorAll<HTMLButtonElement>('[role="toolbar"] button')].find(
    (button) => button.getAttribute('aria-label') === name,
  )
  if (!found) {
    throw new Error(`No "${name}" tool.`)
  }
  return found
}

async function press(target: HTMLElement): Promise<void> {
  target.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerType: 'mouse' }))
  target.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }))
  target.click()
  await flushPromises()
  await nextTick()
}

function key(tiptap: Editor, name: string): void {
  tiptap.view.dom.dispatchEvent(
    new KeyboardEvent('keydown', { key: name, bubbles: true, cancelable: true }),
  )
}

/** Types `words` a character at a time, as the view takes text input, so its rules run. */
function type(tiptap: Editor, words: string): void {
  for (const ch of words) {
    const { from, to } = tiptap.state.selection
    const insert = () => tiptap.state.tr.insertText(ch, from, to)
    const handled = tiptap.view.someProp('handleTextInput', (f) =>
      f(tiptap.view, from, to, ch, insert),
    )
    if (!handled) {
      tiptap.view.dispatch(insert())
    }
  }
}

function text(root: Element): HTMLElement {
  const found = root.querySelector<HTMLElement>('[role="textbox"]')
  if (!found) {
    throw new Error('No text box.')
  }
  return found
}

describe('KitMarkdownEditor in the Discord dialect', () => {
  it('offers Discord’s tools, underline among them, named by its field, with nothing axe finds', async () => {
    const { wrapper } = await editor('**hi**', { dialect: 'discord' })
    expect(toolNames(wrapper.element)).toEqual([
      'Bold',
      'Italic',
      'Underline',
      'Strikethrough',
      'Code',
      'Spoiler',
      'Heading 1',
      'Heading 2',
      'Heading 3',
      'Subtext',
      'Quote',
      'Bulleted list',
      'Numbered list',
      'Code block',
      'Link',
      'Time',
    ])
    const box = text(wrapper.element)
    expect(box.getAttribute('aria-multiline')).toBe('true')
    expect(
      document.getElementById(box.getAttribute('aria-labelledby') ?? '')?.textContent,
    ).toContain('Message')
    expect(await axeFindings(wrapper)).toEqual([])
  })

  it('writes bold as stars and underline as underscores from its buttons', async () => {
    const { wrapper, state, tiptap } = await editor('words', { dialect: 'discord' })
    tiptap.commands.selectAll()
    await press(tool(wrapper.element, 'Bold'))
    expect(state.value).toBe('**words**')
    expect(tool(wrapper.element, 'Bold').getAttribute('aria-pressed')).toBe('true')
    await press(tool(wrapper.element, 'Bold'))
    await press(tool(wrapper.element, 'Underline'))
    expect(state.value).toBe('__words__')
    expect(tool(wrapper.element, 'Underline').getAttribute('aria-pressed')).toBe('true')
    expect(tool(wrapper.element, 'Bold').getAttribute('aria-pressed')).toBe('false')
  })

  it('reads `__` as underline and makes it so as it is typed', async () => {
    const { wrapper, state, tiptap } = await editor('__under__', { dialect: 'discord' })
    tiptap.commands.setTextSelection(3)
    await nextTick()
    expect(tool(wrapper.element, 'Underline').getAttribute('aria-pressed')).toBe('true')
    tiptap.commands.setContent('')
    // An input rule runs as text is typed, which a spec sends as the view's own text input.
    type(tiptap, ' __typed__')
    await nextTick()
    expect(state.value).toBe('__typed__')
  })

  it('suggests members and roles as `@` is typed, and puts in the one chosen', async () => {
    const members: KitDiscordSuggestion[] = [
      { kind: 'member', id: '1', name: 'Sam' },
      { kind: 'member', id: '2', name: 'Sasha' },
    ]
    const suggest = vi.fn((kind: string, query: string): KitDiscordSuggestion[] =>
      kind === 'member'
        ? members.filter((m) => m.name.toLowerCase().startsWith(query.toLowerCase()))
        : [{ kind: 'role', id: '9', name: 'Staff', color: 0x3366cc }],
    )
    const { wrapper, state, tiptap } = await editor('', { dialect: 'discord', suggest })
    tiptap.commands.insertContent('Hi @Sa')
    const list = await soon(() => {
      const found = wrapper.element.querySelector('[role="listbox"]')
      expect(found).not.toBeNull()
      return found as HTMLElement
    })
    expect(suggest).toHaveBeenCalledWith('member', 'Sa')
    expect([...list.querySelectorAll('[role="option"]')].map((o) => o.textContent.trim())).toEqual([
      '@Sam',
      '@Sasha',
      '@Staff',
    ])
    const box = text(wrapper.element)
    expect(box.getAttribute('aria-controls')).toBe(list.id)
    expect(box.getAttribute('aria-activedescendant')).toBe(
      list.querySelector('[role="option"]')?.id,
    )
    expect(await axeFindings(wrapper)).toEqual([])

    key(tiptap, 'ArrowDown')
    await nextTick()
    expect(box.getAttribute('aria-activedescendant')).toBe(
      list.querySelectorAll('[role="option"]')[1]?.id,
    )
    key(tiptap, 'Enter')
    await soon(() => {
      expect(wrapper.element.querySelector('[role="listbox"]')).toBeNull()
    })
    expect(state.value).toBe('Hi <@2>')
    expect(wrapper.element.querySelector('.kit-markdown-editor__token')?.textContent).toBe('@Sasha')
  })

  it('shows each token by the names the app gives, and again as they change', async () => {
    const { wrapper } = await alone({
      modelValue: '<@1> <#2> <@&3> <:wave:4> </ping:5>',
      dialect: 'discord',
    })
    const shown = (): string[] =>
      [...wrapper.element.querySelectorAll('.kit-markdown-editor__token')].map((t) => t.textContent)
    expect(shown()).toEqual([
      '@unknown member',
      '#unknown channel',
      '@unknown role',
      ':wave:',
      '/ping',
    ])
    await wrapper.setProps({
      names: {
        members: { 1: 'Sam' },
        channels: new Map([['2', 'general']]),
        roles: { 3: { name: 'Staff', color: 0xff0000 } },
        emoji: { 4: 'https://cdn.example/4.png' },
      },
    })
    expect(shown()).toEqual(['@Sam', '#general', '@Staff', '', '/ping'])
    expect(
      wrapper.element.querySelector('.kit-markdown-editor__token circle')?.getAttribute('fill'),
    ).toBe('#ff0000')
    expect(
      wrapper.element.querySelector('.kit-markdown-editor__token img')?.getAttribute('alt'),
    ).toBe(':wave:')
  })

  it('links the words chosen to an address, and refuses one Discord can’t link', async () => {
    const { wrapper, state, tiptap } = await editor('see this', { dialect: 'discord' })
    tiptap.commands.setTextSelection({ from: 5, to: 9 })
    await press(tool(wrapper.element, 'Link'))
    const address = await soon(() => {
      const found = document.querySelector<HTMLInputElement>('.kit-popover input')
      expect(found).not.toBeNull()
      return found!
    })
    address.value = 'mailto:a@x.y'
    address.dispatchEvent(new Event('input'))
    address.form?.requestSubmit()
    await nextTick()
    expect(document.querySelector('.kit-popover')?.textContent).toContain('Use a web address')
    address.value = 'x.y/page'
    address.dispatchEvent(new Event('input'))
    address.form?.requestSubmit()
    await flushPromises()
    expect(state.value).toBe('see [this](https://x.y/page)')
  })

  it('puts in a time, shown as the person chooses', async () => {
    const { wrapper, state } = await editor('', { dialect: 'discord' })
    await press(tool(wrapper.element, 'Time'))
    const form = await soon(() => {
      const found = document.querySelector<HTMLFormElement>('.kit-popover form')
      expect(found).not.toBeNull()
      return found!
    })
    expect(form.textContent).toContain('Shown as')
    form.requestSubmit()
    await flushPromises()
    expect(state.value).toMatch(/^<t:\d+:f>$/)
  })
})

describe('KitMarkdownEditor in the CommonMark dialect', () => {
  it('offers CommonMark’s tools, a divider and no underline', async () => {
    const { wrapper } = await editor('')
    expect(toolNames(wrapper.element)).toEqual([
      'Bold',
      'Italic',
      'Strikethrough',
      'Code',
      'Heading 2',
      'Heading 3',
      'Quote',
      'Bulleted list',
      'Numbered list',
      'Code block',
      'Divider',
      'Link',
    ])
  })

  it('keeps the model as it is until the text changes, and takes a value set from outside', async () => {
    const { wrapper, tiptap } = await alone({ modelValue: '__bold__' })
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
    tiptap.commands.insertContentAt(tiptap.state.doc.content.size, {
      type: 'paragraph',
      content: [{ type: 'text', text: 'more' }],
    })
    await nextTick()
    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual(['**bold**\n\nmore'])
    await wrapper.setProps({ modelValue: '# New' })
    expect(tiptap.getHTML()).toContain('New</h1>')
    expect(wrapper.emitted('update:modelValue')).toHaveLength(1)
    await wrapper.setProps({ modelValue: '**bold**\n\nmore' })
    expect(wrapper.emitted('update:modelValue')).toHaveLength(1)
  })

  it('counts its Markdown against the limit, and marks it as over past it', async () => {
    const { wrapper, tiptap } = await editor('**12**', { limit: 7 }, { error: '' })
    const count = wrapper.get('.kit-markdown-editor__count')
    expect(count.text()).toBe('6 / 7')
    expect(text(wrapper.element).getAttribute('aria-describedby')).toContain(count.attributes('id'))
    tiptap.commands.insertContentAt(tiptap.state.doc.content.size - 1, {
      type: 'text',
      text: 'xyz',
    })
    await nextTick()
    await nextTick()
    expect(count.text()).toBe('9 / 7 (2 over)')
    expect(text(wrapper.element).getAttribute('aria-invalid')).toBe('true')
    expect(wrapper.get('[aria-live="polite"]').text()).toBe('2 characters over the limit')
  })

  it('brings an app’s own tool, and its piece', async () => {
    const run = vi.fn()
    const piece = Extension.create({ name: 'shout' })
    const { wrapper } = await editor('', {
      extensions: [{ extension: piece, tool: { name: 'shout', label: 'Shout', glyph: '!', run } }],
    })
    expect(toolNames(wrapper.element).at(-1)).toBe('Shout')
    await press(tool(wrapper.element, 'Shout'))
    expect(run).toHaveBeenCalledOnce()
  })
})

describe('KitMarkdownEditor’s profiles', () => {
  it('takes marks only on one line, for a title', async () => {
    const { wrapper, state, tiptap } = await editor('A **title**', {
      dialect: 'discord',
      profile: 'inline',
    })
    expect(toolNames(wrapper.element)).toEqual([
      'Bold',
      'Italic',
      'Underline',
      'Strikethrough',
      'Code',
      'Spoiler',
    ])
    expect(text(wrapper.element).getAttribute('aria-multiline')).toBe('false')
    tiptap.commands.focus('end')
    key(tiptap, 'Enter')
    await nextTick()
    expect(tiptap.state.doc.childCount).toBe(1)
    expect(state.value).toBe('A **title**')
  })

  it('takes plain text, with no toolbar, for a footer', async () => {
    const { wrapper } = await editor(
      '**as typed**',
      { dialect: 'discord', profile: 'plain', label: 'Footer' },
      {},
    )
    expect(wrapper.find('[role="toolbar"]').exists()).toBe(false)
    expect(text(wrapper.element).textContent).toBe('**as typed**')
  })

  it('is named by its label where no caption names it, and can be turned off', async () => {
    const { wrapper, tiptap } = await alone({ modelValue: '', label: 'Notes', disabled: true })
    const box = text(wrapper.element)
    expect(box.getAttribute('aria-label')).toBe('Notes')
    expect(box.getAttribute('aria-disabled')).toBe('true')
    expect(tiptap.isEditable).toBe(false)
    expect(tool(wrapper.element, 'Bold').disabled).toBe(true)
    await wrapper.setProps({ disabled: false })
    expect(tiptap.isEditable).toBe(true)
  })
})

/** Opens the list `typed` brings up, and returns its options' words. */
async function suggested(wrapper: VueWrapper, tiptap: Editor, typed: string): Promise<string[]> {
  // The list of the last choice closes first.
  await soon(() => {
    expect(wrapper.find('[role="listbox"]').exists()).toBe(false)
  })
  tiptap.commands.insertContent(typed)
  return soon(() => {
    const options = [...wrapper.element.querySelectorAll('[role="option"]')]
    expect(options.length).toBeGreaterThan(0)
    return options.map((o) => o.textContent.trim())
  })
}

const SERVER: KitDiscordSuggestion[] = [
  { kind: 'channel', id: '3', name: 'general' },
  { kind: 'emoji', id: '4', name: 'wave', image: 'https://cdn.example/4.png' },
  { kind: 'emoji', id: '', name: 'smile', text: '😄' },
  { kind: 'command', id: '5', name: 'ping' },
  { kind: 'role', id: '6', name: 'Mods' },
]

describe('KitMarkdownEditor’s Discord suggestions', () => {
  const suggest = (kind: string, query: string): KitDiscordSuggestion[] =>
    SERVER.filter((item) => item.kind === kind && item.name.startsWith(query))

  it('suggests a channel, a command and an emoji, and puts each in as Discord writes it', async () => {
    const { wrapper, state, tiptap } = await editor('', { dialect: 'discord', suggest })
    expect(await suggested(wrapper, tiptap, '#ge')).toEqual(['#general'])
    key(tiptap, 'Tab')
    expect(await suggested(wrapper, tiptap, '/pi')).toEqual(['/ping'])
    key(tiptap, 'Enter')
    expect(await suggested(wrapper, tiptap, ':wa')).toEqual([':wave:'])
    expect(wrapper.find('[role="option"] img').attributes('src')).toBe('https://cdn.example/4.png')
    await wrapper.get('[role="option"]').trigger('click')
    expect(await suggested(wrapper, tiptap, ':sm')).toEqual(['😄 :smile:'])
    await wrapper.get('[role="option"]').trigger('keydown', { key: 'Enter' })
    await nextTick()
    expect(state.value).toBe('<#3> </ping:5> <:wave:4> 😄')
    const tokens = [...wrapper.element.querySelectorAll('.kit-markdown-editor__token')]
    expect(tokens.map((t) => t.textContent)).toEqual(['#general', '/ping', ''])
  })

  it('waits for two letters of an emoji’s name, and asks nothing with no `suggest`', async () => {
    const { wrapper, tiptap } = await editor('', { dialect: 'discord', suggest })
    tiptap.commands.insertContent(':w')
    await flushPromises()
    expect(wrapper.find('[role="listbox"]').exists()).toBe(false)
    const bare = await editor('', { dialect: 'discord' })
    bare.tiptap.commands.insertContent('@Sa')
    await flushPromises()
    expect(bare.wrapper.find('[role="listbox"]').exists()).toBe(false)
    expect(text(bare.wrapper.element).getAttribute('aria-autocomplete')).toBeNull()
  })

  it('moves up from the first suggestion round to the last, and closes on Escape', async () => {
    const { wrapper, tiptap } = await editor('', { dialect: 'discord', suggest })
    expect(await suggested(wrapper, tiptap, '@M')).toEqual(['@Mods'])
    key(tiptap, 'ArrowUp')
    await nextTick()
    expect(wrapper.get('[role="option"]').attributes('aria-selected')).toBe('true')
    expect(wrapper.get('.kit-markdown-editor__announcement').text()).toBe(
      '1 suggestion; up and down to choose',
    )
    key(tiptap, 'Escape')
    await soon(() => {
      expect(wrapper.find('[role="listbox"]').exists()).toBe(false)
    })
  })
})

describe('KitMarkdownEditor’s tools', () => {
  /** A tool, pressed on the whole text, and what it writes. */
  async function written(dialect: string, start: string, name: string): Promise<unknown> {
    const { wrapper, state, tiptap } = await editor(start, { dialect })
    tiptap.commands.selectAll()
    await press(tool(wrapper.element, name))
    const value = state.value
    unmountKept()
    return value
  }

  it('writes each Discord tool’s Markdown', async () => {
    const expected: Record<string, string> = {
      Italic: '*words*',
      Strikethrough: '~~words~~',
      Code: '`words`',
      Spoiler: '||words||',
      'Heading 1': '# words',
      'Heading 2': '## words',
      'Heading 3': '### words',
      Subtext: '-# words',
      Quote: '> words',
      'Bulleted list': '- words',
      'Numbered list': '1. words',
      'Code block': '```\nwords\n```',
    }
    for (const [name, markdown] of Object.entries(expected)) {
      expect({ name, written: await written('discord', 'words', name) }).toEqual({
        name,
        written: markdown,
      })
    }
  })

  it('writes a divider in CommonMark', async () => {
    const { wrapper, state, tiptap } = await editor('words')
    tiptap.commands.focus('end')
    await press(tool(wrapper.element, 'Divider'))
    expect(state.value).toBe('words\n\n---')
  })

  it('takes the link off words that have one', async () => {
    const { wrapper, state, tiptap } = await editor('[here](https://x.y)')
    tiptap.commands.setTextSelection(2)
    await press(tool(wrapper.element, 'Link'))
    const remove = await soon(() => {
      const found = [...document.querySelectorAll<HTMLButtonElement>('.kit-popover button')].find(
        (b) => b.textContent.trim() === 'Remove the link',
      )
      expect(found).toBeDefined()
      return found!
    })
    expect(document.querySelector<HTMLInputElement>('.kit-popover input')?.value).toBe(
      'https://x.y',
    )
    remove.click()
    await flushPromises()
    expect(state.value).toBe('here')
  })

  it('links an address typed with nothing chosen', async () => {
    const { wrapper, state, tiptap } = await editor('here')
    tiptap.commands.setTextSelection(tiptap.state.doc.content.size - 1)
    await press(tool(wrapper.element, 'Link'))
    const address = await soon(() => {
      const found = document.querySelector<HTMLInputElement>('.kit-popover input')
      expect(found).not.toBeNull()
      return found!
    })
    address.value = 'mailto:a@x.y'
    address.dispatchEvent(new Event('input'))
    address.form?.requestSubmit()
    await flushPromises()
    expect(state.value).toBe('here<mailto:a@x.y>')
  })

  it('takes an empty address as taking the link off', async () => {
    const { wrapper, state, tiptap } = await editor('[here](https://x.y)', { dialect: 'discord' })
    tiptap.commands.setTextSelection(2)
    await press(tool(wrapper.element, 'Link'))
    const address = await soon(() => {
      const found = document.querySelector<HTMLInputElement>('.kit-popover input')
      expect(found).not.toBeNull()
      return found!
    })
    address.value = ' '
    address.dispatchEvent(new Event('input'))
    address.form?.requestSubmit()
    await flushPromises()
    expect(state.value).toBe('here')
  })

  it('refuses a time with no date', async () => {
    const { wrapper } = await editor('', { dialect: 'discord' })
    await press(tool(wrapper.element, 'Time'))
    const form = await soon(() => {
      const found = [...document.querySelectorAll<HTMLFormElement>('.kit-popover form')].find(
        (candidate) => candidate.textContent.includes('Shown as'),
      )
      expect(found).toBeDefined()
      return found!
    })
    wrapper.findComponent({ name: 'KitDatePicker' }).vm.$emit('update:modelValue', '')
    await nextTick()
    form.requestSubmit()
    await nextTick()
    expect(form.textContent).toContain('Choose a date.')
  })
})

describe('KitMarkdownEditor’s keys and focus', () => {
  function shiftEnter(tiptap: Editor): void {
    tiptap.view.dom.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'Enter',
        shiftKey: true,
        bubbles: true,
        cancelable: true,
      }),
    )
  }

  it('starts a new line on Shift+Enter in Discord, and a line of code inside a code block', async () => {
    const { state, tiptap } = await editor('a', { dialect: 'discord' })
    tiptap.commands.focus('end')
    shiftEnter(tiptap)
    type(tiptap, 'b')
    await nextTick()
    expect(state.value).toBe('a\nb')
    tiptap.commands.setContent('')
    tiptap.commands.toggleCodeBlock()
    type(tiptap, 'x')
    shiftEnter(tiptap)
    type(tiptap, 'y')
    await nextTick()
    expect(state.value).toBe('```\nx\ny\n```')
  })

  it('takes focus when asked, and says when it loses it', async () => {
    const { wrapper, tiptap } = await alone({ modelValue: 'a' })
    ;(wrapper.vm as unknown as { focus: () => void }).focus()
    tiptap.view.dom.dispatchEvent(new FocusEvent('focus'))
    await nextTick()
    expect(wrapper.classes()).toContain('is-focused')
    tiptap.view.dom.dispatchEvent(new FocusEvent('blur'))
    await nextTick()
    expect(wrapper.classes()).not.toContain('is-focused')
    expect(wrapper.emitted('blur')).toHaveLength(1)
  })
})

describe('KitMarkdownEditor’s smaller paths', () => {
  const suggest = (kind: string, query: string): KitDiscordSuggestion[] =>
    [...SERVER, { kind: 'emoji' as const, id: '', name: 'nothing' }].filter(
      (item) => item.kind === kind && item.name.startsWith(query),
    )

  it('puts in a role chosen, by its name, and nothing for an emoji with neither id nor text', async () => {
    const { wrapper, state, tiptap } = await editor('', { dialect: 'discord', suggest })
    expect(await suggested(wrapper, tiptap, '@M')).toEqual(['@Mods'])
    await wrapper.get('[role="option"]').trigger('mousedown')
    key(tiptap, 'Enter')
    expect(await suggested(wrapper, tiptap, ':no')).toEqual([':nothing:'])
    key(tiptap, 'Enter')
    await nextTick()
    expect(state.value).toBe('<@&6> :no')
    expect(wrapper.get('.kit-markdown-editor__token').text()).toBe('@Mods')
  })

  it('leaves a key alone while what is typed matches nothing', async () => {
    const { wrapper, state, tiptap } = await editor('', { dialect: 'discord', suggest })
    tiptap.commands.insertContent('@zz')
    await flushPromises()
    key(tiptap, 'ArrowDown')
    await nextTick()
    expect(wrapper.find('[role="listbox"]').exists()).toBe(false)
    expect(state.value).toBe('@zz')
  })

  it('links an address as it is typed whole, from its scheme', async () => {
    const { state, tiptap } = await editor('', { dialect: 'discord' })
    type(tiptap, 'see https://x.y now x.y ')
    await nextTick()
    expect(state.value).toBe('see https://x.y now x.y')
  })

  it('draws a token as words for a copy, and reads one pasted back', async () => {
    const { tiptap } = await editor('<@1> and <bad>', { dialect: 'discord' })
    tiptap.commands.setContent({
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            { type: 'discordToken', attrs: { raw: '<@1>' } },
            { type: 'text', text: ' ' },
            { type: 'discordToken', attrs: { raw: '<nonsense>' } },
          ],
        },
      ],
    })
    expect(tiptap.getHTML()).toContain('>@unknown member</span>')
    expect(tiptap.getHTML()).toContain('>&lt;nonsense&gt;</span>')
    expect(tiptap.getText()).toBe('<@1> <nonsense>')
    tiptap.commands.selectAll()
    tiptap.commands.toggleBold()
    expect(tiptap.getJSON().content[0]?.content?.[0]?.marks).toEqual([{ type: 'bold' }])
    tiptap.commands.setContent('')
    tiptap.view.pasteHTML('<p>to <span data-discord-token="&lt;#2&gt;">#x</span></p>')
    expect(tiptap.getJSON().content[0]?.content?.[1]).toEqual({
      type: 'discordToken',
      attrs: { raw: '<#2>' },
    })
  })

  it('takes an app’s piece with no tool, and is named for its words where nothing names it', async () => {
    const { wrapper } = await alone({
      modelValue: '',
      label: undefined,
      extensions: [{ extension: Extension.create({ name: 'quiet' }) }],
    })
    expect(toolNames(wrapper.element).at(-1)).toBe('Link')
    expect(text(wrapper.element).getAttribute('aria-label')).toBe('Formatted text')
  })

  it('refuses an address CommonMark can’t link', async () => {
    const { wrapper } = await editor('see this')
    await press(tool(wrapper.element, 'Link'))
    const address = await soon(() => {
      const found = document.querySelector<HTMLInputElement>('.kit-popover input')
      expect(found).not.toBeNull()
      return found!
    })
    address.value = 'ftp://x.y'
    address.dispatchEvent(new Event('input'))
    address.form?.requestSubmit()
    await nextTick()
    expect(document.querySelector('.kit-popover')?.textContent).toContain('or an email address')
  })

  it('puts in a time at midnight with no time of day, in the style chosen', async () => {
    const { wrapper, state } = await editor('', { dialect: 'discord' })
    await press(tool(wrapper.element, 'Time'))
    const form = await soon(() => {
      const found = document.querySelector<HTMLFormElement>('.kit-popover form')
      expect(found?.textContent).toContain('Shown as')
      return found!
    })
    const clock = form.querySelector<HTMLInputElement>('input[type="time"]')
    if (!clock) {
      throw new Error('No time of day.')
    }
    clock.value = ''
    clock.dispatchEvent(new Event('input'))
    wrapper.findComponent({ name: 'KitSelect' }).vm.$emit('update:modelValue', 'R')
    await nextTick()
    form.requestSubmit()
    await flushPromises()
    expect(state.value).toMatch(/^<t:\d+:R>$/)
    const unix = Number(/\d+/.exec(String(state.value))?.[0])
    expect(new Date(unix * 1000).getHours()).toBe(0)
  })
})
