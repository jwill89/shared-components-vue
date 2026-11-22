// Discord's tokens: the mentions, emoji, times and links to a server's own pages that Discord
// writes between angle brackets (`<@123>`, `<t:1700000000:R>`), and the two words it reads as
// mentions of everyone. A token holds an id, never a name, so what it shows comes from the names
// the app gives: the members, roles and channels of its own server. KitDiscordPreview and the
// editor's Discord dialect both show a token through here, so the two always agree.

/** Something looked up by its id: a Map, or a plain object of ids. */
export type KitDiscordLookup<T> = ReadonlyMap<string, T> | Readonly<Record<string, T>>

/** A role as a mention shows it. */
export interface KitDiscordRole {
  name: string
  /** Discord's number for the role's color; 0, or none, for no color. */
  color?: number
}

/** What the tokens in a text name, and how its times are shown. */
export interface KitDiscordNames {
  /** Each member's name as the server shows it, by their id. */
  members?: KitDiscordLookup<string>
  /** Each role, by its id. */
  roles?: KitDiscordLookup<KitDiscordRole>
  /** Each channel's name, by its id. */
  channels?: KitDiscordLookup<string>
  /** Each custom emoji's picture, by the emoji's id; without one, its name shows between colons. */
  emoji?: KitDiscordLookup<string>
  /** The locale times are written in: the reader's own, unless one is given. */
  locale?: string
  /** The zone times are shown in: the reader's own, unless one is given. */
  timeZone?: string
  /** The moment a relative time counts from: now, unless one is given. */
  now?: Date
}

/** How Discord shows a time: each of its styles, by the letter a token names it with. */
export type KitDiscordTimeStyle = 't' | 'T' | 'd' | 'D' | 'f' | 'F' | 'R'

/** Discord's links to a server's own pages, by what Discord calls each. */
export const SERVER_PAGES = {
  customize: 'Channels & Roles',
  browse: 'Browse Channels',
  guide: 'Server Guide',
  'linked-roles': 'Linked Roles',
} as const satisfies Readonly<Record<string, string>>

export type DiscordServerPage = keyof typeof SERVER_PAGES

/** A token, read. */
export type DiscordToken =
  | { kind: 'member'; id: string }
  | { kind: 'role'; id: string }
  | { kind: 'channel'; id: string }
  | { kind: 'emoji'; id: string; name: string; animated: boolean }
  | { kind: 'time'; unix: number; style: KitDiscordTimeStyle | undefined }
  | { kind: 'command'; id: string; name: string }
  | { kind: 'page'; page: DiscordServerPage }
  | { kind: 'everyone' | 'here' }

/**
 * A token at the start of `text`, as Discord reads one: `<@id>` or `<@!id>` a member, `<@&id>` a
 * role, `<#id>` a channel, `<:name:id>` or `<a:name:id>` an emoji, `<t:unix>` or `<t:unix:R>` a
 * time, `</name:id>` a command (up to three words), `<id:browse>` a server's page, and
 * `@everyone` or `@here`.
 */
