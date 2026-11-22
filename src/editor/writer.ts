// The editor's writer: its document as the Markdown of its dialect. It is the kit's own rather
// than TipTap's, for what TipTap's leaves to chance: text is escaped only where it would
// otherwise be read as Markdown, so `snake_case`, `&` and `<` stay as typed; a line that starts
// with a heading's or a list's mark stays words; and in the Discord dialect each line is a line
// of its own, `__` is underline and `**` bold, and a mention is written back as the token it was.
//
// A node the kit doesn't know, from an app's own extension, is written by that extension's own
// Markdown through `fallback`.
import type { JSONContent } from '@tiptap/core'
import { TOKEN } from '../discord/tokens'

export type KitEditorDialect = 'commonmark' | 'discord'
export type KitEditorProfile = 'full' | 'inline' | 'plain'

export interface WriteOptions {
  dialect: KitEditorDialect
  profile: KitEditorProfile
  /** The nodes an app's own extensions make, which `fallback` writes. */
  delegated: ReadonlySet<string>
  /** Writes a node of an app's own, by its own extension's Markdown. */
  fallback: (node: JSONContent, parent: JSONContent | undefined, index: number) => string
}

type Mark = NonNullable<JSONContent['marks']>[number]

/** The marks, outermost first where two start together. Code is always innermost. */
const MARK_ORDER = ['link', 'spoiler', 'strike', 'bold', 'underline', 'italic', 'code']

const DELIMITERS: Readonly<Record<string, string>> = {
  bold: '**',
  italic: '*',
  underline: '__',
  strike: '~~',
  spoiler: '||',
}

/** An address CommonMark takes between angle brackets. */
const AUTOLINK_ADDRESS = /^[A-Za-z][A-Za-z0-9+.-]{1,31}:[^\s<>\p{Cc}]*$/u
/** A `<` that would open an HTML tag, comment or declaration, or an address between brackets. */
const TAG_OPENER =
  /^<(?:[A-Za-z][A-Za-z0-9-]*(?=[\s/>]|$)|\/[A-Za-z]|[!?]|[A-Za-z][A-Za-z0-9+.-]{1,31}:[^\s<>]*>)/
