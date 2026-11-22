// Discord's Markdown, read as Discord reads it: not CommonMark, but a grammar of lines. Each line
// stands alone, and a blank one is a blank line on screen; a heading, a line of subtext, a quote
// or a list item is a line that starts with its mark; `>>> ` quotes everything after it; and the
// marks inside a line are Discord's own, `__underline__` and `||spoilers||` among them. The specs
// hold it to Discord's own parser.
//
// KitDiscordPreview draws what this reads, and the editor's Discord dialect edits it, so the two
// agree on every message.
import { TOKEN, readToken, type DiscordToken } from './tokens'

export type DiscordMark = 'bold' | 'italic' | 'underline' | 'strike' | 'spoiler'

export type DiscordInline =
  | { type: 'text'; text: string }
  | { type: DiscordMark; children: DiscordInline[] }
  | { type: 'code'; text: string }
  | {
      type: 'link'
      href: string
      /** How it was written: `[words](https://…)`, a bare address, or one in angle brackets. */
      form: 'masked' | 'bare' | 'angle'
      title?: string
      children: DiscordInline[]
    }
  | { type: 'token'; raw: string; token: DiscordToken }

export type DiscordBlock =
  /** One line; with nothing in it, a blank line. */
  | { type: 'line'; children: DiscordInline[] }
  | { type: 'heading'; level: 1 | 2 | 3; children: DiscordInline[] }
  | { type: 'subtext'; children: DiscordInline[] }
  /** Lines that each start `> `, or everything after a `>>> ` (`toEnd`). */
  | { type: 'quote'; toEnd: boolean; children: DiscordBlock[] }
  | { type: 'list'; ordered: boolean; start: number; items: DiscordBlock[][] }
  | { type: 'code'; language: string; text: string }

/** What a line holds where Discord reads marks but no lines: an embed's title, a field's name. */
export type DiscordLine = DiscordInline[]

// A word character, as `_` and `__` look for one on either side: neither opens or closes inside
// a word, so snake_case stays as written.
const WORD = /[\p{L}\p{N}_]/u

const ESCAPE = /^\\([^\p{L}\p{N}\s])/u
const ANGLE_LINK = /^<(https?:\/\/[^\s<>]+)>/
// A bare address leaves out the punctuation of the sentence it ends.
const BARE_LINK = /^https?:\/\/[^\s<]*[^\s<.,:;"')\]!?*_~|]/
const MASKED_LINK =
  /^\[((?:\\[\s\S]|[^[\]\\])+)\]\(\s*<?(https?:\/\/[^\s)<>]+)>?(?:\s+"((?:\\"|[^"])*)")?\s*\)/
const CODE_FENCE_INLINE = /^```(?:[\w+\-.#]*\n)?([\s\S]+?)```/
const CODE = /^(`+)([\s\S]*?[^`])\1(?!`)/
const SPOILER = /^\|\|([^|][\s\S]*?)\|\|/
const BOLD = /^\*\*((?:\\[\s\S]|[^\\])+?)\*\*(?!\*)/
const UNDERLINE = /^__((?:\\[\s\S]|[^\\])+?)__(?![\p{L}\p{N}_])/u
// An underscore inside the words that runs on into a word doesn't close it.
const ITALIC_UNDERSCORE = /^_((?:__|\\[\s\S]|_(?=[\p{L}\p{N}])|[^\\_])+?)_(?![\p{L}\p{N}_])/u
const ITALIC_STAR = /^\*(?=[^\s*])((?:\*\*|\\[\s\S]|[^\\*])+?)\*(?!\*)/
const STRIKE = /^~~([\s\S]+?)~~/
// A run of text that can't start a mark, a link or a token.
const PLAIN = /^[^\\<[`|*_~@h]+/

// Where marks only are read, a link or a token is a run of text, so no mark reaches inside one.
const LINK_OR_TOKEN = new RegExp(
  [ANGLE_LINK, TOKEN, BARE_LINK, MASKED_LINK].map((rule) => rule.source).join('|'),
  'u',
)

/** A masked link's words that look like an address, which Discord leaves as written. */
const LOOKS_LIKE_ADDRESS = /^\s*(?:https?:\/\/|<https?:)/

