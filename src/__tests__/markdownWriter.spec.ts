import { afterEach, describe, expect, it } from 'vitest'
import { Mark, Node, type AnyExtension, type JSONContent } from '@tiptap/core'
import { createEngine, type Engine } from '../editor/engine'
import type { KitEditorDialect, KitEditorProfile } from '../editor/writer'
import { documentFlat, oracleFlat } from './discordOracle'

const made: Engine[] = []

afterEach(() => {
  made.splice(0).forEach((engine) => engine.destroy())
  document.body.replaceChildren()
})

function engine(
  dialect: KitEditorDialect,
  content = '',
  profile: KitEditorProfile = 'full',
  extensions: AnyExtension[] = [],
): Engine {
  const element = document.createElement('div')
  document.body.append(element)
  const built = createEngine({
    element,
    dialect,
    profile,
    content,
    extensions,
    names: () => ({}),
    placeholder: '',
    attributes: () => ({}),
    onUpdate: () => undefined,
    onTransaction: () => undefined,
    onFocus: () => undefined,
    onBlur: () => undefined,
  })
  made.push(built)
  return built
}

/** Each text, read and written back, comes back as it was written. */
function roundTrip(dialect: KitEditorDialect, texts: readonly string[]): void {
  for (const text of texts) {
    expect({ text, written: engine(dialect, text).write() }).toEqual({ text, written: text })
  }
}

const COMMONMARK = [
  '# Title\n\n## Part',
  'Some **bold**, *italic*, ~~gone~~ and `code`.',
  '**bold *both* bold** and ***both*** and *italic **bold** italic*',
  '- a\n- b\n  - c',
  '3. three\n4. four',
  '- a\n\n  second\n- b',
  '> quote\n> more\n>\n> after',
  '```js\nlet a = 1\n```',
  '````\n```\n````',
  '---',
  '[link](https://x.y "a title") and <https://x.y> and <mailto:a@x.y>',
  '![alt](https://x.y/a.png) stays as it is written',
  '| a | b |\n| --- | --- |\n| 1 | 2 |',
  'a\\\nb',
  'one line\nand the next',
  '\\# not a heading\n\n1\\. not a list\n\n\\- not an item\n\n\\> not a quote',
  '\\*not italic\\* and snake_case and a & b and \\&amp; and 2 < 3',
  '\\[not a link](x) and \\<b> and \\~not\\~',
  '`` a `b` `` and `` `x` ``',
]

const DISCORD = [
  '# H1\n## H2\n### H3',
  '-# small print',
  '**b** *i* __u__ ~~s~~ ||sp|| `c`',
  '***a* b** _**a** b_ __*ui*__ **__bu__**',
  '- a\n  - b\n- c',
  '1. one\n2. two',
  '> q\n> r\nafter',
  '>>> rest\n\nof it',
  'a\n\nb\n\n\nc',
  '```js\ncode\n```',
  '<@1> <@&2> <#3> <:wave:4> <a:spin:5> <t:1700000000:R> </ping:6> @everyone <id:customize>',
  'https://x.y <https://x.y> [m](https://x.y) [t](https://x.y "a title")',
  '\\*not\\* \\_not\\_ snake_case \\||not\\|| \\<@1> \\@everyone \\~~not\\~~',
  '\\# not\n\\-# not\n\\> not\n\\- not\n1\\. not',
  'https\\://x.y is not a link',
]

