// Discord's own parser, @discord/markdown-wasm, as the specs' oracle: what a text means to
// Discord, written as a short outline that the kit's own reading of the same text is written in
// too, so a spec compares the two. Only the specs load it, on Node, which compiles the
// WebAssembly itself on first use.
import { parse } from '@discord/markdown-wasm'
import type { DiscordBlock, DiscordInline } from '../discord/grammar'

/** A node of Discord's tree, as far as the outline reads it. */
interface Node {
  type: string
  value?: unknown
}

/** A value of Discord's tree as words: its ids come as big integers. */
function words(value: unknown): string {
  return typeof value === 'string' || typeof value === 'number' || typeof value === 'bigint'
    ? String(value)
    : JSON.stringify(value)
}

/** An address as a browser holds it, so `https://x.y` and `https://x.y/` read the same. */
function address(url: string): string {
  try {
    return new URL(url).href
  } catch {
    return url
  }
}

/** Joins the runs of plain text the outline makes, and folds a mark inside the same mark. */
function tidy(parts: string[]): string[] {
  const out: string[] = []
  for (const part of parts) {
    const last = out.at(-1)
    if (part.startsWith('"') && last?.startsWith('"')) {
      out[out.length - 1] = JSON.stringify(
        (JSON.parse(last) as string) + (JSON.parse(part) as string),
      )
    } else {
      out.push(part)
    }
  }
  return out
}

function mark(name: string, children: string[]): string[] {
  // A mark inside the same mark looks as one: `_*a*_` is italic once.
  if (children.length === 1 && children[0]?.startsWith(`${name}(`)) {
    return children
  }
  return [`${name}(${children.join(' ')})`]
}

const MARKS: Record<string, string> = {
  bold: 'b',
  italic: 'i',
  underline: 'u',
  strikethrough: 's',
  strike: 's',
  spoiler: 'sp',
}

function discordInline(nodes: readonly Node[]): string[] {
  return tidy(
    nodes.flatMap((node): string[] => {
      const value = node.value as Record<string, unknown> & Node[]
      switch (node.type) {
        case 'text':
          return [JSON.stringify(node.value)]
        case 'bold':
        case 'italic':
        case 'underline':
        case 'strikethrough':
          return mark(MARKS[node.type] ?? node.type, discordInline(value))
        case 'spoiler':
          return mark('sp', discordInline(value.content as Node[]))
        case 'code':
          return [`c${JSON.stringify(node.value)}`]
        case 'code_block':
          return [`c${JSON.stringify((value.content as string).replace(/\n$/, ''))}`]
        case 'link': {
          const text = value.text as Node[] | undefined
          const url = address(value.url as string)
          return [text ? `a<${url}>(${discordInline(text).join(' ')})` : `a<${url}>`]
        }
        case 'emoji': {
          const emoji = value.value as Record<string, unknown> | string
          if (value.type === 'unicode') {
            return [JSON.stringify(emoji)]
          }
          const custom = emoji as Record<string, unknown>
          return [`emoji:${words(custom.name)}:${words(custom.id)}${custom.animated ? ':a' : ''}`]
        }
        case 'timestamp':
          return [`t:${words(value.value)}${value.style ? `:${words(value.style)}` : ''}`]
        case 'mention': {
          const of = value.value as Record<string, unknown> | string | undefined
          switch (value.type) {
            case 'command': {
              const command = of as Record<string, unknown>
              return [`/${words(command.name)}:${words(command.id)}`]
            }
            case 'static':
              return [`page:${String((of as Record<string, unknown>).type)}`]
            case 'everyone':
            case 'here':
              return [`@${value.type}`]
            default:
              return [`${words(value.type)}:${words(of)}`]
          }
        }
        default:
          return [`?${node.type}`]
      }
    }),
  )
}

function discordBlocks(nodes: readonly Node[]): string[] {
  return nodes.map((node): string => {
    const value = node.value as Record<string, unknown> & Node[]
    switch (node.type) {
      case 'paragraph': {
        // A fence on lines of its own is a block: Discord holds it in a line of its own.
        const only = value.length === 1 ? value[0] : undefined
        if (only?.type === 'code_block') {
          const block = only.value as Record<string, unknown>
          const text = (block.content as string).replace(/\n$/, '')
          return `code${block.language ? `:${words(block.language)}` : ''}${JSON.stringify(text)}`
        }
        return `p(${discordInline(value).join(' ')})`
      }
      case 'empty':
        return 'p()'
      case 'heading':
        return `h${words(value.level)}(${discordInline(value.content as Node[]).join(' ')})`
      case 'subtext':
        return `sub(${discordInline(value.content as Node[]).join(' ')})`
      case 'quote':
        return `quote[${discordBlocks(value).join(', ')}]`
      case 'list': {
        const items = (value.items as { content: Node[] }[]).map(
          (item) => `li[${discordBlocks(item.content).join(', ')}]`,
        )
        const kind = value.type === 'ordered' ? `ol${words(value.value)}` : 'ul'
        return `${kind}[${items.join(', ')}]`
      }
      default:
        return `?${node.type}`
    }
  })
}

