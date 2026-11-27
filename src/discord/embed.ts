// Discord's embed, the boxed part of a message, in the shape Discord's API takes, so an app posts
// what the editor holds as it is. Every part is optional; the editor leaves out a part with
// nothing in it, as Discord's own clients do. KitDiscordEmbedEditor edits one, and
// KitDiscordEmbedPreview draws one, so the two agree on every part.
import type { KitColorPreset } from '../components/options'
import { roleColor } from './tokens'

/** One of an embed's fields: a short name over a few words, beside its neighbours or not. */
export interface KitDiscordEmbedField {
  name: string
  value: string
  inline?: boolean
}

/** An embed, as Discord's API takes one. */
export interface KitDiscordEmbed {
  title?: string
  /** The words, in Discord's Markdown. */
  description?: string
  /** Where the title leads. */
  url?: string
  /** The moment shown in the footer, as ISO 8601. */
  timestamp?: string
  /** The bar's color, as Discord's number for it. */
  color?: number
  footer?: { text: string; icon_url?: string }
  image?: { url: string }
  thumbnail?: { url: string }
  author?: { name: string; url?: string; icon_url?: string }
  fields?: KitDiscordEmbedField[]
}

/** A picture as a browser shows it: what an app makes of a picture's URL for a preview. */
export interface KitDiscordPicture {
  src: string
  /** What it shows, for a screen reader; Discord's embeds carry none of their own. */
  alt?: string
  width?: number
  height?: number
}

/** A picture an app offers for an embed: its URL, as Discord takes it, and what it shows. */
export interface KitDiscordPictureChoice {
  /** `https://…`, or `attachment://file.png` for one uploaded with the message. */
  url: string
  label: string
}

/** What Discord takes in one embed, in characters. */
export const DISCORD_EMBED_LIMITS = {
  title: 256,
  description: 4096,
  fields: 25,
  fieldName: 256,
  fieldValue: 1024,
  footer: 2048,
  author: 256,
  /** Across the title, words, fields, footer and author of one embed, and of every embed a message holds. */
  total: 6000,
} as const

/** Discord's blurple and its role colors, which a color picker offers for an embed's bar. */
export const DISCORD_COLORS: readonly KitColorPreset[] = [
  { value: '#5865f2', name: 'Blurple' },
  { value: '#1abc9c', name: 'Teal' },
  { value: '#2ecc71', name: 'Green' },
  { value: '#3498db', name: 'Blue' },
  { value: '#9b59b6', name: 'Purple' },
  { value: '#e91e63', name: 'Pink' },
  { value: '#f1c40f', name: 'Yellow' },
  { value: '#e67e22', name: 'Orange' },
  { value: '#e74c3c', name: 'Red' },
  { value: '#95a5a6', name: 'Grey' },
  { value: '#607d8b', name: 'Slate' },
]

/** Words' length as Discord counts it: in code points, so an emoji counts once. */
function length(text: string | undefined): number {
  return Array.from(text ?? '').length
}

/** The characters an embed holds toward Discord's 6,000. */
export function discordEmbedLength(embed: KitDiscordEmbed): number {
  return (
    length(embed.title) +
    length(embed.description) +
    length(embed.footer?.text) +
    length(embed.author?.name) +
    (embed.fields ?? []).reduce((sum, field) => sum + length(field.name) + length(field.value), 0)
  )
}

/** An embed's color as `#rrggbb`, or "" for none: Discord's 0 is no color, as a role's is. */
export function colorHex(color: number | undefined): string {
  return roleColor(color) ?? ''
}

/** A `#rrggbb` as Discord's number for it; none for anything else. */
export function colorNumber(hex: string): number | undefined {
  return /^#[0-9a-f]{6}$/i.test(hex) ? Number.parseInt(hex.slice(1), 16) : undefined
}

/** Whether a picture's URL is one a browser shows as it is. */
export function isWebAddress(url: string | undefined): url is string {
  return /^https?:\/\//i.test(url ?? '')
}

