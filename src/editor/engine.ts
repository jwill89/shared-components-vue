// The editor's engine: TipTap, set up for one dialect and one profile, reading and writing
// Markdown. The CommonMark dialect reads through TipTap's Markdown package, on a `marked` of its
// own (never marked's shared one, so no dialect's rules reach another editor), and the Discord
// dialect through the kit's Discord grammar. Both write through the kit's own writer.
//
// Pasted text is read as the dialect's Markdown, pasted HTML through the editor's own pieces, and
// copied text is written as the dialect's Markdown, so a copy pasted into Discord keeps its marks.
import {
  Editor,
  Extension,
  Node,
  flattenExtensions,
  markInputRule,
  markPasteRule,
  type AnyExtension,
  type Extensions,
  type JSONContent,
} from '@tiptap/core'
import { Placeholder } from '@tiptap/extensions'
import { Markdown } from '@tiptap/markdown'
import { Slice, type MarkType } from '@tiptap/pm/model'
import { StarterKit, type StarterKitOptions } from '@tiptap/starter-kit'
import { Marked, type marked } from 'marked'
import { parseDiscord, parseInline } from '../discord/grammar'
import type { KitDiscordNames } from '../discord/tokens'
import { DiscordToken, Spoiler, Subtext, blockContent, inlineContent } from './discord'
import { writeMarkdown, type KitEditorDialect, type KitEditorProfile } from './writer'

export interface EngineOptions {
  /** The element the editable text is placed in. */
  element: HTMLElement
  dialect: KitEditorDialect
  profile: KitEditorProfile
  /** The Markdown it starts with. */
  content: string
  /** The app's own pieces. */
  extensions: readonly AnyExtension[]
  /** The kit's own pieces the component adds: the Discord dialect's suggestions. */
  additions?: readonly AnyExtension[]
  /** The names Discord's tokens show by, as they stand. */
  names: () => KitDiscordNames
  /** Shown while it is empty. */
  placeholder: string
  /** The editable element's own attributes: its role, name and description. */
  attributes: () => Record<string, string>
  onUpdate: () => void
  onTransaction: () => void
  onFocus: () => void
  onBlur: () => void
}

export interface Engine {
  editor: Editor
  /** Replaces the text with `markdown`, without reporting it as an edit. */
  read: (markdown: string) => void
  /** The text as the dialect's Markdown. */
  write: () => string
  /** Draws each token again, by the names as they now stand. */
  redrawTokens: () => void
  destroy: () => void
}

/** A document of one paragraph, for a title, or of lines, for plain text. */
function oneBlock(content: string): AnyExtension {
  return Node.create({ name: 'doc', topNode: true, content })
}

/**
 * Markdown the editor can't show, such as an image, a table or HTML, kept as its source: shown
 * as it is written, and written back unchanged.
 */
function source(name: string, inline: boolean, token: string): AnyExtension {
  return Node.create({
    name,
    group: inline ? 'inline' : 'block',
    inline,
    atom: true,
    selectable: true,
    // An app's own piece for the same Markdown (a table, say) is tried first.
    priority: 50,
    addAttributes: () => ({
      raw: {
        default: '',
        parseHTML: (element: HTMLElement) => element.getAttribute('data-markdown'),
        renderHTML: (attributes: Record<string, unknown>) => ({
          'data-markdown': String(attributes.raw),
        }),
      },
    }),
    parseHTML: () => [{ tag: `${inline ? 'span' : 'div'}[data-markdown]` }],
    renderHTML: ({ node, HTMLAttributes }) => [
      inline ? 'span' : 'pre',
      { ...HTMLAttributes, class: 'kit-markdown-editor__source' },
      String(node.attrs.raw),
    ],
    markdownTokenName: token,
    parseMarkdown: (found, helpers) =>
      helpers.createNode(name, { raw: (found.raw ?? '').replace(/\n+$/, '') }),
  })
}

const InlineSource = source('markdownSource', true, 'image')
const BlockSource = source('markdownBlockSource', false, 'table')

/** In Discord every line is its own, so Shift+Enter, Discord's own new line, starts one too. */
const ShiftEnter = Extension.create({
  name: 'kitShiftEnter',
  addKeyboardShortcuts() {
    return {
      'Shift-Enter': () =>
        this.editor.isActive('codeBlock')
          ? this.editor.commands.insertContent('\n')
          : this.editor.commands.first(({ commands }) => [
              () => commands.splitListItem('listItem'),
              () => commands.splitBlock(),
            ]),
    }
  },
})

