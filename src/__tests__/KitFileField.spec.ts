import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'
import { flushPromises } from '@vue/test-utils'
import type { VueWrapper } from '@vue/test-utils'
import KitFileField from '../components/KitFileField.vue'
import { announce } from '../composables/useAnnouncer'
import { axeFindings, field, unmountKept } from './helpers'

vi.mock(import('../composables/useAnnouncer'), async (original) => ({
  ...(await original()),
  announce: vi.fn(),
}))

const pictures = [
  { type: 'image/png', name: 'PNG' },
  { type: 'image/jpeg', name: 'JPEG' },
  { type: '.webp', name: 'WebP' },
]

/** A file of `bytes` bytes. */
function file(name: string, type: string, bytes = 100): File {
  return new File([new Uint8Array(bytes)], name, { type })
}

/** Has the picker hand back `files`, as the device's own picker does once someone chooses. */
async function pick(wrapper: VueWrapper, files: File[]): Promise<void> {
  const input = wrapper.get<HTMLInputElement>('input[type="file"]')
  Object.defineProperty(input.element, 'files', { value: files, configurable: true })
  await input.trigger('change')
}

/** The files listed, as their names. */
function listed(wrapper: VueWrapper): string[] {
  return wrapper.findAll('.kit-file-field__name').map((name) => name.text())
}

beforeEach(() => {
  let made = 0
  vi.spyOn(URL, 'createObjectURL').mockImplementation(() => {
    made += 1
    return `blob:picture-${String(made)}`
  })
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined)
})

afterEach(() => {
  unmountKept()
  vi.restoreAllMocks()
  vi.mocked(announce).mockClear()
})