/**
 * An embed with each empty part left out: words with nothing in them, an author or a footer with
 * none of its parts, a picture with no URL, and no fields. A field stays while it is being
 * written, empty or not.
 */
export function tidyEmbed(embed: KitDiscordEmbed): KitDiscordEmbed {
  const out: KitDiscordEmbed = {}
  for (const key of ['title', 'description', 'url', 'timestamp'] as const) {
    if (embed[key]) {
      out[key] = embed[key]
    }
  }
  if (embed.color !== undefined) {
    out.color = embed.color
  }
  const { author, footer } = embed
  if (author && (author.name || author.url || author.icon_url)) {
    out.author = { name: author.name }
    if (author.url) {
      out.author.url = author.url
    }
    if (author.icon_url) {
      out.author.icon_url = author.icon_url
    }
  }
  if (footer && (footer.text || footer.icon_url)) {
    out.footer = { text: footer.text }
    if (footer.icon_url) {
      out.footer.icon_url = footer.icon_url
    }
  }
  if (embed.image?.url) {
    out.image = { url: embed.image.url }
  }
  if (embed.thumbnail?.url) {
    out.thumbnail = { url: embed.thumbnail.url }
  }
  if (embed.fields?.length) {
    out.fields = embed.fields
  }
  return out
}

/** A button's emoji, as Discord's API takes it: a Unicode emoji as its name, or a server's own by its name and id. */
export interface KitDiscordButtonEmoji {
  name?: string
  id?: string
  animated?: boolean
}

/** A link button under a message, as Discord's API takes one: a button of style 5, which opens its URL. */
export interface KitDiscordLinkButton {
  type: 2
  style: 5
  /** Its words; a button needs these, an emoji, or both. */
  label?: string
  url: string
  emoji?: KitDiscordButtonEmoji
}

/** A row of buttons under a message, as Discord's API takes one: an action row. */
export interface KitDiscordActionRow {
  type: 1
  components: KitDiscordLinkButton[]
}

/** What Discord takes in a message's buttons. */
export const DISCORD_BUTTON_LIMITS = {
  /** Characters in a button's words. */
  label: 80,
  /** Characters in its URL. */
  url: 512,
  /** Buttons in a row. */
  perRow: 5,
  /** Rows under a message. */
  rows: 5,
} as const

/** A message's link buttons, row after row, in the order Discord shows them. */
export function linkButtons(
  rows: readonly KitDiscordActionRow[] | undefined,
): KitDiscordLinkButton[] {
  return (rows ?? []).flatMap((row) => row.components)
}

/** Link buttons as a message's rows, five to a row, as Discord lays them out; none for none. */
export function actionRows(buttons: readonly KitDiscordLinkButton[]): KitDiscordActionRow[] {
  const rows: KitDiscordActionRow[] = []
  for (let at = 0; at < buttons.length; at += DISCORD_BUTTON_LIMITS.perRow) {
    rows.push({ type: 1, components: buttons.slice(at, at + DISCORD_BUTTON_LIMITS.perRow) })
  }
  return rows
}

/** A button's emoji as it is typed: the emoji itself, or a server's own as `<:name:id>`. */
export function emojiText(emoji: KitDiscordButtonEmoji | undefined): string {
  if (!emoji) {
    return ''
  }
  return emoji.id
    ? `<${emoji.animated ? 'a' : ''}:${emoji.name ?? ''}:${emoji.id}>`
    : (emoji.name ?? '')
}

/** An emoji as typed, read as Discord's API takes it; none for nothing typed. */
export function readEmoji(text: string): KitDiscordButtonEmoji | undefined {
  const typed = text.trim()
  const own = /^<(a?):(\w+):(\d+)>$/.exec(typed)
  if (own) {
    return { name: own[2], id: own[3], ...(own[1] ? { animated: true } : {}) }
  }
  return typed ? { name: typed } : undefined
}