const ENTITY = /^&(?:#\d{1,7}|#[xX][0-9a-fA-F]{1,6}|[A-Za-z][A-Za-z0-9]{1,31});/
const ANGLE_LINK = /^<https?:\/\/[^\s<>]+>/
const EVERYONE = /^@(?:everyone|here)(?![\w])/
const ALPHANUMERIC = /[\p{L}\p{N}]/u

/**
 * Text with what would read as Markdown escaped, as each dialect reads it. With `marksOnly`,
 * where only marks are read (a title), a token, a link or a mention stays as it is typed.
 */
function escapeText(text: string, dialect: KitEditorDialect, marksOnly: boolean): string {
  const between = (at: number): boolean =>
    ALPHANUMERIC.test(text.charAt(at - 1)) && ALPHANUMERIC.test(text.charAt(at + 1))
  if (dialect === 'discord') {
    return text
      .replace(/[\\`*_~|[<@]/g, (ch: string, at: number) => {
        switch (ch) {
          case '_':
            return between(at) && text.charAt(at - 1) !== '_' && text.charAt(at + 1) !== '_'
              ? ch
              : '\\_'
          case '~':
          case '|':
            // The first of each pair is enough: no two are left to make a mark.
            return text.charAt(at + 1) === ch ? `\\${ch}` : ch
          case '[':
            return !marksOnly && text.includes('](', at) ? '\\[' : ch
          case '<':
            return !marksOnly && (TOKEN.test(text.slice(at)) || ANGLE_LINK.test(text.slice(at)))
              ? '\\<'
              : ch
          case '@':
            return !marksOnly && EVERYONE.test(text.slice(at)) ? '\\@' : ch
          default:
            return `\\${ch}`
        }
      })
      .replace(/\b(https?):\/\//g, marksOnly ? '$1://' : '$1\\://')
  }
  return text.replace(/[\\`*_~[<&]/g, (ch: string, at: number) => {
    switch (ch) {
      case '_':
        return between(at) ? ch : '\\_'
      case '<':
        return TAG_OPENER.test(text.slice(at)) ? '\\<' : ch
      case '&':
        return ENTITY.test(text.slice(at)) ? '\\&' : ch
      default:
        return `\\${ch}`
    }
  })
}

/** A line's opening escaped where it would start a block, as each dialect reads one. */
function escapeLineStart(line: string, dialect: KitEditorDialect): string {
  if (dialect === 'discord') {
    return line
      .replace(/^(\s*)(?=#{1,3} |-# |>|- )/, '$1\\')
      .replace(/^(\s*\d{1,9})\.(?= )/, '$1\\.')
  }
  return line
    .replace(/^( {0,3})(?=#{1,6}(?:[ \t]|$)|>|[-+](?:[ \t]|$)|[-=]+[ \t]*$|~~~)/, '$1\\')
    .replace(/^( {0,3}\d{1,9})([.)])(?=[ \t]|$)/, '$1\\$2')
}

/** A node's children; none for a leaf. */
function kids(node: JSONContent): JSONContent[] {
  return node.content ?? []
}

/** A node's or a mark's attribute as words; empty where it has none. */
function attr(node: { attrs?: Record<string, unknown> }, name: string): string {
  const value = node.attrs?.[name]
  return typeof value === 'string' ? value : ''
}

/** A text node's words; empty for any other node. */
function words(node: JSONContent): string {
  return node.text ?? ''
}

function markKey(mark: Mark): string {
  return `${mark.type}${JSON.stringify(mark.attrs ?? {})}`
}

function rank(type: string): number {
  const at = MARK_ORDER.indexOf(type)
  // An app's own mark sits just outside code.
  return at === -1 ? MARK_ORDER.length - 1.5 : at
}

type Tree = { leaf: JSONContent } | { mark: Mark; children: Tree[] }

/** A mark around its words, with the spaces it leaves outside it. */
interface Span {
  type: string
  delimiter: string
  lead: string
  core: string
  trail: string
  children: Tree[]
}

/** The HTML a mark renders to, which CommonMark writes where its delimiters can't be read. */
const HTML_TAGS: Readonly<Record<string, string>> = {
  bold: 'strong',
  italic: 'em',
  strike: 'del',
  code: 'code',
}

/** A line break inside a block, as each dialect writes one. */
const LINE_BREAK: Readonly<Record<KitEditorDialect, string>> = { commonmark: '\\\n', discord: '\n' }

const PUNCTUATION = /[\p{P}\p{S}]/u
const SPACE_OR_PUNCTUATION = /[\s\p{P}\p{S}]/u
const WORD = /[\p{L}\p{N}_]/u

/**
 * The inline nodes as a tree of marks: at each node, the mark that runs on furthest opens
 * first, so a mark is opened once for its whole run.
 */
function build(nodes: readonly JSONContent[], applied: ReadonlySet<string>): Tree[] {
  const out: Tree[] = []
  let i = 0
  const open = (node: JSONContent): Mark[] =>
    (node.marks ?? []).filter((mark) => !applied.has(markKey(mark)))
  for (let node = nodes[i]; node; node = nodes[i]) {
    const marks = open(node)
    if (!marks.length) {
      out.push({ leaf: node })
      i++
      continue
    }
    const runOf = (mark: Mark): number => {
      let end = i
      while (
        end < nodes.length &&
        (nodes[end]?.marks ?? []).some((m) => markKey(m) === markKey(mark))
      ) {
        end++
      }
      return end - i
    }
    // Code holds nothing but its text, so it opens only once no other mark is left.
    const choices = marks.some((mark) => mark.type !== 'code')
      ? marks.filter((mark) => mark.type !== 'code')
      : marks
    // The one that runs furthest; of two that run as far, the outer.
    const chosen = choices.reduce((best, mark) =>
      (runOf(mark) - runOf(best) || rank(best.type) - rank(mark.type)) > 0 ? mark : best,
    )
    const run = runOf(chosen)
    out.push({
      mark: chosen,
      children: build(nodes.slice(i, i + run), new Set([...applied, markKey(chosen)])),
    })
    i += run
  }
  return out
}

function plainText(trees: readonly Tree[]): string {
  return trees
    .map((tree) => ('leaf' in tree ? words(tree.leaf) : plainText(tree.children)))
    .join('')
}

class Writer {
  constructor(private readonly options: WriteOptions) {}

  private get dialect(): KitEditorDialect {
    return this.options.dialect
  }

  private leaf(node: JSONContent, parent: JSONContent | undefined, index: number): string {
    switch (node.type) {
      case 'text':
        return escapeText(words(node), this.dialect, this.options.profile === 'inline')
      case 'hardBreak':
        return LINE_BREAK[this.dialect]
      case 'discordToken':
      case 'markdownSource':
        return attr(node, 'raw')
      default:
        return this.options.fallback(node, parent, index)
    }
  }

  private code(text: string): string {
    const longest = Math.max(0, ...[...text.matchAll(/`+/g)].map((run) => run[0].length))
    const fence = '`'.repeat(longest + 1)
    // CommonMark takes a space off each end of code that starts or ends with one, or a backtick.
    const pad = this.dialect === 'commonmark' && /^[ `]|[ `]$/.test(text) ? ' ' : ''
    return `${fence}${pad}${text}${pad}${fence}`
  }

  private link(mark: Mark, children: Tree[], parent: JSONContent | undefined): string {
    const href = attr(mark, 'href')
    const title = mark.attrs?.title ? String(mark.attrs.title) : ''
    const text = plainText(children)
    const plain = children.every((child) => 'leaf' in child && child.leaf.type === 'text')
    if (plain && !title && (text === href || `mailto:${text}` === href)) {
      if (this.dialect === 'discord' && /^https?:\/\//.test(href)) {
        return mark.attrs?.form === 'angle' ? `<${href}>` : href
      }
      if (this.dialect === 'commonmark' && AUTOLINK_ADDRESS.test(href)) {
        return `<${text}>`
      }
    }
    const destination = /[\s()<>]/.test(href)
      ? `<${href.replace(/[<>]/g, encodeURIComponent)}>`
      : href
    const titled = title ? ` "${title.replace(/"/g, '\\"')}"` : ''
    return `[${this.trees(children, parent)}](${destination}${titled})`
  }

  /** A tree as written, or a mark's parts, whose delimiters wait on what is on either side. */
  private piece(tree: Tree, parent: JSONContent | undefined, index: number): string | Span {
    if ('leaf' in tree) {
      return this.leaf(tree.leaf, parent, index)
    }
    const { mark, children } = tree
    if (mark.type === 'code') {
      return this.code(plainText(children))
    }
    if (mark.type === 'link') {
      return this.link(mark, children, parent)
    }
    // The words inside stand between the delimiters, which are all they touch.
    const inner = this.trees(children, parent, '*', '*')
    const delimiter = DELIMITERS[mark.type]
    if (delimiter === undefined || (mark.type === 'underline' && this.dialect !== 'discord')) {
      return inner
    }
    // A mark's delimiters hug its words: the spaces at either end go outside it.
    const core = inner.trim()
    const lead = inner.slice(0, inner.length - inner.trimStart().length)
    const trail = inner.slice(inner.trimEnd().length)
    return core ? { type: mark.type, delimiter, lead, core, trail, children } : inner
  }

  /** A mark's delimiters, as what stands before and after its words lets them be read. */
  private delimit(span: Span, before: string, after: string): string {
    const { type, core, delimiter } = span
    const first = core.charAt(0)
    const last = core.charAt(core.length - 1)
    // Italic beside a bold's stars takes underscores, so `***` is never left to guess at.
    const underscores = type === 'italic' && (first === '*' || last === '*')
    if (this.dialect === 'discord') {
      const bounded = !WORD.test(before) && !WORD.test(after)
      const chosen = underscores && bounded ? '_' : delimiter
      return `${chosen}${core}${chosen}`
    }
    // CommonMark opens a mark only where its first word isn't punctuation hard after a word,
    // and closes one alike; where it can't, the mark is written as the HTML it renders to.
    const opens = !PUNCTUATION.test(first) || !before || SPACE_OR_PUNCTUATION.test(before)
    const closes = !PUNCTUATION.test(last) || !after || SPACE_OR_PUNCTUATION.test(after)
    const wordy = (side: string): boolean => Boolean(side) && !SPACE_OR_PUNCTUATION.test(side)
    if (!opens || !closes || (underscores && (wordy(before) || wordy(after)))) {
      return this.html({ mark: { type }, children: span.children }).trim()
    }
    const chosen = underscores ? '_' : delimiter
    return `${chosen}${core}${chosen}`
  }

  /**
   * Words as the HTML they render to, where CommonMark's delimiters can't be read. A CommonMark
   * renderer reads Markdown between the tags and the editor reads them as HTML, so each sign
   * either would read as anything but itself is written as its entity, which both read alike.
   */
  private html(tree: Tree): string {
    if ('leaf' in tree) {
      const { leaf } = tree
      if (leaf.type === 'text') {
        return words(leaf).replace(/[&<>"*_`[\]\\~]/g, (ch) => `&#${String(ch.charCodeAt(0))};`)
      }
      return leaf.type === 'hardBreak' ? '<br>' : this.leaf(leaf, undefined, 0)
    }
    const inner = tree.children.map((child) => this.html(child)).join('')
    if (tree.mark.type === 'link') {
      const href = attr(tree.mark, 'href').replace(/"/g, '%22')
      return `<a href="${href}">${inner}</a>`
    }
    const tag = HTML_TAGS[tree.mark.type]
    return tag ? `<${tag}>${inner}</${tag}>` : inner
  }

  private trees(
    trees: readonly Tree[],
    parent: JSONContent | undefined,
    before = '',
    after = '',
  ): string {
    const pieces = trees.map((tree, index) => this.piece(tree, parent, index))
    const firstOf = (piece: string | Span | undefined): string => {
      if (piece === undefined) {
        return after
      }
      return typeof piece === 'string' ? piece.charAt(0) || after : piece.lead.charAt(0) || '*'
    }
    let out = ''
    pieces.forEach((piece, at) => {
      if (typeof piece === 'string') {
        out += piece
        return
      }
      const prior = piece.lead ? piece.lead.slice(-1) : out.slice(-1) || before
      const next = piece.trail ? piece.trail.charAt(0) : firstOf(pieces[at + 1])
      out += `${piece.lead}${this.delimit(piece, prior, next)}${piece.trail}`
    })
    return out
  }

  /** A block's words, every line's opening escaped where it starts a line of its own. */
  inline(node: JSONContent): string {
    // A line break at either end of a block shows nowhere.
    const content = [...kids(node)]
    while (content[0]?.type === 'hardBreak') {
      content.shift()
    }
    while (content.at(-1)?.type === 'hardBreak') {
      content.pop()
    }
    const written = this.trees(build(content, new Set()), node)
    if (this.options.profile === 'inline') {
      return written
    }
    return written
      .split('\n')
      .map((line) => escapeLineStart(line, this.dialect))
      .join('\n')
  }

  private indent(text: string, by: string, first: string): string {
    return text
      .split('\n')
      .map((line, i) => (i === 0 ? first + line : line ? by + line : line))
      .join('\n')
  }

  private list(node: JSONContent): string {
    const ordered = node.type === 'orderedList'
    const start = Number(node.attrs?.start ?? 1)
    return kids(node)
      .map((item, i) => {
        const marker = ordered ? `${String(start + i)}. ` : '- '
        const by = this.dialect === 'discord' ? '  ' : ' '.repeat(marker.length)
        const parts = kids(item)
        const body = parts
          .map((part, at) => {
            const written = this.block(part, item, at) ?? ''
            if (at === 0) {
              return written
            }
            const isList = part.type === 'bulletList' || part.type === 'orderedList'
            // In CommonMark a second paragraph needs a blank line before it; a list doesn't.
            const gap = this.dialect === 'commonmark' && !isList ? '\n\n' : '\n'
            return gap + written
          })
          .join('')
        return this.indent(body, by, marker)
      })
      .join('\n')
  }

  private quote(node: JSONContent, last: boolean): string {
    const inner = this.blocks(kids(node), node)
    if (this.dialect === 'discord' && node.attrs?.toEnd && last) {
      return `>>> ${inner}`
    }
    return inner
      .split('\n')
      .map((line) => (line ? `> ${line}` : '>'))
      .join('\n')
  }

  private codeBlock(node: JSONContent): string {
    const text = kids(node)
      .map((part) => words(part))
      .join('')
    const longest = Math.max(2, ...[...text.matchAll(/`+/g)].map((run) => run[0].length))
    const fence = this.dialect === 'discord' ? '```' : '`'.repeat(longest + 1)
    const language = attr(node, 'language')
    return `${fence}${language}\n${text}\n${fence}`
  }

  block(
    node: JSONContent,
    parent: JSONContent | undefined,
    index: number,
    last = false,
  ): string | null {
    if (this.options.delegated.has(node.type ?? '')) {
      return this.options.fallback(node, parent, index)
    }
    switch (node.type) {
      case 'paragraph': {
        const words = this.inline(node)
        return words || this.dialect === 'discord' ? words : null
      }
      case 'heading': {
        const level = Math.min(Number(node.attrs?.level ?? 1), this.dialect === 'discord' ? 3 : 6)
        return `${'#'.repeat(level)} ${this.inline(node).replace(/\n/g, ' ')}`
      }
      case 'subtext':
        return `-# ${this.inline(node).replace(/\n/g, ' ')}`
      case 'blockquote':
        return this.quote(node, last)
      case 'bulletList':
      case 'orderedList':
        return this.list(node)
      case 'codeBlock':
        return this.codeBlock(node)
      case 'horizontalRule':
        return '---'
      case 'markdownBlockSource':
        return attr(node, 'raw')
      default:
        return this.options.fallback(node, parent, index)
    }
  }

  blocks(nodes: readonly JSONContent[], parent: JSONContent | undefined): string {
    const written = nodes
      .map((node, index) => this.block(node, parent, index, index === nodes.length - 1))
      .filter((block): block is string => block !== null)
    return written.join(this.dialect === 'discord' ? '\n' : '\n\n')
  }
}

/** The lines of a document's text, as plain text: for the `plain` profile. */
function plain(doc: JSONContent): string {
  return kids(doc)
    .map((block) => kids(block).map(words).join(''))
    .join('\n')
}

/** Blank lines at either end of a document, which no reader shows. */
function trimBlankBlocks(nodes: readonly JSONContent[]): JSONContent[] {
  const blank = (node: JSONContent | undefined): boolean =>
    node?.type === 'paragraph' && !kids(node).length
  let start = 0
  let end = nodes.length
  while (start < end && blank(nodes[start])) {
    start++
  }
  while (end > start && blank(nodes[end - 1])) {
    end--
  }
  return nodes.slice(start, end)
}

/** The editor's document as the Markdown its dialect and profile write. */
export function writeMarkdown(doc: JSONContent, options: WriteOptions): string {
  if (options.profile === 'plain') {
    return plain(doc).replace(/^\n+|\n+$/g, '')
  }
  const writer = new Writer(options)
  if (options.profile === 'inline') {
    return kids(doc)
      .map((block) => writer.inline(block))
      .join(' ')
      .trim()
  }
  // Spaces at either end show nowhere, and a server or Discord leaves them out of its count.
  return writer.blocks(trimBlankBlocks(kids(doc)), doc).trim()
}
