<script setup lang="ts">
// A message as Discord will show it from a bot: the bot's picture and name with Discord's App tag,
// the text, each embed as KitDiscordEmbedPreview draws it, and the pictures sent with it that no
// embed shows (`attachments`), and its link buttons (`components`, Discord's rows of them), laid
// out as Discord lays a message out, in the app's own colors. A button with a web address opens
// it in a new tab, as the embeds' links do.
// It shows `emptyText` while there is nothing to show. The names, the accent color and `picture`
// go to every part, so the text and the embeds read alike.
import { computed } from 'vue'
import { AvatarFallback, AvatarImage, AvatarRoot } from 'reka-ui'
import { isWebAddress } from '../discord/embed'
import type {
  KitDiscordActionRow,
  KitDiscordButtonEmoji,
  KitDiscordEmbed,
  KitDiscordPicture,
} from '../discord/embed'
import { lookUp } from '../discord/tokens'
import type { KitDiscordNames } from '../discord/tokens'
import KitGlyph from './KitGlyph.vue'
import KitDiscordEmbedPreview from './KitDiscordEmbedPreview.vue'
import KitDiscordPreview from './KitDiscordPreview.vue'

const props = withDefaults(
  defineProps<{
    /** The sender's name in the server: the bot's. */
    sender: string
    /** The sender's picture; its name's first letter stands in without one. */
    avatar?: string
    /** Whether the sender is an app, which Discord tags beside its name. */
    app?: boolean
    /** The text, in Discord's Markdown. */
    content?: string
    embeds?: readonly KitDiscordEmbed[]
    /** The pictures sent with the message that no embed shows. */
    attachments?: readonly KitDiscordPicture[]
    /** Its rows of link buttons, as Discord's API takes them. */
    components?: readonly KitDiscordActionRow[]
    names?: KitDiscordNames
    /** The bar's color for an embed with none of its own: the bot's accent, as Discord's number. */
    accentColor?: number
    /** A picture's URL as a browser shows it, with what it shows. */
    picture?: (url: string) => KitDiscordPicture | undefined
    /** What shows while the message holds nothing. */
    emptyText?: string
  }>(),
  {
    avatar: undefined,
    app: true,
    content: '',
    embeds: () => [],
    attachments: () => [],
    components: () => [],
    names: () => ({}),
    accentColor: undefined,
    picture: undefined,
    emptyText: 'Nothing to show yet.',
  },
)

const initial = computed(() => Array.from(props.sender.trim())[0]?.toUpperCase() ?? '?')
const rows = computed(() => props.components.filter((row) => row.components.length))
const empty = computed(
  () =>
    !props.content.trim() &&
    !props.embeds.length &&
    !props.attachments.length &&
    !rows.value.length,
)

/** A custom emoji's picture, where the app gives one; a Unicode emoji, or one without, is words. */
function emojiImage(emoji: KitDiscordButtonEmoji): string | undefined {
  return emoji.id ? lookUp(props.names.emoji, emoji.id) : undefined
}

function emojiWords(emoji: KitDiscordButtonEmoji): string {
  return emoji.id ? `:${emoji.name ?? 'emoji'}:` : (emoji.name ?? '')
}

const NEW_TAB = { target: '_blank', rel: 'noreferrer noopener' } as const
</script>

