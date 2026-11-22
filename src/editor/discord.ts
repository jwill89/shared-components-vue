// The Discord dialect's own pieces: a spoiler, a line of subtext, a quote that runs to the end
// of the message, and the tokens (a member, a role, a channel, an emoji, a time, a command), which
// show by the names the app gives and are written back as the token they were. Its text is read
// by the kit's Discord grammar, the one KitDiscordPreview draws with, rather than as CommonMark.
import { Mark, Node, mergeAttributes, textblockTypeInputRule, type JSONContent } from '@tiptap/core'
import type { DiscordBlock, DiscordInline } from '../discord/grammar'
import { showRaw, type KitDiscordNames } from '../discord/tokens'

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    spoiler: {
      toggleSpoiler: () => ReturnType
    }
    subtext: {
      toggleSubtext: () => ReturnType
    }
  }
}

/** `||words||`: words a reader uncovers by pressing them. */
export const Spoiler = Mark.create({
  name: 'spoiler',
  parseHTML: () => [{ tag: 'span[data-spoiler]' }],
  renderHTML: ({ HTMLAttributes }) => [
    'span',
    mergeAttributes(HTMLAttributes, { 'data-spoiler': '', class: 'kit-markdown-editor__spoiler' }),
    0,
  ],
  addCommands() {
    return {
      toggleSpoiler:
        () =>
        ({ commands }) =>
          commands.toggleMark(this.name),
    }
  },
})

/** `-# words`: a line of small print. */
export const Subtext = Node.create({
  name: 'subtext',
  group: 'block',
  content: 'inline*',
  defining: true,
  parseHTML: () => [{ tag: 'p[data-subtext]' }],
  renderHTML: ({ HTMLAttributes }) => [
    'p',
    mergeAttributes(HTMLAttributes, { 'data-subtext': '', class: 'kit-markdown-editor__subtext' }),
    0,
  ],
  addCommands() {
    return {
      toggleSubtext:
        () =>
        ({ commands }) =>
          commands.toggleNode(this.name, 'paragraph'),
    }
  },
  addInputRules() {
    return [textblockTypeInputRule({ find: /^-#\s$/, type: this.type })]
  },
})

export interface TokenOptions {
  /** The names to show tokens by, as they stand. */
  names: () => KitDiscordNames
  /** Each drawn token's redraw, called when the names change. */
  views: Set<() => void>
}

/**
 * A token: a mention, a channel, a role, an emoji, a time or a command. It is one piece, which
 * the cursor steps over and Backspace takes away whole, shown by its name and written as itself.
 */
export const DiscordToken = Node.create<TokenOptions>({
  name: 'discordToken',
  group: 'inline',
  inline: true,
  atom: true,
  selectable: true,

  addOptions() {
    return { names: () => ({}), views: new Set() }
  },

  addAttributes() {
    return {
      raw: {
        default: '',
        parseHTML: (element) => element.getAttribute('data-discord-token'),
        renderHTML: (attributes) => ({ 'data-discord-token': String(attributes.raw) }),
      },
    }
  },

  parseHTML: () => [{ tag: 'span[data-discord-token]' }],

  renderHTML({ node, HTMLAttributes }) {
    return [
      'span',
      mergeAttributes(HTMLAttributes, { class: 'kit-markdown-editor__token' }),
      showRaw(String(node.attrs.raw), this.options.names()).text,
    ]
  },

  renderText: ({ node }) => String(node.attrs.raw),

  addNodeView() {
    return ({ node }) => {
      let current = node
      const dom = document.createElement('span')
      dom.className = 'kit-markdown-editor__token'
      dom.contentEditable = 'false'
      const draw = (): void => {
        const raw = String(current.attrs.raw)
        const shown = showRaw(raw, this.options.names())
        dom.replaceChildren()
        dom.dataset.discordToken = raw
        dom.classList.toggle('is-mention', shown.mention)
        if (shown.color) {
          const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
          svg.setAttribute('viewBox', '0 0 2 2')
          svg.setAttribute('aria-hidden', 'true')
          svg.setAttribute('class', 'kit-markdown-editor__dot')
          const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
          for (const [name, value] of Object.entries({
            cx: '1',
            cy: '1',
            r: '1',
            fill: shown.color,
          })) {
            dot.setAttribute(name, value)
          }
          svg.append(dot)
          dom.append(svg)
        }
        if (shown.image) {
          const image = document.createElement('img')
          image.src = shown.image
          image.alt = shown.text
          image.className = 'kit-markdown-editor__emoji'
          dom.append(image)
        } else {
          dom.append(shown.text)
        }
      }
      draw()
      this.options.views.add(draw)
      return {
        dom,
        update: (next) => {
          if (next.type !== current.type) {
            return false
          }
          current = next
          draw()
          return true
        },
        destroy: () => {
          this.options.views.delete(draw)
        },
        ignoreMutation: () => true,
      }
    }
  },
})

type MarkJSON = NonNullable<JSONContent['marks']>[number]

/** A line's marks, links and tokens as the editor's inline content. */
export function inlineContent(
  nodes: readonly DiscordInline[],
  marks: MarkJSON[] = [],
): JSONContent[] {
  const withMarks = (node: JSONContent): JSONContent => (marks.length ? { ...node, marks } : node)
  return nodes.flatMap((node): JSONContent[] => {
    switch (node.type) {
      // The grammar never makes empty words, and the editor would refuse them.
      case 'text':
        return [withMarks({ type: 'text', text: node.text })]
      case 'code':
        return [{ type: 'text', text: node.text, marks: [...marks, { type: 'code' }] }]
      case 'link': {
        const attrs: Record<string, unknown> = { href: node.href, form: node.form }
        if (node.title) {
          attrs.title = node.title
        }
        return inlineContent(node.children, [...marks, { type: 'link', attrs }])
      }
      case 'token':
        return [withMarks({ type: 'discordToken', attrs: { raw: node.raw } })]
      default:
        return inlineContent(node.children, [...marks, { type: node.type }])
    }
  })
}

function textblock(
  type: string,
  children: readonly DiscordInline[],
  attrs?: Record<string, unknown>,
): JSONContent {
  const content = inlineContent(children)
  return { type, ...(attrs ? { attrs } : {}), ...(content.length ? { content } : {}) }
}

/** What the grammar reads, as the editor's document. */
export function blockContent(blocks: readonly DiscordBlock[]): JSONContent[] {
  return blocks.map((block): JSONContent => {
    switch (block.type) {
      case 'line':
        return textblock('paragraph', block.children)
      case 'heading':
        return textblock('heading', block.children, { level: block.level })
      case 'subtext':
        return textblock('subtext', block.children)
      case 'quote': {
        const content = blockContent(block.children)
        return {
          type: 'blockquote',
          attrs: { toEnd: block.toEnd },
          content: content.length ? content : [{ type: 'paragraph' }],
        }
      }
      case 'list':
        return {
          type: block.ordered ? 'orderedList' : 'bulletList',
          ...(block.ordered ? { attrs: { start: block.start } } : {}),
          content: block.items.map((item) => ({ type: 'listItem', content: blockContent(item) })),
        }
      case 'code':
        return {
          type: 'codeBlock',
          attrs: { language: block.language || null },
          ...(block.text ? { content: [{ type: 'text', text: block.text }] } : {}),
        }
    }
  })
}
