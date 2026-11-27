import { afterEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import KitCopyButton from '../components/KitCopyButton.vue'
import { announce } from '../composables/useAnnouncer'
import { copyText } from '../composables/clipboard'
import { axeFindings, kept, unmountKept } from './helpers'

vi.mock(import('../composables/useAnnouncer'), async (original) => ({
  ...(await original()),
  announce: vi.fn(),
}))

/** A clipboard that takes what it is given, or refuses it. */
function clipboard(refuses = false): {
  writeText: ReturnType<typeof vi.fn>
  write: ReturnType<typeof vi.fn>
} {
  const answer = (): Promise<void> =>
    refuses ? Promise.reject(new DOMException('Denied', 'NotAllowedError')) : Promise.resolve()
  const stub = { writeText: vi.fn(answer), write: vi.fn(answer) }
  Object.defineProperty(navigator, 'clipboard', { value: stub, configurable: true })
  return stub
}

class StubClipboardItem {
  constructor(readonly items: Record<string, Blob>) {}
}

afterEach(() => {
  unmountKept()
  Reflect.deleteProperty(navigator, 'clipboard')
  vi.unstubAllGlobals()
  vi.useRealTimers()
  vi.mocked(announce).mockClear()
})

describe('copyText', () => {
  it('copies the text alone, and answers that it did', async () => {
    const stub = clipboard()
    expect(await copyText('https://example.test/book/1')).toBe(true)
    expect(stub.writeText).toHaveBeenCalledWith('https://example.test/book/1')
  })

  it('copies markup beside the text where it is given', async () => {
    const stub = clipboard()
    vi.stubGlobal('ClipboardItem', StubClipboardItem)
    expect(await copyText('Austen, Emma.', '<i>Emma</i>')).toBe(true)
    const [items] = stub.write.mock.calls[0] as [StubClipboardItem[]]
    expect(Object.keys(items[0]?.items ?? {})).toEqual(['text/plain', 'text/html'])
    expect(await items[0]?.items['text/html']?.text()).toBe('<i>Emma</i>')
  })

  it('answers false, never throwing, where the browser refuses or has no clipboard', async () => {
    clipboard(true)
    expect(await copyText('x')).toBe(false)
    Reflect.deleteProperty(navigator, 'clipboard')
    expect('clipboard' in navigator).toBe(false)
    expect(await copyText('x')).toBe(false)
  })
})

describe('KitCopyButton', () => {
  it('copies, says so in its words and to a screen reader, then goes back', async () => {
    const stub = clipboard()
    const wrapper = kept(
      mount(KitCopyButton, {
        props: { text: () => 'https://example.test/1' },
        slots: { default: 'Copy the link' },
        attachTo: document.body,
      }),
    )
    expect(wrapper.text()).toBe('Copy the link')
    expect(wrapper.find('[data-glyph="copy"]').exists()).toBe(true)
    expect(await axeFindings(wrapper)).toEqual([])

    // Only the timers the button keeps, after axe, which keeps its own.
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    await wrapper.trigger('click')
    await flushPromises()
    expect(stub.writeText).toHaveBeenCalledWith('https://example.test/1')
    expect(wrapper.text()).toBe('Copied')
    expect(announce).toHaveBeenCalledWith('Copied.', 'polite')
    expect(wrapper.emitted('copied')).toEqual([[true]])
    await vi.advanceTimersByTimeAsync(2000)
    expect(wrapper.text()).toBe('Copy the link')
  })

  it('says it couldn’t copy, and what to do instead, where the browser refuses', async () => {
    clipboard(true)
    const wrapper = kept(
      mount(KitCopyButton, {
        props: { text: 'Austen, Emma.', failedHint: 'Select the citation and copy it by hand.' },
        slots: { default: 'Copy the citation' },
      }),
    )
    await wrapper.trigger('click')
    await flushPromises()
    expect(wrapper.text()).toBe('Couldn’t copy')
    expect(announce).toHaveBeenCalledWith(
      'Couldn’t copy. Select the citation and copy it by hand.',
      'assertive',
    )
    expect(wrapper.emitted('copied')).toEqual([[false]])
  })
})
