<script setup lang="ts">
// One Discord embed, drawn as Discord draws it: a bar of its color down its side, the author with
// their picture, the title and its link, the words, the fields (side by side three to a row where
// they ask to be, as Discord sets them), the small picture in the corner, the large one across,
// and the footer with its picture and time. Its words are drawn through KitDiscordPreview, by the
// same `names`. The bar's color is the embed's own, set from its data, as a role's is in a
// mention; an embed with none takes `accentColor`, the bot's own in the server, or the edge color.
//
// A picture's URL is Discord's, which may be one no browser shows (`attachment://file.png`), so
// `picture` turns one into what to draw, with what it shows; a web address it doesn't know is
// drawn as it is, and anything else is left out.
import { computed } from 'vue'
import {
  colorHex,
  isWebAddress,
  type KitDiscordEmbed,
  type KitDiscordEmbedField,
  type KitDiscordPicture,
} from '../discord/embed'
import { formatTime, type KitDiscordNames } from '../discord/tokens'
import KitDiscordPreview from './KitDiscordPreview.vue'

const props = withDefaults(
  defineProps<{
    embed: KitDiscordEmbed
    /** What the mentions in its words name, and how its time is shown. */
    names?: KitDiscordNames
    /** The bar's color where the embed has none: the bot's accent in the server, as Discord's number. */
    accentColor?: number
    /** A picture's URL as a browser shows it, with what it shows. */
    picture?: (url: string) => KitDiscordPicture | undefined
  }>(),
  { names: () => ({}), accentColor: undefined, picture: undefined },
)

/** How much of its row a field takes. */
type Share = 'whole' | 'half' | 'third'

function shown(url: string | undefined): KitDiscordPicture | undefined {
  if (!url) {
    return undefined
  }
  return props.picture?.(url) ?? (isWebAddress(url) ? { src: url } : undefined)
}

// Discord sets inline fields side by side, up to three to a row, sharing it equally, and every
// other field across the whole embed.
function layOut(
  fields: readonly KitDiscordEmbedField[],
): (KitDiscordEmbedField & { share: Share })[] {
  const rows: KitDiscordEmbedField[][] = []
  for (const field of fields) {
    const row = rows.at(-1)
    if (field.inline && row?.[0]?.inline && row.length < 3) {
      row.push(field)
    } else {
      rows.push([field])
    }
  }
  const SHARES: Record<number, Share> = { 1: 'whole', 2: 'half', 3: 'third' }
  return rows.flatMap((row) =>
    row.map((field) => ({ ...field, share: SHARES[row.length] ?? 'whole' })),
  )
}

const bar = computed(() => colorHex(props.embed.color) || colorHex(props.accentColor))
const title = computed(() => props.embed.title?.trim() ?? '')
const fields = computed(() => layOut(props.embed.fields ?? []))
const time = computed(() => {
  const at = props.embed.timestamp ? new Date(props.embed.timestamp) : null
  if (!at || Number.isNaN(at.getTime())) {
    return null
  }
  const unix = Math.floor(at.getTime() / 1000)
  return { text: formatTime(unix, 'f', props.names), datetime: at.toISOString() }
})
const authorIcon = computed(() => shown(props.embed.author?.icon_url))
const footerIcon = computed(() => shown(props.embed.footer?.icon_url))
const thumbnail = computed(() => shown(props.embed.thumbnail?.url))
const image = computed(() => shown(props.embed.image?.url))
const footerText = computed(() => props.embed.footer?.text.trim() ?? '')
// A link opens beside the page, which keeps what is being written.
const NEW_TAB = { target: '_blank', rel: 'noreferrer noopener' } as const
</script>