export const TOKEN =
  /^(?:<(?:@!?(\d+)|@&(\d+)|#(\d+)|(a?):(\w+):(\d+)|t:(-?\d+)(?::([tTdDfFR]))?|\/([^\s:<>]+(?: [^\s:<>]+){0,2}):(\d+)|id:(customize|browse|guide|linked-roles))>|@(everyone|here)(?![\w]))/

/** Reads a token: `raw` is exactly one, as TOKEN matches it; anything else is null. */
export function readToken(raw: string): DiscordToken | null {
  const found = TOKEN.exec(raw)
  if (found?.[0] !== raw) {
    return null
  }
  const [, member, role, channel, animated, emoji, emojiId, unix, style, command, commandId] = found
  const page = found[11]
  const everyone = found[12]
  if (member) {
    return { kind: 'member', id: member }
  }
  if (role) {
    return { kind: 'role', id: role }
  }
  if (channel) {
    return { kind: 'channel', id: channel }
  }
  if (emoji && emojiId) {
    return { kind: 'emoji', id: emojiId, name: emoji, animated: animated === 'a' }
  }
  if (unix) {
    return { kind: 'time', unix: Number(unix), style: style as KitDiscordTimeStyle | undefined }
  }
  if (command && commandId) {
    return { kind: 'command', id: commandId, name: command }
  }
  if (page) {
    return { kind: 'page', page: page as DiscordServerPage }
  }
  return { kind: everyone === 'here' ? 'here' : 'everyone' }
}

/** The token that names something of the server's: what the editor writes for a choice. */
export function writeToken(token: DiscordToken): string {
  switch (token.kind) {
    case 'member':
      return `<@${token.id}>`
    case 'role':
      return `<@&${token.id}>`
    case 'channel':
      return `<#${token.id}>`
    case 'emoji':
      return `<${token.animated ? 'a' : ''}:${token.name}:${token.id}>`
    case 'time':
      return `<t:${String(token.unix)}${token.style ? `:${token.style}` : ''}>`
    case 'command':
      return `</${token.name}:${token.id}>`
    case 'page':
      return `<id:${token.page}>`
    default:
      return `@${token.kind}`
  }
}

export function lookUp<T>(lookup: KitDiscordLookup<T> | undefined, id: string): T | undefined {
  if (!lookup) {
    return undefined
  }
  if (lookup instanceof Map) {
    return lookup.get(id)
  }
  return Object.hasOwn(lookup, id) ? (lookup as Readonly<Record<string, T>>)[id] : undefined
}

// How Discord writes a time in each of its styles; f, the full one, is what it uses when a time
// names no style.
const shortTime = { hour: 'numeric', minute: '2-digit' } as const
const fullTime: Intl.DateTimeFormatOptions = {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
  ...shortTime,
}
const TIME_STYLES: Record<Exclude<KitDiscordTimeStyle, 'R'>, Intl.DateTimeFormatOptions> = {
  t: shortTime,
  T: { ...shortTime, second: '2-digit' },
  d: { year: 'numeric', month: 'numeric', day: 'numeric' },
  D: { year: 'numeric', month: 'long', day: 'numeric' },
  f: fullTime,
  F: { weekday: 'long', ...fullTime },
}

// The units a relative time counts in, largest first, each with its length in seconds.
const RELATIVE_UNITS: readonly [Intl.RelativeTimeFormatUnit, number][] = [
  ['year', 31536000],
  ['month', 2592000],
  ['day', 86400],
  ['hour', 3600],
  ['minute', 60],
  ['second', 1],
]

/**
 * A moment as Discord shows it in one of its styles: "in 3 hours" for R, "November 22, 2026 at
 * 3:00 PM" for f. Null for a number too large to be a time, which Discord leaves as written.
 */
export function formatTime(
  unix: number,
  style: KitDiscordTimeStyle | undefined,
  names: KitDiscordNames = {},
): string | null {
  const at = new Date(unix * 1000)
  if (Number.isNaN(at.getTime())) {
    return null
  }
  if (style === 'R') {
    const seconds = (at.getTime() - (names.now ?? new Date()).getTime()) / 1000
    const [unit, size] = RELATIVE_UNITS.find(([, length]) => Math.abs(seconds) >= length) ?? [
      'second',
      1,
    ]
    const relative = new Intl.RelativeTimeFormat(names.locale, { numeric: 'auto' })
    return relative.format(Math.round(seconds / size), unit)
  }
  const options = { ...TIME_STYLES[style ?? 'f'], timeZone: names.timeZone }
  return new Intl.DateTimeFormat(names.locale, options).format(at)
}

/** A token as a reader sees it, with what to draw beside or in place of its words. */
export interface ShownToken {
  /** Its words: "@Sam", "#general", "in 2 hours". */
  text: string
  /** Whether it reads as a mention, which the preview and the editor mark as one. */
  mention: boolean
  /** A role's color, as `#rrggbb`, for the dot drawn before its name. */
  color?: string
  /** A custom emoji's picture, when the app gives one; its words are then the picture's text. */
  image?: string
  /** A time's moment, for a `<time>` element's `datetime`. */
  datetime?: string
}

/** A token as it was written, as it shows; words that are no token show as they are. */
export function showRaw(raw: string, names: KitDiscordNames = {}): ShownToken {
  const token = readToken(raw)
  return token ? showToken(token, names, raw) : { text: raw, mention: false }
}

/** A role's color as CSS takes it; none for 0, Discord's "no color". */
export function roleColor(color: number | undefined): string | undefined {
  if (!color || color < 0 || color > 0xffffff) {
    return undefined
  }
  return `#${color.toString(16).padStart(6, '0')}`
}

/**
 * How a token shows, with the app's names: a member, role or channel by its name, a placeholder
 * that says what it is where the app doesn't know the name ("@unknown member"), an emoji by its
 * picture or name, a time as Discord writes it in its style. `raw` is the token as it was
 * written, which a time too large to be one shows as.
 */
export function showToken(
  token: DiscordToken,
  names: KitDiscordNames = {},
  raw = writeToken(token),
): ShownToken {
  switch (token.kind) {
    case 'member':
      return { text: `@${lookUp(names.members, token.id) ?? 'unknown member'}`, mention: true }
    case 'role': {
      const role = lookUp(names.roles, token.id)
      return {
        text: `@${role?.name ?? 'unknown role'}`,
        mention: true,
        color: roleColor(role?.color),
      }
    }
    case 'channel':
      return { text: `#${lookUp(names.channels, token.id) ?? 'unknown channel'}`, mention: true }
    case 'emoji':
      return { text: `:${token.name}:`, mention: false, image: lookUp(names.emoji, token.id) }
    case 'time': {
      const text = formatTime(token.unix, token.style, names)
      return text === null
        ? { text: raw, mention: false }
        : { text, mention: false, datetime: new Date(token.unix * 1000).toISOString() }
    }
    case 'command':
      return { text: `/${token.name}`, mention: true }
    case 'page':
      return { text: SERVER_PAGES[token.page], mention: true }
    default:
      return { text: `@${token.kind}`, mention: true }
  }
}
