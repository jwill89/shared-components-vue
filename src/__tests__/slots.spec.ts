import { describe, expect, it } from 'vitest'
import { Comment, Fragment, Text, createVNode, h } from 'vue'
import { filled } from '../components/slots'

describe('filled', () => {
  it('is false for a slot that wasn’t passed, or that draws nothing', () => {
    expect(filled(undefined)).toBe(false)
    expect(filled(() => [])).toBe(false)
    // What a false v-if leaves behind.
    expect(filled(() => [createVNode(Comment, null, 'v-if')])).toBe(false)
    expect(filled(() => [createVNode(Text, null, '  ')])).toBe(false)
    expect(filled(() => [createVNode(Fragment, null, [createVNode(Comment)])])).toBe(false)
    expect(filled(() => [createVNode(Fragment, null, null)])).toBe(false)
    expect(filled(() => null)).toBe(false)
  })

  it('is true for a slot that draws an element, a component or words', () => {
    expect(filled(() => [h('button', 'Reload')])).toBe(true)
    expect(filled(() => [createVNode(Text, null, 'Reload')])).toBe(true)
    expect(filled(() => [createVNode(Fragment, null, [createVNode(Comment), h('span')])])).toBe(
      true,
    )
    expect(filled(() => 'words')).toBe(true)
  })

  it('hands a scoped slot its props', () => {
    expect(filled(({ on }: { on: boolean }) => (on ? [h('b')] : []), { on: true })).toBe(true)
    expect(filled(({ on }: { on: boolean }) => (on ? [h('b')] : []), { on: false })).toBe(false)
  })
})