/** What Discord makes of a text, as an outline. */
export function oracle(text: string): string[] {
  return discordBlocks(parse(text))
}

function ourToken(node: Extract<DiscordInline, { type: 'token' }>): string {
  const token = node.token
  switch (token.kind) {
    case 'member':
      return `user:${token.id}`
    case 'role':
      return `role:${token.id}`
    case 'channel':
      return `channel:${token.id}`
    case 'emoji':
      return `emoji:${token.name}:${token.id}${token.animated ? ':a' : ''}`
    case 'time':
      return `t:${String(token.unix)}${token.style ? `:${token.style}` : ''}`
    case 'command':
      return `/${token.name}:${token.id}`
    case 'page':
      return `page:${token.page}`
    default:
      return `@${token.kind}`
  }
}

export function ourInline(nodes: readonly DiscordInline[]): string[] {
  return tidy(
    nodes.flatMap((node): string[] => {
      switch (node.type) {
        case 'text':
          return [JSON.stringify(node.text)]
        case 'code':
          return [`c${JSON.stringify(node.text)}`]
        case 'link':
          return [
            node.form === 'masked'
              ? `a<${address(node.href)}>(${ourInline(node.children).join(' ')})`
              : `a<${address(node.href)}>`,
          ]
        case 'token':
          return [ourToken(node)]
        default:
          return mark(MARKS[node.type] ?? node.type, ourInline(node.children))
      }
    }),
  )
}

/** What the kit's grammar makes of a text, in the oracle's outline. */
export function ours(blocks: readonly DiscordBlock[]): string[] {
  return blocks.map((block): string => {
    switch (block.type) {
      case 'line':
        return `p(${ourInline(block.children).join(' ')})`
      case 'heading':
        return `h${words(block.level)}(${ourInline(block.children).join(' ')})`
      case 'subtext':
        return `sub(${ourInline(block.children).join(' ')})`
      case 'quote':
        return `quote[${ours(block.children).join(', ')}]`
      case 'list': {
        const items = block.items.map((item) => `li[${ours(item).join(', ')}]`)
        return `${block.ordered ? `ol${words(block.start)}` : 'ul'}[${items.join(', ')}]`
      }
      case 'code':
        return `code${block.language ? `:${block.language}` : ''}${JSON.stringify(block.text)}`
    }
  })
}

// The flat outline: each block's words as runs, each run with the marks over it, so two texts
// that nest the same marks in another order read alike. The editor's document is written in it
// too, to hold what the editor writes to what it shows.

const FLAT_MARKS: Record<string, string> = {
  bold: 'b',
  italic: 'i',
  underline: 'u',
  strike: 's',
  strikethrough: 's',
  spoiler: 'sp',
  code: 'code',
}

interface Run {
  marks: string[]
  link?: string
  text?: string
  token?: string
}

function runWords(run: Run): string {
  const marks = [...new Set(run.marks)].sort().join('+')
  const link = run.link ? `<${run.link}>` : ''
  const body = run.token ?? JSON.stringify(run.text ?? '')
  return `${marks}${link}${marks || link ? ':' : ''}${body}`
}

/** A run with its spaces at either end out of its marks, which they look the same without. */
function hugged(run: Run): Run[] {
  // A bare address's words are the address as Discord holds it.
  if (run.link && run.text && address(run.text) === run.link) {
    return [{ ...run, text: run.link }]
  }
  if (run.text === undefined || run.marks.includes('code')) {
    return [run]
  }
  const [, lead = '', core = '', trail = ''] = /^(\s*)([\s\S]*?)(\s*)$/.exec(run.text) ?? []
  const bare = { marks: [], link: run.link }
  return [
    { ...bare, text: lead },
    { ...run, text: core },
    { ...bare, text: trail },
  ]
}

function joinRuns(runs: Run[]): string[] {
  const out: Run[] = []
  for (const run of runs.flatMap(hugged)) {
    const last = out.at(-1)
    if (
      last &&
      run.text !== undefined &&
      last.text !== undefined &&
      last.link === run.link &&
      [...new Set(last.marks)].sort().join() === [...new Set(run.marks)].sort().join()
    ) {
      last.text += run.text
    } else if (run.token !== undefined || run.text) {
      out.push({ ...run, marks: [...run.marks] })
    }
  }
  return out.map(runWords)
}