describe('KitFileField', () => {
  it('is a group named by its caption, its button described by what it takes', async () => {
    const { wrapper } = field(
      KitFileField,
      [],
      { label: 'Pictures', group: true },
      { accept: pictures, maxSize: 10 * 1024 * 1024, multiple: true, maxFiles: 8 },
    )
    const group = wrapper.get('[role="group"]')
    expect(group.attributes('aria-labelledby')).toBe(
      wrapper.get('.kit-form-field__label').attributes('id'),
    )
    const button = wrapper.get('button')
    expect(button.text()).toBe('Choose files')
    const limits = wrapper.get(`[id="${String(button.attributes('aria-describedby'))}"]`)
    expect(limits.text()).toBe('PNG, JPEG, or WebP, up to 10 MB each. Up to 8 files.')
    const input = wrapper.get('input[type="file"]')
    expect(input.attributes('accept')).toBe('image/png,image/jpeg,.webp')
    expect(input.attributes('multiple')).toBeDefined()
    expect(input.attributes('hidden')).toBeDefined()
    expect(await axeFindings(wrapper)).toEqual([])
  })

  it('opens the picker from its button, and adds what is chosen, saying so', async () => {
    const { wrapper, state } = field(
      KitFileField,
      [],
      { label: 'Pictures', group: true },
      { accept: pictures, multiple: true },
    )
    const input = wrapper.get<HTMLInputElement>('input[type="file"]').element
    const opened = vi.spyOn(input, 'click').mockImplementation(() => undefined)
    await wrapper.get('button').trigger('click')
    expect(opened).toHaveBeenCalledOnce()

    const cover = file('cover.png', 'image/png')
    const spine = file('spine.WEBP', '')
    await pick(wrapper, [cover, spine])
    expect(state.value).toEqual([cover, spine])
    expect(announce).toHaveBeenCalledWith('cover.png and spine.WEBP added.', 'polite')
    await nextTick()
    expect(listed(wrapper)).toEqual(['cover.png', 'spine.WEBP'])
    expect(wrapper.findAll('.kit-file-field__remove').map((b) => b.text())).toEqual([
      'Remove cover.png',
      'Remove spine.WEBP',
    ])
    expect(await axeFindings(wrapper)).toEqual([])
  })

  it('refuses a file of the wrong kind, one too large, and more than fit, each in words', async () => {
    const { wrapper, state } = field(
      KitFileField,
      [],
      { label: 'Pictures', group: true },
      { accept: pictures, maxSize: 1024, multiple: true, maxFiles: 2 },
    )
    const kept = file('a.png', 'image/png')
    await pick(wrapper, [
      file('notes.txt', 'text/plain'),
      file('huge.jpg', 'image/jpeg', 2048),
      kept,
      file('b.png', 'image/png'),
      file('c.png', 'image/png'),
    ])
    expect(state.value).toHaveLength(2)
    expect(state.value).toContain(kept)
    const refused = wrapper.get('[role="alert"]')
    expect(refused.text()).toBe(
      'notes.txt isn’t a PNG, JPEG, or WebP file. ' +
        'huge.jpg is 2 kB; the most a file can be is 1 kB. ' +
        'Only 2 files fit, so 1 was left out.',
    )
  })

  it('replaces its one file with the next chosen, where it holds one', async () => {
    const first = file('first.png', 'image/png')
    const { wrapper, state } = field(KitFileField, [first], { label: 'Cover', group: true })
    expect(wrapper.get('button').text()).toBe('Choose a file')
    const second = file('second.png', 'image/png')
    await pick(wrapper, [second])
    expect(state.value).toEqual([second])
  })

  it('takes files dropped on its zone, which is a button that opens the picker too', async () => {
    const { wrapper, state } = field(
      KitFileField,
      [],
      { label: 'Pictures', group: true },
      { drop: true, multiple: true },
    )
    const zone = wrapper.get('.kit-file-field__zone')
    expect(zone.element.tagName).toBe('BUTTON')
    expect(zone.text()).toBe('Choose files, or drop them here')
    await zone.trigger('dragover')
    expect(zone.classes()).toContain('is-dropping')
    const dropped = file('dropped.png', 'image/png')
    await zone.trigger('drop', { dataTransfer: { files: [dropped] } })
    expect(state.value).toEqual([dropped])
    expect(zone.classes()).not.toContain('is-dropping')
  })

  it('takes a file out by its Remove, moving focus to the next, and at the last back to the button', async () => {
    const files = [file('a.png', 'image/png'), file('b.png', 'image/png')]
    const { wrapper, state } = field(
      KitFileField,
      files,
      { label: 'Pictures', group: true },
      { multiple: true },
    )
    await wrapper.findAll('.kit-file-field__remove')[0]?.trigger('click')
    await flushPromises()
    expect(state.value).toEqual([files[1]])
    expect(announce).toHaveBeenCalledWith('a.png removed.', 'polite')
    expect(document.activeElement?.textContent.trim()).toBe('Remove b.png')
    await wrapper.get('.kit-file-field__remove').trigger('click')
    await flushPromises()
    expect(state.value).toEqual([])
    expect(document.activeElement).toBe(wrapper.get('.kit-file-field__choose').element)
  })

  it('shows each picture small, with an address it gives back once the picture goes', async () => {
    const cover = file('cover.png', 'image/png')
    const { wrapper } = field(
      KitFileField,
      [cover, file('notes.pdf', 'application/pdf')],
      { label: 'Files', group: true },
      { multiple: true, previews: true },
    )
    const shown = wrapper.findAll('img')
    expect(shown).toHaveLength(1)
    expect(shown[0]?.attributes('src')).toBe('blob:picture-1')
    expect(shown[0]?.attributes('alt')).toBe('')
    await wrapper.get('.kit-file-field__remove').trigger('click')
    await flushPromises()
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:picture-1')
  })

  it('says what it takes in as many words as it has limits', () => {
    const one = field(
      KitFileField,
      [],
      { label: 'Cover', group: true },
      { accept: [{ type: 'image/png', name: 'PNG' }], maxSize: 1024 },
    )
    expect(one.wrapper.get('.kit-file-field__limits').text()).toBe('PNG, up to 1 kB.')
    const counted = field(
      KitFileField,
      [],
      { label: 'Scans', group: true },
      { multiple: true, maxFiles: 3 },
    )
    expect(counted.wrapper.get('.kit-file-field__limits').text()).toBe('Up to 3 files.')
    const any = field(
      KitFileField,
      [],
      { label: 'Anything', group: true },
      { chooseLabel: 'Attach' },
    )
    const button = any.wrapper.get('button')
    expect(button.text()).toBe('Attach')
    expect(button.attributes('aria-describedby')).toBeUndefined()
    expect(any.wrapper.find('.kit-file-field__limits').exists()).toBe(false)
  })

  it('takes a family of kinds, as image/* names it', async () => {
    const { wrapper, state } = field(
      KitFileField,
      [],
      { label: 'Pictures', group: true },
      { accept: [{ type: 'image/*', name: 'picture' }], multiple: true },
    )
    const photo = file('photo.heic', 'image/heic')
    await pick(wrapper, [photo, file('song.mp3', 'audio/mpeg')])
    expect(state.value).toEqual([photo])
    expect(wrapper.get('[role="alert"]').text()).toBe('song.mp3 isn’t a picture file.')
  })

  it('takes nothing while disabled, by its picker or dropped', async () => {
    const { wrapper, state } = field(
      KitFileField,
      [],
      { label: 'Scans', group: true },
      { drop: true, disabled: true },
    )
    const zone = wrapper.get('.kit-file-field__zone')
    expect(zone.attributes('disabled')).toBeDefined()
    await zone.trigger('dragover')
    expect(zone.classes()).not.toContain('is-dropping')
    await zone.trigger('drop', { dataTransfer: { files: [file('a.png', 'image/png')] } })
    await pick(wrapper, [file('b.png', 'image/png')])
    expect(state.value).toEqual([])
  })

  it('shows where files will land until they are dragged off the zone', async () => {
    const { wrapper } = field(KitFileField, [], { label: 'Scans', group: true }, { drop: true })
    const zone = wrapper.get('.kit-file-field__zone')
    await zone.trigger('dragenter')
    expect(zone.classes()).toContain('is-dropping')
    // Over something inside the zone, the files are still over the zone.
    const inside = document.createElement('span')
    zone.element.append(inside)
    await zone.trigger('dragleave', { relatedTarget: inside })
    expect(zone.classes()).toContain('is-dropping')
    await zone.trigger('dragleave', { relatedTarget: document.body })
    expect(zone.classes()).not.toContain('is-dropping')
    // A drop with nothing in it adds nothing.
    await zone.trigger('drop')
    expect(announce).not.toHaveBeenCalled()
  })
})
