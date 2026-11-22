// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { parseDiscord } from '../discord/grammar'
import { oracle, ours } from './discordOracle'

// Each text, read by the kit's grammar and by Discord's own parser, means the same.
const TEXTS: Record<string, string[]> = {
  marks: [
    '**b** *i* __u__ ~~s~~ ||sp|| `c`',
    '**a *b* c** *a **b** c* ***a***',
    '_a_b a_b_ x__a__b c__d__ snake_case_name',
    'a**b** e||f|| g~~h~~ un*believ*able',
    '*a * ~~ a ~~ _ d _ e',
    '~~**a**~~ __**a**__ ||**a**|| **__a__** *__a__* __*ui*__',
    '***bi*** ___a___ _*a*_ ***a* b**',
    '||a | b|| x ||c|d|| |||a|||',
    'a * b * c',
  ],
  code: [
    '`a` ``a`b`` ` a ` x`y',
    '```js\ncode\n```',
    '```\ncode```',
    '```code```',
    '```\na\n\nb\n```',
    'a ``b`` c',
  ],
  escapes: [
    '\\*a\\* \\_b\\_ \\|\\|c\\|\\| \\# \\<@1> \\\\ \\~~d~~ \\`e\\`',
    '\\- a\n\\> b\n\\-# c\n1\\. e\n\\>>> f',
    'a\\b \\',
  ],
  links: [
    '[a](https://x.y) [a](http://x.y "t") [a](x.y) [**b**](https://x.y)',
    'https://x.y/p). <https://x.y> www.x.com',
    '[a b](https://x.y/a_b) **[a](https://x.y)** [https://x.y](https://x.y)',
    'see https://x.y/a_b_c, then **https://x.y**',
  ],
  tokens: [
    '<@123> <@!123> <@&456> <#789> <:smile:111> <a:wave:222>',
    '<t:1700000000:R> <t:1> <t:1:Z> </cmd sub:333> </a:1>',
    '@everyone @here <id:customize> <id:browse> <id:bad> <@123',
    '😀 a@everyone',
  ],
  lines: [
    'a\nb\n\n\nc',
    '# H1\nline\n- a\nc\n> q\nmore\n>>> rest\nof it',
    '-# small\n#### four\n---\n1. one\n2. two\n  - deep',
    '# **a** <@1>\n#  two spaces\n####\n# \na\n#a\n## b ##',
    '> \n> a\n>\n> b',
    'a\n>>> b\n\nc',
    '>>>no space\n>c',
    '- # a\n> # b\n> - c\n> -# d',
  ],
  lists: [
    '- a\n  - b\n    - c\n- d',
    '1. a\n1. b\n3. c',
    '- a\n\n- b\n-a\n - one space',
    '- a\n  b',
    '* star\n+ plus\n1) paren',
    '- a\n> b\n- c',
    '3. three\n4. four',
  ],
}

describe('the Discord grammar', () => {
  for (const [kind, texts] of Object.entries(TEXTS)) {
    it(`reads ${kind} as Discord does`, () => {
      for (const text of texts) {
        expect({ text, read: ours(parseDiscord(text)) }).toEqual({ text, read: oracle(text) })
      }
    })
  }

  it('reads nothing in an empty text, and leaves out blank lines at either end', () => {
    expect(parseDiscord('')).toEqual([])
    expect(parseDiscord('\n\n')).toEqual([])
    expect(ours(parseDiscord('\n\na\n\n'))).toEqual(['p("a")'])
  })
})