describe('the CommonMark dialect', () => {
  it('writes back every construct as it was read', () => {
    roundTrip('commonmark', COMMONMARK)
  })

  it('reads every way of writing a mark, and writes each one way', () => {
    expect(engine('commonmark', '__bold__ and _italic_ and +++').write()).toBe(
      '**bold** and *italic* and +++',
    )
    expect(engine('commonmark', '* a\n* b').write()).toBe('- a\n- b')
    expect(engine('commonmark', 'a  \nb').write()).toBe('a\\\nb')
  })

  it('reads what it writes as it was, whatever the marks', () => {
    const docs: JSONContent[] = [
      paragraph(
        text('a', ['italic', 'bold']),
        text(' b', ['italic']),
        text(' c '),
        text('code', ['code', 'bold']),
      ),
      // Marks CommonMark can't open hard after a word, which it writes as their HTML.
      paragraph(
        text('c'),
        text('"*quoted*"', ['bold']),
        { type: 'hardBreak', marks: [{ type: 'bold' }] },
        text('[x] & <y>', ['bold']),
        text('s and a'),
        text('(note)', ['italic']),
        text('s'),
      ),
      paragraph(text('*-#>|~_`[]<&', [])),
    ]
    for (const doc of docs) {
      const first = engine('commonmark')
      first.editor.commands.setContent(doc)
      const written = first.write()
      expect(engine('commonmark', written).editor.getJSON()).toEqual(first.editor.getJSON())
    }
  })

  it('leaves the spaces at a mark’s ends outside it, where CommonMark reads it', () => {
    const spaced = engine('commonmark')
    spaced.editor.commands.setContent(paragraph(text('lead ', ['bold']), text('trail')))
    expect(spaced.write()).toBe('**lead** trail')
  })

  it('leaves out blank lines, which CommonMark has no way to keep', () => {
    const blank = engine('commonmark')
    blank.editor.commands.setContent({
      type: 'doc',
      content: [
        { type: 'paragraph' },
        paragraph(text('a')),
        { type: 'paragraph' },
        paragraph(text('b')),
      ],
    })
    expect(blank.write()).toBe('a\n\nb')
  })
})

function text(
  words: string,
  marks: string[] = [],
  attrs: Record<string, unknown> = {},
): JSONContent {
  return {
    type: 'text',
    text: words,
    ...(marks.length
      ? { marks: marks.map((type) => (type === 'link' ? { type, attrs } : { type })) }
      : {}),
  }
}

function paragraph(...content: JSONContent[]): JSONContent {
  return { type: 'doc', content: [{ type: 'paragraph', content }] }
}

describe('the Discord dialect', () => {
  it('writes back every construct as it was read', () => {
    roundTrip('discord', DISCORD)
  })

  it('writes what Discord reads as the editor shows it', () => {
    for (const text of DISCORD) {
      const read = engine('discord', text)
      expect({ text, read: oracleFlat(read.write()) }).toEqual({
        text,
        read: documentFlat(read.editor.getJSON()),
      })
    }
  })

  it('writes bold as stars and underline as underscores, never one for the other', () => {
    const marked = engine('discord')
    marked.editor.commands.setContent(
      paragraph(text('bold', ['bold']), text(' and '), text('under', ['underline'])),
    )
    expect(marked.write()).toBe('**bold** and __under__')
    expect(engine('discord', '__under__').editor.getJSON().content[0]?.content?.[0]?.marks).toEqual(
      [{ type: 'underline' }],
    )
  })

  it('writes any run of marks so Discord reads them as they show', () => {
    const docs: JSONContent[] = [
      paragraph(text('a', ['italic', 'bold']), text(' b', ['italic'])),
      paragraph(text('a', ['bold', 'italic']), text(' b', ['bold'])),
      paragraph(text('x', ['bold', 'italic', 'underline', 'strike', 'spoiler'])),
      paragraph(text('lead ', ['bold']), text('trail')),
      paragraph(text('code', ['code', 'bold']), text(' after')),
      paragraph(
        text('in ', ['link'], { href: 'https://x.y' }),
        text('bold', ['link', 'bold'], { href: 'https://x.y' }),
      ),
      paragraph(text('* - # > | ~ _ ` [x](https://x.y) <@1> @here a||b ~~c~~')),
      paragraph(text('un'), text('believ', ['italic']), text('able')),
      paragraph(text('a|'), text('b', ['spoiler'])),
    ]
    for (const doc of docs) {
      const marked = engine('discord')
      marked.editor.commands.setContent(doc)
      const written = marked.write()
      expect({ written, read: oracleFlat(written) }).toEqual({
        written,
        read: documentFlat(marked.editor.getJSON()),
      })
    }
  })

  it('writes a quote to the end only where it ends the text', () => {
    const quoted = engine('discord', '>>> a\nb')
    expect(quoted.write()).toBe('>>> a\nb')
    quoted.editor.commands.setContent({
      type: 'doc',
      content: [
        {
          type: 'blockquote',
          attrs: { toEnd: true },
          content: [{ type: 'paragraph', content: [text('a')] }],
        },
        { type: 'paragraph', content: [text('c')] },
      ],
    })
    expect(quoted.write()).toBe('> a\nc')
  })
})