function discordRuns(nodes: readonly Node[], marks: string[], link?: string): Run[] {
  return nodes.flatMap((node): Run[] => {
    const value = node.value as Record<string, unknown> & Node[]
    switch (node.type) {
      case 'text':
        return [{ marks, link, text: node.value as string }]
      case 'bold':
      case 'italic':
      case 'underline':
      case 'strikethrough':
        return discordRuns(value, [...marks, FLAT_MARKS[node.type] ?? node.type], link)
      case 'spoiler':
        return discordRuns(value.content as Node[], [...marks, 'sp'], link)
      case 'code':
        return [{ marks: [...marks, 'code'], link, text: node.value as string }]
      case 'code_block':
        return [{ marks: [...marks, 'code'], link, text: value.content as string }]
      case 'link': {
        const url = address(value.url as string)
        const text = value.text as Node[] | undefined
        return text
          ? discordRuns(text, marks, url)
          : [{ marks, link: url, text: value.url as string }]
      }
      case 'emoji':
        return value.type === 'unicode'
          ? [{ marks, link, text: value.value as string }]
          : [{ marks, link, token: discordInline([node]).join('') }]
      default:
        return [{ marks, link, token: discordInline([node]).join('') }]
    }
  })
}

function discordFlat(nodes: readonly Node[]): string[] {
  return nodes.map((node): string => {
    const value = node.value as Record<string, unknown> & Node[]
    switch (node.type) {
      case 'paragraph': {
        const only = value.length === 1 ? value[0] : undefined
        if (only?.type === 'code_block') {
          return discordBlocks([node])[0] ?? ''
        }
        return `p(${joinRuns(discordRuns(value, [])).join(' ')})`
      }
      case 'empty':
        return 'p()'
      case 'heading':
        return `h${words(value.level)}(${joinRuns(discordRuns(value.content as Node[], [])).join(' ')})`
      case 'subtext':
        return `sub(${joinRuns(discordRuns(value.content as Node[], [])).join(' ')})`
      case 'quote':
        return `quote[${discordFlat(value).join(', ')}]`
      case 'list': {
        const items = (value.items as { content: Node[] }[]).map(
          (item) => `li[${discordFlat(item.content).join(', ')}]`,
        )
        return `${value.type === 'ordered' ? `ol${words(value.value)}` : 'ul'}[${items.join(', ')}]`
      }
      default:
        return `?${node.type}`
    }
  })
}

/** What Discord makes of a text, as a flat outline. */
export function oracleFlat(text: string): string[] {
  return discordFlat(parse(text))
}

/** A document of the editor's, as JSON, in the flat outline. */
interface DocNode {
  type?: string
  text?: string
  attrs?: Record<string, unknown>
  marks?: { type: string; attrs?: Record<string, unknown> }[]
  content?: DocNode[]
}

function docRuns(nodes: readonly DocNode[]): Run[] {
  return nodes.flatMap((node): Run[] => {
    const marks = (node.marks ?? [])
      .filter((m) => m.type !== 'link')
      .map((m) => FLAT_MARKS[m.type] ?? m.type)
    const href = (node.marks ?? []).find((m) => m.type === 'link')?.attrs?.href
    const link = typeof href === 'string' ? address(href) : undefined
    if (node.type === 'discordToken') {
      const raw = words(node.attrs?.raw ?? '')
      return [{ marks, link, token: oracle(raw)[0]?.replace(/^p\((.*)\)$/, '$1') ?? raw }]
    }
    return [{ marks, link, text: node.text ?? '' }]
  })
}

function docFlat(nodes: readonly DocNode[]): string[] {
  return nodes.map((node): string => {
    const runs = joinRuns(docRuns(node.content ?? [])).join(' ')
    switch (node.type) {
      case 'paragraph':
        return `p(${runs})`
      case 'heading':
        return `h${words(node.attrs?.level)}(${runs})`
      case 'subtext':
        return `sub(${runs})`
      case 'blockquote':
        return `quote[${docFlat(node.content ?? []).join(', ')}]`
      case 'bulletList':
      case 'orderedList': {
        const items = (node.content ?? []).map(
          (item) => `li[${docFlat(item.content ?? []).join(', ')}]`,
        )
        return `${node.type === 'orderedList' ? `ol${words(node.attrs?.start ?? 1)}` : 'ul'}[${items.join(', ')}]`
      }
      case 'codeBlock': {
        const text = (node.content ?? []).map((part) => part.text ?? '').join('')
        const language = node.attrs?.language ? `:${words(node.attrs.language)}` : ''
        return `code${language}${JSON.stringify(text)}`
      }
      default:
        return `?${String(node.type)}`
    }
  })
}

/** The editor's document in the flat outline, blank lines at either end left out. */
export function documentFlat(doc: DocNode): string[] {
  const blocks = docFlat(doc.content ?? [])
  while (blocks[0] === 'p()') {
    blocks.shift()
  }
  while (blocks.at(-1) === 'p()') {
    blocks.pop()
  }
  return blocks
}
