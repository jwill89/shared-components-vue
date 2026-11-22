import { afterEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import KitDiscordPreview from '../components/KitDiscordPreview.vue'
import { formatTime, readToken, roleColor, writeToken } from '../discord/tokens'
import { axeFindings, kept, unmountKept } from './helpers'

afterEach(unmountKept)

function preview(props: { text: string } & Record<string, unknown>) {
  return kept(mount(KitDiscordPreview, { props, attachTo: document.body }))
}

const NOW = new Date('2026-11-22T12:00:00Z')

describe('KitDiscordPreview', () => {
  it('draws a message’s lines as Discord does, with nothing axe finds', async () => {
    const wrapper = preview({
      text: [
        '# Big',
        '-# small print',
        '**b** *i* __u__ ~~s~~ ||secret|| `code`',
        '',
        '> quoted',
        '1. one',
        '2. two',
        '```js',
        'let a = 1',
        '```',
        '[a link](https://x.y "a title")',
        '- a point',
      ].join('\n'),
    })
    expect(wrapper.get('.kit-discord-preview__heading--1').text()).toBe('Big')
    expect(wrapper.get('.kit-discord-preview__subtext').text()).toBe('small print')
    expect(wrapper.get('strong').text()).toBe('b')
    expect(wrapper.get('em').text()).toBe('i')
    expect(wrapper.get('u').text()).toBe('u')
    expect(wrapper.get('s').text()).toBe('s')
    expect(wrapper.get('.kit-discord-preview__spoiler').text()).toBe('Spoiler: secret')
    expect(wrapper.get('.kit-discord-preview__code').text()).toBe('code')
    expect(
      wrapper.findAll('.kit-discord-preview__line').some((line) => line.find('br').exists()),
    ).toBe(true)
    expect(wrapper.get('blockquote').text()).toBe('quoted')
    expect(wrapper.get('ol').attributes('start')).toBe('1')
    expect(wrapper.findAll('ol li').map((item) => item.text())).toEqual(['one', 'two'])
    expect(wrapper.get('ul').attributes('start')).toBeUndefined()
    expect(wrapper.get('pre').text()).toBe('let a = 1')
    const link = wrapper.get('a')
    expect(link.attributes()).toMatchObject({
      href: 'https://x.y',
      title: 'a title',
      target: '_blank',
      rel: 'noreferrer noopener',
    })
    expect(await axeFindings(wrapper)).toEqual([])
  })

  it('names its mentions by the app’s names, and says what it doesn’t know', () => {
    const wrapper = preview({
      text: '<@1> <@2> <@&3> <@&4> <#5> <#6> </ping:7> <id:browse> @here <:wave:8> <:nod:9>',
      names: {
        members: { 1: 'Sam' },
        roles: new Map([['3', { name: 'Staff', color: 0x3366cc }]]),
        channels: { 5: 'general' },
        emoji: { 8: 'https://cdn.example/8.png' },
      },
    })
    expect(wrapper.findAll('.kit-discord-preview__mention').map((m) => m.text())).toEqual([
      '@Sam',
      '@unknown member',
      '@Staff',
      '@unknown role',
      '#general',
      '#unknown channel',
      '/ping',
      'Browse Channels',
      '@here',
    ])
    expect(wrapper.get('.kit-discord-preview__dot circle').attributes('fill')).toBe('#3366cc')
    expect(wrapper.get('.kit-discord-preview__emoji').attributes()).toMatchObject({
      src: 'https://cdn.example/8.png',
      alt: ':wave:',
    })
    expect(wrapper.text()).toContain(':nod:')
  })

  it('shows a time as Discord does, in its style, for each reader', () => {
    const names = { locale: 'en-US', timeZone: 'UTC', now: NOW }
    const wrapper = preview({
      text: '<t:1795521600:R> <t:1795521600:D> <t:1795521600> <t:99999999999999999:f>',
      names,
    })
    const times = wrapper.findAll('time')
    expect(times.map((time) => time.text())).toEqual([
      'in 2 days',
      'November 24, 2026',
      'November 24, 2026 at 12:00 PM',
    ])
    expect(times[0]?.attributes('datetime')).toBe('2026-11-24T12:00:00.000Z')
    expect(wrapper.text()).toContain('<t:99999999999999999:f>')
  })

  it('reads marks only on one line in an embed’s title, leaving links and mentions as written', () => {
    const wrapper = preview({ text: '**Big** news\nfor <@1> at https://x.y', inline: true })
    expect(wrapper.element.tagName).toBe('SPAN')
    expect(wrapper.get('strong').text()).toBe('Big')
    expect(wrapper.text()).toBe('Big news for <@1> at https://x.y')
    expect(wrapper.find('a').exists()).toBe(false)
    expect(wrapper.find('.kit-discord-preview__mention').exists()).toBe(false)
  })

  it('makes no markup of its own from what was typed', () => {
    const wrapper = preview({ text: '<img src=x onerror=alert(1)> <b>not bold</b>' })
    expect(wrapper.find('img').exists()).toBe(false)
    expect(wrapper.find('b').exists()).toBe(false)
    expect(wrapper.text()).toBe('<img src=x onerror=alert(1)> <b>not bold</b>')
  })
})

describe('Discord’s tokens', () => {
  it('read and write each kind of token back as it was', () => {
    for (const raw of [
      '<@1>',
      '<@&2>',
      '<#3>',
      '<:a:4>',
      '<a:b:5>',
      '<t:6>',
      '<t:7:R>',
      '</c d:8>',
      '<id:guide>',
      '@everyone',
    ]) {
      const token = readToken(raw)
      expect(token).not.toBeNull()
      if (token) {
        expect(writeToken(token)).toBe(raw)
      }
    }
    expect(readToken('<@1> and more')).toBeNull()
  })

  it('give a role no color for Discord’s none, and each time style its own words', () => {
    expect(roleColor(0)).toBeUndefined()
    expect(roleColor(0x1000000)).toBeUndefined()
    expect(roleColor(0xff)).toBe('#0000ff')
    const names = { locale: 'en-US', timeZone: 'UTC', now: NOW }
    const at = 1795521600
    expect(
      ['t', 'T', 'd', 'D', 'f', 'F'].map((style) => formatTime(at, style as 'f', names)),
    ).toEqual([
      '12:00 PM',
      '12:00:00 PM',
      '11/24/2026',
      'November 24, 2026',
      'November 24, 2026 at 12:00 PM',
      'Tuesday, November 24, 2026 at 12:00 PM',
    ])
    expect(formatTime(NOW.getTime() / 1000 - 30, 'R', names)).toBe('30 seconds ago')
    expect(formatTime(NOW.getTime() / 1000, 'R', names)).toBe('now')
  })
})