describe('a profile', () => {
  it('takes marks only on one line, for a title', () => {
    const words = '**Big** <@1> news\n# not a heading, [x](https://y) <https://x.y>'
    const title = engine('discord', words, 'inline')
    expect(title.write()).toBe(words.replace('\n', ' '))
    const commonmark = engine('commonmark', '# A **title**\n\nwith more', 'inline')
    expect(commonmark.write()).toBe('A **title** with more')
  })

  it('takes plain text as it is, for a footer', () => {
    const footer = engine('discord', '**not bold**\n<@1>', 'plain')
    expect(footer.write()).toBe('**not bold**\n<@1>')
    expect(footer.editor.isActive('bold')).toBe(false)
  })
})

/** A paste of `text`, as a browser sends one from the clipboard. */
function paste(target: Engine, text: string): void {
  const event = new Event('paste', { bubbles: true, cancelable: true })
  Object.defineProperty(event, 'clipboardData', {
    value: {
      types: ['text/plain'],
      files: [],
      getData: (type: string) => (type === 'text/plain' ? text : ''),
    },
  })
  target.editor.view.dom.dispatchEvent(event)
}

describe('pasted and copied text', () => {
  it('reads pasted text as the dialect’s Markdown', () => {
    const discord = engine('discord')
    paste(discord, '**bold** <@1>\n- item')
    expect(discord.write()).toBe('**bold** <@1>\n- item')
    const commonmark = engine('commonmark')
    paste(commonmark, '## Part\n\n*so*')
    expect(commonmark.write()).toBe('## Part\n\n*so*')
  })

  it('takes text pasted as plain text as it is', () => {
    const pasted = engine('discord')
    pasted.editor.view.pasteText('a <@1>')
    expect(pasted.write()).toBe('a \\<@1>')
    const plain = engine('commonmark', '', 'plain')
    paste(plain, '**stays**\nas typed')
    expect(plain.write()).toBe('**stays**\nas typed')
  })

  it('reads pasted HTML through its own pieces', () => {
    const pasted = engine('discord')
    pasted.editor.view.pasteHTML(
      '<p><strong>bold</strong> and <u>under</u> and <script>x</script></p>',
    )
    expect(pasted.write()).toBe('**bold** and __under__ and')
  })

  it('copies as the dialect’s Markdown', () => {
    const copied = engine('discord', '**bold** __under__ <@1>')
    const serialize = copied.editor.view.someProp('clipboardTextSerializer')
    expect(
      serialize?.(
        copied.editor.state.doc.slice(0, copied.editor.state.doc.content.size),
        copied.editor.view,
      ),
    ).toBe('**bold** __under__ <@1>')
  })
})

