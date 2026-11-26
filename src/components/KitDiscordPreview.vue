<script setup lang="ts">
// Discord's Markdown, drawn as Discord draws it, for a preview of what a bot will post: its
// marks, underline and spoilers among them, its headings, subtext, quotes, lists and code, and
// its mentions, emoji and times by the names the app gives (`names`), a role's with a dot of the
// role's color. `inline` reads marks only and joins the lines, as Discord does in an embed's
// title or a field's name, where links and mentions are left as written.
//
// It reads the text with the same grammar the editor's Discord dialect uses, so the two agree,
// and makes only the elements here: what anyone typed can never become markup of its own.
import { computed, h, type VNodeChild } from 'vue'
import {
  parseDiscord,
  parseInline,
  type DiscordBlock,
  type DiscordInline,
} from '../discord/grammar'
import { showToken, type KitDiscordNames } from '../discord/tokens'

const props = withDefaults(
  defineProps<{
    /** The text, in Discord's Markdown. */
    text: string
    /** What its mentions, channels, roles and emoji name, and how its times are shown. */
    names?: KitDiscordNames
    /** Whether it reads marks only, on one line: an embed's title, a field's name. */
    inline?: boolean
  }>(),
  { names: () => ({}), inline: false },
)

const MARK_TAGS = { bold: 'strong', italic: 'em', underline: 'u', strike: 's' } as const

function renderToken(node: Extract<DiscordInline, { type: 'token' }>): VNodeChild {
  const shown = showToken(node.token, props.names, node.raw)
  if (shown.image) {
    return h('img', { class: 'kit-discord-preview__emoji', src: shown.image, alt: shown.text })
  }
  if (shown.datetime) {
    return h('time', { class: 'kit-discord-preview__time', datetime: shown.datetime }, shown.text)
  }
  if (!shown.mention) {
    return shown.text
  }
  // The dot takes its color from an attribute, which a content security policy that refuses
  // inline styles still allows.
  const dot = shown.color
    ? h('svg', { class: 'kit-discord-preview__dot', viewBox: '0 0 2 2', 'aria-hidden': 'true' }, [
        h('circle', { cx: 1, cy: 1, r: 1, fill: shown.color }),
      ])
    : null
  return h('span', { class: 'kit-discord-preview__mention' }, [dot, shown.text])
}

function renderInline(nodes: readonly DiscordInline[]): VNodeChild[] {
  return nodes.map((node): VNodeChild => {
    switch (node.type) {
      case 'text':
        return node.text
      case 'code':
        return h('code', { class: 'kit-discord-preview__code' }, node.text)
      case 'spoiler':
        return h('span', { class: 'kit-discord-preview__spoiler' }, [
          h('span', { class: 'kit-discord-preview__hidden' }, 'Spoiler: '),
          ...renderInline(node.children),
        ])
      case 'link':
        return h(
          'a',
          {
            class: 'kit-discord-preview__link',
            href: node.href,
            title: node.title,
            target: '_blank',
            rel: 'noreferrer noopener',
          },
          renderInline(node.children),
        )
      case 'token':
        return renderToken(node)
      default:
        return h(MARK_TAGS[node.type], renderInline(node.children))
    }
  })
}

function renderBlocks(blocks: readonly DiscordBlock[]): VNodeChild[] {
  return blocks.map((block): VNodeChild => {
    switch (block.type) {
      case 'line':
        return h(
          'div',
          { class: 'kit-discord-preview__line' },
          block.children.length ? renderInline(block.children) : h('br'),
        )
      case 'heading':
        return h(
          'div',
          {
            class: ['kit-discord-preview__heading', `kit-discord-preview__heading--${block.level}`],
          },
          renderInline(block.children),
        )
      case 'subtext':
        return h('div', { class: 'kit-discord-preview__subtext' }, renderInline(block.children))
      case 'quote':
        return h(
          'blockquote',
          { class: 'kit-discord-preview__quote' },
          renderBlocks(block.children),
        )
      case 'list':
        return h(
          block.ordered ? 'ol' : 'ul',
          { class: 'kit-discord-preview__list', start: block.ordered ? block.start : undefined },
          block.items.map((item) => h('li', renderBlocks(item))),
        )
      case 'code':
        return h('pre', { class: 'kit-discord-preview__code-block' }, [h('code', block.text)])
    }
  })
}