/** A group of a match: empty where the group took no part in it. */
function group(found: RegExpExecArray, at: number): string {
  return found[at] ?? ''
}

/** A line of the text; past its end, an empty one. */
function lineAt(lines: readonly string[], at: number): string {
  return lines[at] ?? ''
}

function pushText(out: DiscordInline[], text: string): void {
  const last = out.at(-1)
  if (last?.type === 'text') {
    last.text += text
  } else {
    out.push({ type: 'text', text })
  }
}

/**
 * The marks, links and tokens of one line. With `marksOnly`, links and tokens are left as they
 * are written, as Discord leaves them in an embed's title or a field's name.
 */
export function parseInline(src: string, marksOnly = false): DiscordLine {
  const out: DiscordInline[] = []
  let rest = src
  // The character before `rest`, which `_` and `__` look at.
  let before = ''
  const take = (raw: string): void => {
    before = raw.slice(-1)
    rest = rest.slice(raw.length)
  }
  while (rest) {
    let found: RegExpExecArray | null
    const afterWord = WORD.test(before)
    if ((found = ESCAPE.exec(rest))) {
      pushText(out, group(found, 1))
    } else if (marksOnly && (found = LINK_OR_TOKEN.exec(rest))) {
      pushText(out, found[0])
    } else if ((found = ANGLE_LINK.exec(rest))) {
      const href = group(found, 1)
      out.push({ type: 'link', href, form: 'angle', children: [{ type: 'text', text: href }] })
    } else if ((found = TOKEN.exec(rest))) {
      const token = readToken(found[0])
      if (token) {
        out.push({ type: 'token', raw: found[0], token })
      }
    } else if ((found = BARE_LINK.exec(rest))) {
      out.push({
        type: 'link',
        href: found[0],
        form: 'bare',
        children: [{ type: 'text', text: found[0] }],
      })
    } else if ((found = MASKED_LINK.exec(rest))) {
      if (LOOKS_LIKE_ADDRESS.test(group(found, 1))) {
        pushText(out, found[0])
        take(found[0])
        continue
      }
      const link: DiscordInline = {
        type: 'link',
        href: group(found, 2),
        form: 'masked',
        children: parseInline(group(found, 1), marksOnly),
      }
      if (found[3]) {
        link.title = found[3].replace(/\\"/g, '"')
      }
      out.push(link)
    } else if ((found = CODE_FENCE_INLINE.exec(rest)) || (found = CODE.exec(rest))) {
      out.push({ type: 'code', text: group(found, found.length - 1) })
    } else if ((found = SPOILER.exec(rest))) {
      out.push({ type: 'spoiler', children: parseInline(group(found, 1), marksOnly) })
    } else if ((found = BOLD.exec(rest))) {
      out.push({ type: 'bold', children: parseInline(group(found, 1), marksOnly) })
    } else if (!afterWord && (found = ITALIC_UNDERSCORE.exec(rest))) {
      out.push({ type: 'italic', children: parseInline(group(found, 1), marksOnly) })
    } else if (!afterWord && (found = UNDERLINE.exec(rest))) {
      out.push({ type: 'underline', children: parseInline(group(found, 1), marksOnly) })
    } else if ((found = ITALIC_STAR.exec(rest))) {
      out.push({ type: 'italic', children: parseInline(group(found, 1), marksOnly) })
    } else if ((found = STRIKE.exec(rest))) {
      out.push({ type: 'strike', children: parseInline(group(found, 1), marksOnly) })
    } else {
      const plain = PLAIN.exec(rest)?.[0] ?? rest.charAt(0)
      pushText(out, plain)
      take(plain)
      continue
    }
    take(found[0])
  }
  return out
}

const HEADING = /^(#{1,3}) +(\S.*)$/
const SUBTEXT = /^-# +(\S.*)$/
const LIST_ITEM = /^( *)([-*]|\d{1,9}\.) +(\S.*)$/
const QUOTE_LINE = /^>(?: |$)/
const CODE_FENCE = /^```(?:([\w+\-.#]*)\n)?([\s\S]+?)```/

interface ListLine {
  indent: number
  ordered: boolean
  number: number
  text: string
}

function listLine(line: string): ListLine | null {
  const found = LIST_ITEM.exec(line)
  if (!found) {
    return null
  }
  const marker = group(found, 2)
  return {
    indent: group(found, 1).length,
    ordered: /\d/.test(marker),
    number: Number.parseInt(marker, 10),
    text: group(found, 3),
  }
}

function indentOf(line: string): number {
  return line.length - line.trimStart().length
}

/**
 * A list from `lines[at]`, whose items start at `indent`: each item's first line, and below it
 * the lines set in further, which hold a list of their own or more of the item's words.
 */
function readList(
  lines: readonly string[],
  at: number,
  first: ListLine,
): { block: DiscordBlock; next: number } {
  const items: DiscordBlock[][] = []
  let i = at
  while (i < lines.length) {
    const item = listLine(lineAt(lines, i))
    if (item?.indent !== first.indent || item.ordered !== first.ordered) {
      break
    }
    const content: DiscordBlock[] = [{ type: 'line', children: parseInline(item.text) }]
    i++
    while (i < lines.length) {
      const line = lineAt(lines, i)
      const nested = listLine(line)
      if (nested && nested.indent > first.indent) {
        const read = readList(lines, i, nested)
        content.push(read.block)
        i = read.next
      } else if (!nested && line.trim() && indentOf(line) > first.indent) {
        content.push({ type: 'line', children: parseInline(line.trim()) })
        i++
      } else {
        break
      }
    }
    items.push(content)
  }
  return {
    block: { type: 'list', ordered: first.ordered, start: first.ordered ? first.number : 1, items },
    next: i,
  }
}

function readBlocks(lines: readonly string[], inQuote: boolean): DiscordBlock[] {
  const blocks: DiscordBlock[] = []
  let i = 0
  while (i < lines.length) {
    const line = lineAt(lines, i)
    if (line.startsWith('```')) {
      const rest = lines.slice(i).join('\n')
      const fence = CODE_FENCE.exec(rest)
      // A fence that closes at the end of a line is a block; one with words after it on the same
      // line is read as the line it sits in.
      if (fence && (rest.length === fence[0].length || rest.charAt(fence[0].length) === '\n')) {
        blocks.push({
          type: 'code',
          language: group(fence, 1),
          text: group(fence, 2).replace(/\n$/, ''),
        })
        i += fence[0].split('\n').length
        continue
      }
    }
    if (!inQuote && line.startsWith('>>> ')) {
      const rest = [line.slice(4), ...lines.slice(i + 1)]
      blocks.push({ type: 'quote', toEnd: true, children: readBlocks(rest, true) })
      break
    }
    if (!inQuote && QUOTE_LINE.test(line)) {
      const quoted: string[] = []
      while (i < lines.length && QUOTE_LINE.test(lineAt(lines, i))) {
        quoted.push(lineAt(lines, i).replace(QUOTE_LINE, ''))
        i++
      }
      blocks.push({ type: 'quote', toEnd: false, children: readBlocks(quoted, true) })
      continue
    }
    const heading = HEADING.exec(line)
    const subtext = SUBTEXT.exec(line)
    const item = listLine(line)
    if (heading) {
      const level = group(heading, 1).length as 1 | 2 | 3
      blocks.push({ type: 'heading', level, children: parseInline(group(heading, 2)) })
    } else if (subtext) {
      blocks.push({ type: 'subtext', children: parseInline(group(subtext, 1)) })
    } else if (item) {
      const read = readList(lines, i, item)
      blocks.push(read.block)
      i = read.next
      continue
    } else {
      blocks.push({ type: 'line', children: line ? parseInline(line) : [] })
    }
    i++
  }
  return blocks
}

/**
 * A message's text, an embed's words or a field's value, as Discord reads it. Blank lines at
 * either end are left out, as Discord leaves them out of a message.
 */
export function parseDiscord(text: string): DiscordBlock[] {
  const lines = text
    .replace(/\r\n?/g, '\n')
    .replace(/^\n+|\n+$/g, '')
    .split('\n')
  return lines.length === 1 && lines[0] === '' ? [] : readBlocks(lines, false)
}
