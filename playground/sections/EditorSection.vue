<script setup lang="ts">
// KitMarkdownEditor in each dialect and profile, loaded on first use from the package's `/editor`
// entry as an app loads it, each beside the Markdown it stores; and KitDiscordPreview drawing the
// Discord message as Discord will, by the same names the editor shows its mentions by.
import { defineAsyncComponent, ref } from 'vue'
import { KitDiscordPreview, KitFormField, KitPagePanel } from '@jwill89/shared-components-vue'
import type { KitDiscordNames } from '@jwill89/shared-components-vue'
import type { KitDiscordSuggestion } from '@jwill89/shared-components-vue/editor'

const KitMarkdownEditor = defineAsyncComponent(() =>
  import('@jwill89/shared-components-vue/editor').then((m) => m.KitMarkdownEditor),
)

/** A drawn emoji to stand in for a server's own: a round face in one hue, as an SVG data URL. */
function emoji(hue: number): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><circle cx="8" cy="8" r="7" fill="hsl(${String(hue)} 70% 55%)"/><circle cx="5.5" cy="6.5" r="1" fill="#000"/><circle cx="10.5" cy="6.5" r="1" fill="#000"/></svg>`
  return `data:image/svg+xml,${encodeURIComponent(svg)}`
}

const about = ref(
  '## The oak shelf\n\nBy the window, with the **atlases** on the bottom row and *paperbacks* two deep above.\n\n- Signed copies on the left\n- Loans come back to the top\n\nSee [the lending rules](https://example.com/rules).',
)

const announcement = ref(
  '# Book club\nThis month: **The Left Hand of Darkness**, __chapters 1 to 6__.\nWe meet <t:1795467600:F>, that is <t:1795467600:R>, in <#3>.\n-# Hosted by <@1> for <@&9>.\n||The ending is not what you think.||',
)
const title = ref('**Book club** this month')
const footer = ref('Posted by the shelf bot')

const names: KitDiscordNames = {
  members: { 1: 'Sam', 2: 'Sasha' },
  roles: { 9: { name: 'Readers', color: 0x3366cc } },
  channels: { 3: 'book-club', 4: 'general' },
  emoji: { 5: emoji(45) },
}

const server: KitDiscordSuggestion[] = [
  { kind: 'member', id: '1', name: 'Sam' },
  { kind: 'member', id: '2', name: 'Sasha' },
  { kind: 'role', id: '9', name: 'Readers', color: 0x3366cc },
  { kind: 'channel', id: '3', name: 'book-club' },
  { kind: 'channel', id: '4', name: 'general' },
  { kind: 'emoji', id: '5', name: 'grin', image: emoji(45) },
  { kind: 'emoji', id: '', name: 'books', text: '📚' },
  { kind: 'command', id: '6', name: 'lend' },
]

/** What the server holds that matches, as an app's own search would answer. */
function suggest(kind: KitDiscordSuggestion['kind'], query: string): KitDiscordSuggestion[] {
  const typed = query.toLowerCase()
  return server.filter((item) => item.kind === kind && item.name.toLowerCase().startsWith(typed))
}
</script>

<template>
  <KitPagePanel id="editor" class="playground-section" title="Markdown">
    <h3>KitMarkdownEditor, CommonMark</h3>
    <p class="playground-note">
      For an app’s own pages. Markdown typed straight in takes its form as it is typed.
    </p>
    <div class="editor-pair">
      <KitFormField
        v-slot="field"
        label="About the shelf"
        hint="What a visitor reads on the shelf’s page."
        group
      >
        <KitMarkdownEditor v-model="about" v-bind="field" :limit="500" />
      </KitFormField>
      <figure class="editor-stored">
        <figcaption>What it stores</figcaption>
        <pre data-testid="about-markdown">{{ about }}</pre>
      </figure>
    </div>

    <h3>KitMarkdownEditor, Discord, and KitDiscordPreview</h3>
    <p class="playground-note">
      For what a bot posts. <kbd>@</kbd>, <kbd>#</kbd>, <kbd>:</kbd> and <kbd>/</kbd> suggest a
      member or role, a channel, an emoji and a command; the preview draws it as Discord will.
    </p>
    <div class="editor-pair">
      <KitFormField v-slot="field" label="Announcement" group>
        <KitMarkdownEditor
          v-model="announcement"
          v-bind="field"
          dialect="discord"
          :names="names"
          :suggest="suggest"
          :limit="2000"
        />
      </KitFormField>
      <figure class="editor-stored">
        <figcaption>What it stores</figcaption>
        <pre data-testid="announcement-markdown">{{ announcement }}</pre>
      </figure>
    </div>
    <figure class="editor-preview">
      <figcaption>As Discord will show it</figcaption>
      <KitDiscordPreview :text="announcement" :names="names" />
    </figure>

    <h3>A title and a footer</h3>
    <p class="playground-note">
      A title takes marks only, on one line; a footer takes no Markdown at all.
    </p>
    <div class="editor-pair">
      <KitFormField v-slot="field" label="Embed title" group>
        <KitMarkdownEditor
          v-model="title"
          v-bind="field"
          dialect="discord"
          profile="inline"
          :limit="256"
        />
      </KitFormField>
      <KitFormField v-slot="field" label="Embed footer" group>
        <KitMarkdownEditor
          v-model="footer"
          v-bind="field"
          dialect="discord"
          profile="plain"
          :limit="2048"
        />
      </KitFormField>
    </div>
    <p class="editor-title-preview">
      Title as Discord shows it: <KitDiscordPreview :text="title" inline />
    </p>
  </KitPagePanel>
</template>

<style scoped>
.editor-pair {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 18rem), 1fr));
  gap: var(--kit-space-md);
  align-items: start;
}

.editor-stored,
.editor-preview {
  min-width: 0;
  margin: 0;
}

.editor-stored figcaption,
.editor-preview figcaption {
  margin-block-end: var(--kit-space-2xs);
  font-weight: var(--kit-font-weight-strong);
}

.editor-stored pre {
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

.editor-preview {
  margin-block-start: var(--kit-space-md);
  padding: var(--kit-space-sm) var(--kit-space-md);
  border-radius: var(--kit-radius-md);
  background: var(--kit-surface-raised);
}

.editor-title-preview {
  margin-block-start: var(--kit-space-sm);
}
</style>