const Body = computed(() =>
  props.inline
    ? () => renderInline(parseInline(props.text.replace(/\s*\n\s*/g, ' '), true))
    : () => renderBlocks(parseDiscord(props.text)),
)
</script>

<template>
  <component
    :is="inline ? 'span' : 'div'"
    class="kit-discord-preview"
    :class="{ 'is-inline': inline }"
  >
    <component :is="Body" />
  </component>
</template>

<style>
@layer kit {
  /* Positioned, so the words hidden for a screen reader stay inside it in a scroller. */
  .kit-discord-preview {
    position: relative;
    min-width: 0;
    line-height: var(--kit-line-height-prose);
    overflow-wrap: anywhere;
  }

  .kit-discord-preview__heading {
    margin-block: var(--kit-space-xs) var(--kit-space-2xs);
    font-family: var(--kit-font-heading);
    font-weight: var(--kit-font-weight-strong);
    line-height: var(--kit-line-height-heading);
  }

  .kit-discord-preview__heading--1 {
    font-size: var(--kit-text-size-xl);
  }

  .kit-discord-preview__heading--2 {
    font-size: var(--kit-text-size-lg);
  }

  .kit-discord-preview__heading--3 {
    font-size: var(--kit-text-size-md);
  }

  .kit-discord-preview__subtext {
    color: var(--kit-text-muted);
    font-size: var(--kit-text-size-sm);
  }

  .kit-discord-preview__quote {
    margin: 0;
    padding-inline-start: var(--kit-space-sm);
    border-inline-start: var(--kit-space-2xs) solid var(--kit-control-border);
  }

  .kit-discord-preview__list {
    margin: 0;
    padding-inline-start: var(--kit-space-lg);
  }

  /* Code and a spoiler are edged as well as washed, so they show inside an embed, whose own
     surface is the wash's. */
  .kit-discord-preview__code,
  .kit-discord-preview__code-block {
    border: var(--kit-control-border-width) solid var(--kit-control-border);
    border-radius: var(--kit-radius-sm);
    background: var(--kit-surface-sunken);
    font-family: var(--kit-font-code);
    font-size: 0.875em;
  }

  .kit-discord-preview__code {
    padding: 0 var(--kit-space-2xs);
  }

  .kit-discord-preview__code-block {
    margin: var(--kit-space-2xs) 0;
    padding: var(--kit-space-xs) var(--kit-space-sm);
    overflow-x: auto;
    white-space: pre-wrap;
  }

  .kit-discord-preview__link {
    color: var(--kit-accent);
  }

  /* A mention reads in the accent, as Discord marks one out from the words around it. */
  .kit-discord-preview__mention {
    color: var(--kit-accent);
    font-weight: var(--kit-font-weight-strong);
    white-space: nowrap;
  }

  .kit-discord-preview__dot {
    width: 0.6em;
    height: 0.6em;
    margin-inline-end: var(--kit-space-2xs);
  }

  .kit-discord-preview__emoji {
    width: 1.375em;
    height: 1.375em;
    vertical-align: bottom;
    object-fit: contain;
  }

  /* Discord hides a spoiler until it is pressed; a preview shows its words, on a wash that
     says what they are, and tells a screen reader in words. */
  .kit-discord-preview__spoiler {
    padding: 0 var(--kit-space-2xs);
    border: var(--kit-control-border-width) dashed var(--kit-control-border);
    border-radius: var(--kit-radius-sm);
    background: var(--kit-surface-sunken);
  }

  .kit-discord-preview__hidden {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
  }
}
</style>