describe('an app’s own pieces', () => {
  // A live piece of a page on a line of its own, {{drinks}}, as an app brings one.
  const Widget = Node.create({
    name: 'widget',
    group: 'block',
    atom: true,
    addAttributes: () => ({ name: { default: '' } }),
    parseHTML: () => [{ tag: 'div[data-widget]' }],
    renderHTML: ({ node }) => ['div', { 'data-widget': String(node.attrs.name) }],
    markdownTokenizer: {
      name: 'widget',
      level: 'block',
      start: (src: string) => src.search(/^\{\{\w+\}\}$/m),
      tokenize: (src: string) => {
        const found = /^\{\{(\w+)\}\}(?:\n+|$)/.exec(src)
        return found ? { type: 'widget', raw: found[0], name: found[1] } : undefined
      },
    },
    parseMarkdown: (token, helpers) =>
      helpers.createNode('widget', { name: (token as { name?: string }).name ?? '' }),
    renderMarkdown: (node) => `{{${String(node.attrs?.name ?? '')}}}`,
  })

  // A divider of an app's own, which writes itself with stars.
  const StarRule = Node.create({
    name: 'horizontalRule',
    group: 'block',
    atom: true,
    parseHTML: () => [{ tag: 'hr' }],
    renderHTML: () => ['hr'],
    markdownTokenName: 'hr',
    parseMarkdown: (_token, helpers) => helpers.createNode('horizontalRule'),
    renderMarkdown: () => '***',
  })

  // A word that stands for something, inline, with no Markdown of its own.
  const Badge = Node.create({
    name: 'badge',
    group: 'inline',
    inline: true,
    atom: true,
    parseHTML: () => [{ tag: 'span[data-badge]' }],
    renderHTML: () => ['span', { 'data-badge': '' }, 'badge'],
    renderMarkdown: () => ':badge:',
  })

  const Highlight = Mark.create({
    name: 'highlight',
    parseHTML: () => [{ tag: 'mark' }],
    renderHTML: () => ['mark', 0],
  })

  it('reads and writes an app’s own block by its own Markdown', () => {
    const page = engine('commonmark', 'Before\n\n{{drinks}}\n\nAfter', 'full', [Widget])
    expect(page.editor.getJSON().content[1]).toEqual({
      type: 'widget',
      attrs: { name: 'drinks' },
    })
    expect(page.write()).toBe('Before\n\n{{drinks}}\n\nAfter')
  })

  it('lets an app’s piece take the place of one of the kit’s, and write itself', () => {
    expect(engine('commonmark', 'a\n\n---\n\nb', 'full', [StarRule]).write()).toBe('a\n\n***\n\nb')
  })

  it('writes an app’s inline piece by its Markdown, and an app’s mark by its words alone', () => {
    const page = engine('commonmark', '', 'full', [Badge, Highlight])
    page.editor.commands.setContent(
      paragraph(
        text('a '),
        { type: 'badge' },
        text(' and '),
        text('lit', ['highlight', 'bold']),
        text(' ', ['bold']),
      ),
    )
    expect(page.write()).toBe('a :badge: and **lit**')
  })
})

describe('the writer’s edges', () => {
  it('writes an address with spaces in angle brackets, and a link CommonMark can’t open as HTML', () => {
    expect(engine('commonmark', '[a](<https://x.y/a b>)').write()).toBe('[a](<https://x.y/a b>)')
    const linked = engine('commonmark')
    linked.editor.commands.setContent(
      paragraph(
        text('see'),
        text('[x]', ['bold', 'link'], { href: 'https://x.y/"q"' }),
        text('z', ['bold']),
        text('now'),
      ),
    )
    expect(linked.write()).toBe(
      'see<strong><a href="https://x.y/%22q%22">&#91;x&#93;</a>z</strong>now',
    )
  })

  it('holds Discord’s headings to its three levels, and its lists’ words under their items', () => {
    const page = engine('discord')
    page.editor.commands.setContent({
      type: 'doc',
      content: [{ type: 'heading', attrs: { level: 5 }, content: [text('deep')] }],
    })
    expect(page.write()).toBe('### deep')
    roundTrip('discord', ['- a\n  b\n- c', '3. three\n4. four', '```\ncode\n```', '```\n\n```'])
  })

  it('leaves out a line break at either end of a block, and writes one inside', () => {
    const page = engine('commonmark')
    page.editor.commands.setContent(
      paragraph({ type: 'hardBreak' }, text('a'), { type: 'hardBreak' }, text('b'), {
        type: 'hardBreak',
      }),
    )
    expect(page.write()).toBe('a\\\nb')
  })

  it('reads an empty title and an empty footer as one empty line', () => {
    expect(engine('discord', '', 'inline').editor.getJSON()).toEqual({
      type: 'doc',
      content: [{ type: 'paragraph' }],
    })
    expect(engine('commonmark', '', 'inline').write()).toBe('')
    expect(engine('discord', 'a\n\nb', 'plain').write()).toBe('a\n\nb')
  })
})