<template>
  <div class="kit-discord-message">
    <!-- The sender's name is written beside it, so the picture needs none of its own. -->
    <AvatarRoot class="kit-discord-message__avatar">
      <AvatarImage v-if="avatar" class="kit-discord-message__avatar-image" :src="avatar" alt="" />
      <AvatarFallback class="kit-discord-message__avatar-initial" aria-hidden="true">
        {{ initial }}
      </AvatarFallback>
    </AvatarRoot>
    <div class="kit-discord-message__body">
      <p class="kit-discord-message__sender">
        <span class="kit-discord-message__name">{{ sender }}</span>
        <span v-if="app" class="kit-discord-message__tag">App</span>
      </p>
      <p v-if="empty" class="kit-discord-message__empty">{{ emptyText }}</p>
      <KitDiscordPreview v-if="content.trim()" :text="content" :names="names" />
      <KitDiscordEmbedPreview
        v-for="(embed, at) in embeds"
        :key="at"
        :embed="embed"
        :names="names"
        :accent-color="accentColor"
        :picture="picture"
      />
      <div v-if="attachments.length" class="kit-discord-message__attachments">
        <img
          v-for="(attachment, at) in attachments"
          :key="at"
          class="kit-discord-message__attachment"
          :src="attachment.src"
          :width="attachment.width"
          :height="attachment.height"
          :alt="attachment.alt ?? ''"
        />
      </div>
      <div
        v-for="(row, at) in rows"
        :key="`row-${String(at)}`"
        class="kit-discord-message__buttons"
      >
        <component
          :is="isWebAddress(button.url) ? 'a' : 'span'"
          v-for="(button, place) in row.components"
          :key="place"
          class="kit-discord-message__button"
          v-bind="isWebAddress(button.url) ? { href: button.url, ...NEW_TAB } : {}"
        >
          <template v-if="button.emoji">
            <img
              v-if="emojiImage(button.emoji)"
              class="kit-discord-message__emoji"
              :src="emojiImage(button.emoji)"
              :alt="emojiWords(button.emoji)"
            />
            <span v-else>{{ emojiWords(button.emoji) }}</span>
          </template>
          <span v-if="button.label">{{ button.label }}</span>
          <KitGlyph name="external" />
        </component>
      </div>
    </div>
  </div>
</template>

<style>
@layer kit {
  .kit-discord-message {
    display: flex;
    align-items: flex-start;
    gap: var(--kit-space-sm);
    min-width: 0;
  }

  .kit-discord-message__avatar {
    box-sizing: border-box;
    display: inline-flex;
    flex: none;
    align-items: center;
    justify-content: center;
    width: 2.5rem;
    height: 2.5rem;
    overflow: hidden;
    border: var(--kit-control-border-width) solid var(--kit-control-border);
    border-radius: var(--kit-radius-full);
    background: var(--kit-surface-sunken);
    color: var(--kit-text);
    font-weight: var(--kit-font-weight-strong);
  }

  .kit-discord-message__avatar-image {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .kit-discord-message__body {
    display: flex;
    flex: 1;
    flex-direction: column;
    gap: var(--kit-space-xs);
    min-width: 0;
  }

  .kit-discord-message__sender {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--kit-space-xs);
    margin: 0;
  }

  .kit-discord-message__name {
    font-weight: var(--kit-font-weight-strong);
  }

  .kit-discord-message__tag {
    padding: 0 var(--kit-space-2xs);
    border-radius: var(--kit-radius-sm);
    background: var(--kit-accent);
    color: var(--kit-on-accent);
    font-size: var(--kit-text-size-xs);
    font-weight: var(--kit-font-weight-strong);
    text-transform: uppercase;
  }

  .kit-discord-message__empty {
    margin: 0;
    color: var(--kit-text-muted);
  }

  .kit-discord-message__attachments {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(min(100%, 10rem), 1fr));
    gap: var(--kit-space-2xs);
    justify-items: start;
    max-width: 32.5rem;
  }

  /* Each row of link buttons, as Discord lays them out: side by side, wrapping on a narrow screen. */
  .kit-discord-message__buttons {
    display: flex;
    flex-wrap: wrap;
    gap: var(--kit-space-xs);
  }

  .kit-discord-message__button {
    box-sizing: border-box;
    display: inline-flex;
    align-items: center;
    gap: var(--kit-space-xs);
    min-height: var(--kit-control-height);
    padding: 0 var(--kit-space-md);
    border: var(--kit-control-border-width) solid var(--kit-control-border);
    border-radius: var(--kit-radius-md);
    background: var(--kit-surface-sunken);
    color: var(--kit-text);
    font-weight: var(--kit-font-weight-strong);
    text-decoration: none;
    overflow-wrap: anywhere;
  }

  a.kit-discord-message__button:hover {
    text-decoration: underline;
  }

  a.kit-discord-message__button:focus-visible {
    outline: var(--kit-focus-ring-width) solid var(--kit-focus-ring);
    outline-offset: var(--kit-focus-ring-offset);
  }

  .kit-discord-message__emoji {
    width: 1.25em;
    height: 1.25em;
    object-fit: contain;
  }

  .kit-discord-message__attachment {
    width: auto;
    max-width: 100%;
    height: auto;
    max-height: 18.75rem;
    border-radius: var(--kit-radius-sm);
  }
}
</style>