// Discord's own marks as they are typed and pasted: `**` bold, `__` underline and `||` a
// spoiler. TipTap's bold reads `__` as bold too, as CommonMark does, so in the Discord dialect
// its own rules are off and these stand in.
const BOLD_TYPED = /(?:^|\s)(\*\*(?!\s+\*\*)([^*]+)\*\*(?!\s+\*\*))$/
const BOLD_PASTED = /(?:^|\s)(\*\*(?!\s+\*\*)([^*]+)\*\*(?!\s+\*\*))/g
const UNDERLINE_TYPED = /(?:^|\s)(__(?!\s+__)([^_]+)__(?!\s+__))$/
const UNDERLINE_PASTED = /(?:^|\s)(__(?!\s+__)([^_]+)__(?!\s+__))/g
const SPOILER_TYPED = /(?:^|\s)(\|\|(?!\s+\|\|)([^|]+)\|\|(?!\s+\|\|))$/
const SPOILER_PASTED = /(?:^|\s)(\|\|(?!\s+\|\|)([^|]+)\|\|(?!\s+\|\|))/g

/** Each rule with the mark it makes: bold, underline and spoiler, as the editor has them. */
function marksOf(editor: Editor, rules: readonly RegExp[]): [RegExp, MarkType][] {
  const { marks } = editor.schema
  return ['bold', 'underline', 'spoiler'].flatMap((name, at): [RegExp, MarkType][] => {
    const type = marks[name]
    const rule = rules[at]
    return type && rule ? [[rule, type]] : []
  })
}

const DiscordMarks = Extension.create({
  name: 'kitDiscordMarks',
  addInputRules() {
    return marksOf(this.editor, [BOLD_TYPED, UNDERLINE_TYPED, SPOILER_TYPED]).map(([find, type]) =>
      markInputRule({ find, type }),
    )
  },
  addPasteRules() {
    return marksOf(this.editor, [BOLD_PASTED, UNDERLINE_PASTED, SPOILER_PASTED]).map(
      ([find, type]) => markPasteRule({ find, type }),
    )
  },
})

/** What a quote and a link keep that the editor doesn't show: how each was written. */
const WrittenForm = Extension.create({
  name: 'kitWrittenForm',
  addGlobalAttributes: () => [
    { types: ['blockquote'], attributes: { toEnd: { default: false, rendered: false } } },
    { types: ['link'], attributes: { form: { default: null, rendered: false } } },
  ],
})

/** Only an address typed whole, from its scheme, becomes a link as it is typed. */
const LINK: Partial<StarterKitOptions['link'] & object> = {
  openOnClick: false,
  autolink: true,
  linkOnPaste: true,
  defaultProtocol: 'https',
  shouldAutoLink: (url: string) => /^https?:\/\//i.test(url),
}

/**
 * Headings at the levels a dialect has, drawn as headings but not made the page's own: a draft's
 * heading in a text box is no heading of the page around it, and a screen reader's list of the
 * page's headings leaves it out. The toolbar says which level the line at the cursor is.
 */
const HEADINGS = (levels: (1 | 2 | 3 | 4 | 5 | 6)[]): StarterKitOptions['heading'] => ({
  levels,
  HTMLAttributes: { role: 'presentation' },
})

/** The StarterKit pieces whose option takes the piece's own name. */
const STARTER_KIT_PARTS = new Set([
  'blockquote',
  'bold',
  'bulletList',
  'code',
  'codeBlock',
  'hardBreak',
  'heading',
  'horizontalRule',
  'italic',
  'link',
  'listItem',
  'orderedList',
  'paragraph',
  'strike',
  'underline',
])

/** The StarterKit pieces each profile leaves out; an app's piece of the same name replaces one. */
function starterKit(
  dialect: KitEditorDialect,
  profile: KitEditorProfile,
  replaced: ReadonlySet<string>,
): AnyExtension {
  const blocks: Partial<StarterKitOptions> = {
    document: false,
    blockquote: false,
    bulletList: false,
    codeBlock: false,
    heading: false,
    horizontalRule: false,
    listItem: false,
    listKeymap: false,
    orderedList: false,
    hardBreak: false,
    link: false,
    gapcursor: false,
    trailingNode: false,
  }
  const marks: Partial<StarterKitOptions> = {
    bold: false,
    italic: false,
    strike: false,
    code: false,
    underline: false,
  }
  const options: Partial<StarterKitOptions> =
    profile === 'plain'
      ? { ...blocks, ...marks }
      : profile === 'inline'
        ? { ...blocks, underline: dialect === 'discord' ? {} : false }
        : dialect === 'discord'
          ? { heading: HEADINGS([1, 2, 3]), horizontalRule: false, hardBreak: false, link: LINK }
          : { heading: HEADINGS([1, 2, 3, 4, 5, 6]), underline: false, link: LINK }
  for (const name of replaced) {
    if (STARTER_KIT_PARTS.has(name)) {
      ;(options as Record<string, unknown>)[name] = false
    }
  }
  return StarterKit.configure(options)
}

