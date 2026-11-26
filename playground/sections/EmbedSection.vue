<script setup lang="ts">
// KitDiscordEmbedEditor on one embed, in Discord's own shape, beside KitDiscordMessagePreview
// drawing the message it belongs to as Discord will; and KitColorField on its own. The pictures
// are the playground's: uploads named as Discord names them (`attachment://…`), which the preview
// is shown as drawn pictures, as an app shows its own uploads.
import { computed, defineAsyncComponent, ref } from 'vue'
import {
  DISCORD_COLORS,
  KitColorField,
  KitDiscordMessagePreview,
  KitFormField,
  KitPagePanel,
} from '@jwill89/shared-components-vue'
import type {
  KitDiscordEmbed,
  KitDiscordNames,
  KitDiscordPicture,
} from '@jwill89/shared-components-vue'

const KitDiscordEmbedEditor = defineAsyncComponent(() =>
  import('@jwill89/shared-components-vue/editor').then((m) => m.KitDiscordEmbedEditor),
)

/** A drawn picture standing in for an upload: a shape in one hue, as an SVG data URL. */
function drawn(hue: number): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360"><rect width="100%" height="100%" fill="hsl(${String(hue)} 45% 35%)"/><circle cx="50%" cy="50%" r="30%" fill="hsl(${String(hue)} 60% 70%)"/></svg>`
  return `data:image/svg+xml,${encodeURIComponent(svg)}`
}

const uploads: Record<string, KitDiscordPicture> = {
  'attachment://shelf.png': {
    src: drawn(30),
    alt: 'The oak shelf by the window',
    width: 640,
    height: 360,
  },
  'attachment://atlas.png': {
    src: drawn(200),
    alt: 'The atlas on its side',
    width: 640,
    height: 360,
  },
}

const pictures = [
  { url: 'attachment://shelf.png', label: 'The oak shelf by the window' },
  { url: 'attachment://atlas.png', label: 'The atlas on its side' },
]

/** An upload as the browser shows it. */
function picture(url: string): KitDiscordPicture | undefined {
  return uploads[url]
}

const names: KitDiscordNames = { channels: { 3: 'book-club' }, members: { 1: 'Sam' } }

const embed = ref<KitDiscordEmbed>({
  title: 'Book club: **The Left Hand of Darkness**',
  url: 'https://example.com/club',
  description: 'We meet in <#3> on Friday. Bring the book, and a snack if you like.',
  color: 0x5865f2,
  author: { name: 'The shelf bot' },
  image: { url: 'attachment://shelf.png' },
  fields: [
    { name: 'When', value: 'Friday, 7 pm', inline: true },
    { name: 'Where', value: 'Upstairs', inline: true },
  ],
  footer: { text: 'Posted by <@1>' },
})

const json = computed(() => JSON.stringify(embed.value, null, 2))

const shelfColor = ref('#1abc9c')
</script>

<template>
  <KitPagePanel id="embeds" class="playground-section" title="Discord embeds">
    <h3>KitDiscordEmbedEditor and KitDiscordMessagePreview</h3>
    <p class="playground-note">
      One embed in the shape Discord’s API takes, drawn as Discord will draw the message.
    </p>
    <div class="embed-pair">
      <KitDiscordEmbedEditor
        v-model="embed"
        label="the embed"
        :pictures="pictures"
        :names="names"
      />
      <div class="embed-side">
        <figure class="embed-figure">
          <figcaption>As Discord will show it</figcaption>
          <KitDiscordMessagePreview
            sender="Shelf bot"
            content="This week’s **book club**:"
            :embeds="[embed]"
            :names="names"
            :picture="picture"
          />
        </figure>
        <figure class="embed-figure">
          <figcaption>What it posts</figcaption>
          <pre data-testid="embed-json">{{ json }}</pre>
        </figure>
      </div>
    </div>

    <h3>KitColorField</h3>
    <p class="playground-note">
      A color with its swatch and hex, picked from an area, a hue or a preset.
    </p>
    <KitFormField v-slot="field" label="Shelf color">
      <KitColorField
        v-model="shelfColor"
        v-bind="field"
        :presets="DISCORD_COLORS"
        presets-label="Discord’s colors"
      />
    </KitFormField>
  </KitPagePanel>
</template>

<style scoped>
.embed-pair {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 20rem), 1fr));
  gap: var(--kit-space-lg);
  align-items: start;
}

.embed-side {
  display: flex;
  flex-direction: column;
  gap: var(--kit-space-md);
  min-width: 0;
}

.embed-figure {
  min-width: 0;
  margin: 0;
}

.embed-figure figcaption {
  margin-block-end: var(--kit-space-xs);
  font-weight: var(--kit-font-weight-strong);
}

.embed-figure pre {
  margin: 0;
  padding: var(--kit-space-xs) var(--kit-space-sm);
  overflow-x: auto;
  border-radius: var(--kit-radius-md);
  background: var(--kit-surface-sunken);
  font-family: var(--kit-font-code);
  font-size: var(--kit-text-size-sm);
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}
</style>