<template>
  <div class="kit-discord-embed" :style="bar ? { borderInlineStartColor: bar } : undefined">
    <div class="kit-discord-embed__main">
      <div class="kit-discord-embed__words">
        <p v-if="embed.author?.name" class="kit-discord-embed__author">
          <img v-if="authorIcon" class="kit-discord-embed__icon" :src="authorIcon.src" alt="" />
          <a v-if="isWebAddress(embed.author.url)" :href="embed.author.url" v-bind="NEW_TAB">{{
            embed.author.name
          }}</a>
          <span v-else>{{ embed.author.name }}</span>
        </p>
        <p v-if="title" class="kit-discord-embed__title">
          <!-- eslint-disable-next-line vuejs-accessibility/anchor-has-content -- KitDiscordPreview draws the title's words inside it -->
          <a v-if="isWebAddress(embed.url)" :href="embed.url" v-bind="NEW_TAB">
            <KitDiscordPreview :text="title" inline />
          </a>
          <KitDiscordPreview v-else :text="title" inline />
        </p>
        <KitDiscordPreview v-if="embed.description" :text="embed.description" :names="names" />
        <dl v-if="fields.length" class="kit-discord-embed__fields">
          <div
            v-for="(field, at) in fields"
            :key="at"
            class="kit-discord-embed__field"
            :class="`kit-discord-embed__field--${field.share}`"
          >
            <dt class="kit-discord-embed__field-name">
              <KitDiscordPreview :text="field.name" inline />
            </dt>
            <dd class="kit-discord-embed__field-value">
              <KitDiscordPreview :text="field.value" :names="names" />
            </dd>
          </div>
        </dl>
      </div>
      <img
        v-if="thumbnail"
        class="kit-discord-embed__thumbnail"
        :src="thumbnail.src"
        :width="thumbnail.width"
        :height="thumbnail.height"
        :alt="thumbnail.alt ?? ''"
      />
    </div>
    <img
      v-if="image"
      class="kit-discord-embed__image"
      :src="image.src"
      :width="image.width"
      :height="image.height"
      :alt="image.alt ?? ''"
    />
    <p v-if="footerText || time" class="kit-discord-embed__footer">
      <img v-if="footerIcon" class="kit-discord-embed__icon" :src="footerIcon.src" alt="" />
      <span v-if="footerText">{{ footerText }}</span>
      <span v-if="footerText && time" aria-hidden="true">•</span>
      <time v-if="time" :datetime="time.datetime">{{ time.text }}</time>
    </p>
  </div>
</template>

<style>
@layer kit {
  /* Discord draws an embed at most 520 px wide, with a 4 px bar of its color down its side. */
  .kit-discord-embed {
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    gap: var(--kit-space-xs);
    min-width: 0;
    max-width: 32.5rem;
    padding: var(--kit-space-sm) var(--kit-space-md) var(--kit-space-md) var(--kit-space-sm);
    border-inline-start: var(--kit-space-2xs) solid var(--kit-control-border);
    border-radius: var(--kit-radius-sm);
    background: var(--kit-surface-sunken);
    color: var(--kit-text);
    font-size: var(--kit-text-size-sm);
    line-height: var(--kit-line-height-prose);
  }

  .kit-discord-embed__main {
    display: flex;
    gap: var(--kit-space-md);
  }

  .kit-discord-embed__words {
    display: flex;
    flex: 1;
    flex-direction: column;
    gap: var(--kit-space-2xs);
    min-width: 0;
    container-type: inline-size;
  }

  .kit-discord-embed__author,
  .kit-discord-embed__title,
  .kit-discord-embed__footer {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--kit-space-xs);
    margin: 0;
  }

  .kit-discord-embed__author,
  .kit-discord-embed__title {
    font-weight: var(--kit-font-weight-strong);
  }

  .kit-discord-embed__title {
    font-size: var(--kit-text-size-base);
  }

  .kit-discord-embed a {
    color: var(--kit-accent);
  }

  .kit-discord-embed__icon {
    width: 1.5rem;
    height: 1.5rem;
    border-radius: var(--kit-radius-full);
    object-fit: cover;
  }

  .kit-discord-embed__fields {
    display: grid;
    grid-template-columns: repeat(6, minmax(0, 1fr));
    gap: var(--kit-space-xs) var(--kit-space-sm);
    margin: var(--kit-space-xs) 0 0;
  }

  .kit-discord-embed__field {
    grid-column: span 6;
    min-width: 0;
  }

  .kit-discord-embed__field--half {
    grid-column: span 3;
  }

  .kit-discord-embed__field--third {
    grid-column: span 2;
  }

  /* In an embed as narrow as a phone draws one, fields that would share a row each take a row
     of their own, so their words aren't broken a few letters to a line. */
  @container (width < 20rem) {
    .kit-discord-embed__field--half,
    .kit-discord-embed__field--third {
      grid-column: span 6;
    }
  }

  .kit-discord-embed__field-name {
    font-weight: var(--kit-font-weight-strong);
  }

  .kit-discord-embed__field-value {
    margin: 0;
  }

  /* Discord fits a thumbnail in 80 px, and a picture in 300 px of height. */
  .kit-discord-embed__thumbnail {
    flex: none;
    width: auto;
    max-width: 5rem;
    height: auto;
    max-height: 5rem;
    border-radius: var(--kit-radius-sm);
  }

  .kit-discord-embed__image {
    width: auto;
    max-width: 100%;
    height: auto;
    max-height: 18.75rem;
    border-radius: var(--kit-radius-sm);
  }

  .kit-discord-embed__footer {
    color: var(--kit-text-muted);
    font-size: var(--kit-text-size-xs);
  }
}
</style>