function extensionsFor(options: EngineOptions, views: Set<() => void>): Extensions {
  const { dialect, profile } = options
  const app = flattenExtensions([...options.extensions])
  const replaced = new Set(app.map((extension) => extension.name))
  const list: AnyExtension[] = [
    starterKit(dialect, profile, replaced),
    Placeholder.configure({ placeholder: options.placeholder }),
  ]
  if (profile !== 'full') {
    // A title's one paragraph takes no new one, and it has no line breaks to take.
    list.push(oneBlock(profile === 'inline' ? 'paragraph' : 'paragraph+'))
  }
  if (dialect === 'discord') {
    if (profile !== 'plain') {
      list.push(Spoiler, DiscordMarks)
    }
    if (profile === 'full') {
      list.push(Subtext, DiscordToken.configure({ names: options.names, views }), ShiftEnter)
    }
  } else if (profile === 'full') {
    list.push(InlineSource, BlockSource)
  }
  list.push(WrittenForm)
  // TipTap's Markdown reads the CommonMark dialect, and reads an app's own Markdown in it.
  if (dialect === 'commonmark' && profile !== 'plain') {
    const parser = new Marked({ gfm: true, breaks: false })
    list.push(Markdown.configure({ marked: parser as unknown as typeof marked }))
  }
  return [...list, ...(options.additions ?? []), ...options.extensions]
}

/** The text of every textblock in a document, joined into one line's content. */
function flatten(doc: JSONContent): JSONContent[] {
  const lines: JSONContent[][] = []
  const visit = (node: JSONContent): void => {
    if (node.content?.some((child) => child.type === 'text' || child.type === 'hardBreak')) {
      lines.push(node.content.filter((child) => child.type !== 'hardBreak'))
    } else {
      node.content?.forEach(visit)
    }
  }
  visit(doc)
  return lines.flatMap((line, i) => (i ? [{ type: 'text', text: ' ' }, ...line] : line))
}

/** A paragraph of `content`, which an empty one leaves out. */
function paragraph(content: JSONContent[]): JSONContent {
  return content.length ? { type: 'paragraph', content } : { type: 'paragraph' }
}

function plainLines(text: string): JSONContent {
  const lines = text.replace(/\r\n?/g, '\n').split('\n')
  return {
    type: 'doc',
    content: lines.map((line) => paragraph(line ? [{ type: 'text', text: line }] : [])),
  }
}

export function createEngine(options: EngineOptions): Engine {
  const views = new Set<() => void>()
  const { dialect, profile } = options
  const app = new Set(flattenExtensions([...options.extensions]).map((extension) => extension.name))
  /** TipTap's Markdown, which the CommonMark dialect reads and an app's own pieces write by. */
  const markdown = (): NonNullable<Editor['markdown']> => {
    if (!editor.markdown) {
      throw new Error('The CommonMark dialect has no Markdown reader.')
    }
    return editor.markdown
  }

  /** Markdown as the editor's document. */
  const parse = (text: string): JSONContent => {
    if (profile === 'plain') {
      return plainLines(text)
    }
    if (profile === 'inline') {
      const content =
        dialect === 'discord'
          ? inlineContent(parseInline(text.replace(/\s*\n\s*/g, ' '), true))
          : flatten(markdown().parse(text))
      return { type: 'doc', content: [paragraph(content)] }
    }
    const content =
      dialect === 'discord'
        ? blockContent(parseDiscord(text))
        : (markdown().parse(text).content ?? [])
    return { type: 'doc', content: content.length ? content : [paragraph([])] }
  }

  const write = (doc: JSONContent): string =>
    writeMarkdown(doc, {
      dialect,
      profile,
      delegated: app,
      fallback: (node, parent, index) => markdown().renderNodeToMarkdown(node, parent, index),
    })

  const extensions = extensionsFor(options, views)
  // In Discord, every piece's own typing and pasting rules but bold's, whose `__` is underline.
  const rules =
    dialect === 'discord'
      ? flattenExtensions(extensions)
          .map((extension) => extension.name)
          .filter((name) => name !== 'bold')
      : true
  // Made after the reading and writing it calls on, which only run once it stands.
  const editor = new Editor({
    element: options.element,
    extensions,
    enableInputRules: rules,
    enablePasteRules: rules,
    // TipTap would add a <style> of its base rules, which a content security policy refuses
    // without a nonce; the kit's stylesheet carries them instead.
    injectCSS: false,
    editorProps: {
      attributes: () => ({ class: 'kit-markdown-editor__text', ...options.attributes() }),
      clipboardTextParser: (text, _context, plain, view) => {
        const doc = plain ? plainLines(text) : parse(text)
        return Slice.maxOpen(view.state.schema.nodeFromJSON(doc).content)
      },
      clipboardTextSerializer: (slice) =>
        write({ type: 'doc', content: slice.content.toJSON() as JSONContent[] }),
    },
    onUpdate: () => options.onUpdate(),
    onTransaction: () => options.onTransaction(),
    onFocus: () => options.onFocus(),
    onBlur: () => options.onBlur(),
  })
  const created = editor
  const read = (markdown: string): void => {
    created.commands.setContent(parse(markdown), { emitUpdate: false })
  }
  read(options.content)
  return {
    editor: created,
    read,
    write: () => write(created.getJSON()),
    redrawTokens: () => {
      views.forEach((draw) => draw())
    },
    destroy: () => {
      created.destroy()
    },
  }
}
