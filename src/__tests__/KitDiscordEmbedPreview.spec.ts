import { afterEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import KitDiscordEmbedPreview from '../components/KitDiscordEmbedPreview.vue'
import KitDiscordMessagePreview from '../components/KitDiscordMessagePreview.vue'
import type { KitDiscordEmbed, KitDiscordPicture } from '../discord/embed'
import { axeFindings, kept, unmountKept } from './helpers'

afterEach(unmountKept)

const NAMES = { channels: { 3: 'book-club' }, locale: 'en-US', timeZone: 'UTC' }

/** An app's own pictures, as it turns Discord's URLs into ones a browser shows. */
function picture(url: string): KitDiscordPicture | undefined {
  return url === 'attachment://shelf.png'
    ? { src: 'https://cdn.example/shelf.png', alt: 'The oak shelf', width: 800, height: 600 }
    : undefined
}

const EMBED: KitDiscordEmbed = {
  title: '**Book** club',
  url: 'https://example.com/club',
  description: 'Meet in <#3>.',
  color: 0x5865f2,
  author: {
    name: 'The shelf bot',
    url: 'https://example.com',
    icon_url: 'https://example.com/bot.png',
  },
  footer: { text: 'Posted weekly', icon_url: 'attachment://shelf.png' },
  timestamp: '2026-11-27T19:30:00.000Z',
  thumbnail: { url: 'https://example.com/atlas.png' },
  image: { url: 'attachment://shelf.png' },
  fields: [
    { name: 'When', value: 'Friday', inline: true },
    { name: 'Where', value: 'Upstairs', inline: true },
    { name: 'Bring', value: 'The book', inline: true },
    { name: 'Also', value: 'Snacks', inline: true },
    { name: 'Notes', value: 'None' },
  ],
}

describe('KitDiscordEmbedPreview', () => {
  it('draws every part of an embed as Discord does, with nothing axe finds', async () => {
    const wrapper = kept(
      mount(KitDiscordEmbedPreview, {
        props: { embed: EMBED, names: NAMES, picture },
        attachTo: document.body,
      }),
    )
    expect(wrapper.attributes('style')).toContain('border-inline-start-color: rgb(88, 101, 242)')
    const author = wrapper.get('.kit-discord-embed__author')
    expect(author.get('a').attributes()).toMatchObject({
      href: 'https://example.com',
      target: '_blank',
    })
    expect(author.text()).toBe('The shelf bot')
    const title = wrapper.get('.kit-discord-embed__title a')
    expect(title.attributes('href')).toBe('https://example.com/club')
    expect(title.get('strong').text()).toBe('Book')
    expect(wrapper.get('.kit-discord-preview__mention').text()).toBe('#book-club')
    expect(
      wrapper
        .findAll('.kit-discord-embed__field')
        .map((f) => [f.get('dt').text(), f.classes().at(-1)]),
    ).toEqual([
      ['When', 'kit-discord-embed__field--third'],
      ['Where', 'kit-discord-embed__field--third'],
      ['Bring', 'kit-discord-embed__field--third'],
      ['Also', 'kit-discord-embed__field--whole'],
      ['Notes', 'kit-discord-embed__field--whole'],
    ])
    expect(wrapper.get('.kit-discord-embed__thumbnail').attributes('src')).toBe(
      'https://example.com/atlas.png',
    )
    expect(wrapper.get('.kit-discord-embed__image').attributes()).toMatchObject({
      src: 'https://cdn.example/shelf.png',
      alt: 'The oak shelf',
      width: '800',
    })
    const footer = wrapper.get('.kit-discord-embed__footer')
    expect(footer.get('img').attributes('src')).toBe('https://cdn.example/shelf.png')
    expect(footer.findAll('span, time').map((part) => part.text())).toEqual([
      'Posted weekly',
      '•',
      'November 27, 2026 at 7:30 PM',
    ])
    expect(footer.get('time').attributes('datetime')).toBe('2026-11-27T19:30:00.000Z')
    expect(await axeFindings(wrapper)).toEqual([])
  })

  it('draws a web address as it is, leaves out one no browser shows, and takes the accent for a bar', () => {
    const wrapper = kept(
      mount(KitDiscordEmbedPreview, {
        props: {
          embed: {
            title: 'Plain',
            url: 'ftp://example.com',
            image: { url: 'attachment://shelf.png' },
            thumbnail: { url: 'https://example.com/t.png' },
            author: { name: 'Bot' },
            timestamp: 'never',
          },
          accentColor: 0xe91e63,
        },
      }),
    )
    expect(wrapper.attributes('style')).toContain('border-inline-start-color: rgb(233, 30, 99)')
    expect(wrapper.find('.kit-discord-embed__title a').exists()).toBe(false)
    expect(wrapper.find('.kit-discord-embed__author a').exists()).toBe(false)
    expect(wrapper.find('.kit-discord-embed__image').exists()).toBe(false)
    expect(wrapper.get('.kit-discord-embed__thumbnail').attributes('src')).toBe(
      'https://example.com/t.png',
    )
    expect(wrapper.find('.kit-discord-embed__footer').exists()).toBe(false)
    const plain = kept(mount(KitDiscordEmbedPreview, { props: { embed: { description: 'x' } } }))
    expect(plain.attributes('style')).toBeUndefined()
  })
})

describe('KitDiscordMessagePreview', () => {
  it('draws the sender, the text, each embed and the pictures no embed shows', async () => {
    const wrapper = kept(
      mount(KitDiscordMessagePreview, {
        props: {
          sender: 'shelf bot',
          avatar: 'https://example.com/bot.png',
          content: 'New **this week**',
          embeds: [EMBED, { title: 'Second' }],
          attachments: [{ src: 'https://cdn.example/extra.png', alt: 'An extra shelf' }],
          names: NAMES,
          picture,
        },
        attachTo: document.body,
      }),
    )
    expect(wrapper.get('.kit-discord-message__name').text()).toBe('shelf bot')
    expect(wrapper.get('.kit-discord-message__tag').text()).toBe('App')
    expect(wrapper.get('.kit-discord-message__avatar-initial').text()).toBe('S')
    expect(wrapper.findAll('.kit-discord-embed')).toHaveLength(2)
    expect(wrapper.get('.kit-discord-message__attachment').attributes('alt')).toBe('An extra shelf')
    expect(wrapper.find('.kit-discord-message__empty').exists()).toBe(false)
    expect(await axeFindings(wrapper)).toEqual([])
  })

  it('says when there is nothing to show, and tags no person as an app', () => {
    const wrapper = kept(
      mount(KitDiscordMessagePreview, {
        props: { sender: ' ', app: false, emptyText: 'Write something first.' },
      }),
    )
    expect(wrapper.get('.kit-discord-message__empty').text()).toBe('Write something first.')
    expect(wrapper.find('.kit-discord-message__tag').exists()).toBe(false)
    expect(wrapper.get('.kit-discord-message__avatar-initial').text()).toBe('?')
  })

  it('draws its link buttons under it, each opening its link in a new tab', async () => {
    const wrapper = kept(
      mount(KitDiscordMessagePreview, {
        props: {
          sender: 'shelf bot',
          components: [
            {
              type: 1,
              components: [
                {
                  type: 2,
                  style: 5,
                  label: 'Read more',
                  url: 'https://example.com/news',
                  emoji: { name: '📖' },
                },
                {
                  type: 2,
                  style: 5,
                  url: 'https://example.com/shelf',
                  emoji: { name: 'shelf', id: '42' },
                },
                { type: 2, style: 5, label: 'Still being written', url: '' },
                { type: 2, style: 5, url: 'https://example.com/odd', emoji: { id: '7' } },
              ],
            },
            { type: 1, components: [] },
          ],
          names: { emoji: { '42': 'https://cdn.example/shelf.png' } },
        },
        attachTo: document.body,
      }),
    )
    expect(wrapper.find('.kit-discord-message__empty').exists()).toBe(false)
    expect(wrapper.findAll('.kit-discord-message__buttons')).toHaveLength(1)
    const links = wrapper.findAll('a.kit-discord-message__button')
    expect(links.map((link) => link.text())).toEqual(['📖Read more', '', ':emoji:'])
    expect(links[0]?.attributes()).toMatchObject({
      href: 'https://example.com/news',
      target: '_blank',
      rel: 'noreferrer noopener',
    })
    expect(links[1]?.get('img').attributes()).toMatchObject({
      src: 'https://cdn.example/shelf.png',
      alt: ':shelf:',
    })
    expect(wrapper.get('span.kit-discord-message__button').text()).toBe('Still being written')
    expect(await axeFindings(wrapper)).toEqual([])

    await wrapper.setProps({ names: {} })
    expect(links[1]?.text()).toBe(':shelf:')
  })
})
