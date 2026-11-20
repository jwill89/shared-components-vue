import { afterEach, describe, expect, it } from 'vitest'
import { defineComponent, h, nextTick, ref } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import KitButton from '../components/KitButton.vue'
import KitLightbox from '../components/KitLightbox.vue'
import type { KitLightboxImage } from '../components/KitLightbox.vue'
import { soon } from '../../shared/test/web/wait.js'
import { axeFindings, kept, unmountKept } from './helpers'

afterEach(unmountKept)

const shelf: KitLightboxImage[] = [
  { src: '/a.jpg', alt: 'The oak shelf by the window', caption: 'Spring', href: '/a-full.jpg' },
  {
    src: '/b.jpg',
    alt: 'The paperbacks, two deep',
    sources: [{ srcset: '/b.avif', type: 'image/avif' }],
  },
  { src: '/c.jpg', alt: 'The atlas on its side' },
]

/** A page with a button that opens the viewer, its open state and image kept. */
function page(images = shelf) {
  const open = ref(false)
  const index = ref(0)
  kept(
    mount(
      defineComponent({
        setup: () => () => [
          h(KitButton, { onClick: () => (open.value = true) }, () => 'Look closer'),
          h(KitLightbox, {
            images,
            open: open.value,
            'onUpdate:open': (next: boolean) => {
              open.value = next
            },
            index: index.value,
            'onUpdate:index': (next: number) => {
              index.value = next
            },
          }),
        ],
      }),
      { attachTo: document.body },
    ),
  )
  return { open, index }
}

function button(name: string): HTMLButtonElement {
  const found = [...document.querySelectorAll('button')].find(
    (candidate) => (candidate.getAttribute('aria-label') ?? candidate.textContent.trim()) === name,
  )
  if (!found) {
    throw new Error(`No "${name}" button.`)
  }
  return found
}

function viewer(): HTMLElement {
  const found = document.querySelector<HTMLElement>('[role="dialog"]')
  if (!found) {
    throw new Error('No viewer is open.')
  }
  return found
}

function shown(): string | null | undefined {
  return viewer().querySelector('img')?.getAttribute('src')
}

async function openOn(): Promise<ReturnType<typeof page>> {
  const state = page()
  const opener = button('Look closer')
  opener.focus()
  opener.click()
  await flushPromises()
  await nextTick()
  return state
}

describe('KitLightbox', () => {
  it('opens as a modal named by the image, on its Close button, with nothing axe finds', async () => {
    await openOn()
    const panel = viewer()
    expect(panel.getAttribute('aria-modal')).toBe('true')
    const title = document.getElementById(panel.getAttribute('aria-labelledby') ?? '')
    expect(title?.textContent).toBe('The oak shelf by the window')
    expect(panel.hasAttribute('aria-describedby')).toBe(false)
    expect(document.activeElement).toBe(button('Close'))
    expect(panel.textContent).toContain('Spring')
    expect(panel.textContent).toContain('1 of 3')
    const original = panel.querySelector('a')
    expect(original?.getAttribute('href')).toBe('/a-full.jpg')
    expect(original?.getAttribute('target')).toBe('_blank')
    expect(await axeFindings(document.body)).toEqual([])
  })

  it('moves through the images by its buttons and the arrow keys, round at either end', async () => {
    const { index } = await openOn()
    button('Next image').click()
    await nextTick()
    expect(index.value).toBe(1)
    expect(shown()).toBe('/b.jpg')
    expect(viewer().querySelector('source')?.getAttribute('srcset')).toBe('/b.avif')
    // Each image is read out as it shows.
    await soon(() => {
      expect(viewer().querySelector('.kit-announcer')?.textContent).toContain(
        'The paperbacks, two deep, 2 of 3',
      )
    })

    button('Previous image').click()
    await nextTick()
    viewer().dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }))
    await nextTick()
    expect(index.value).toBe(2)
    viewer().dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }))
    await nextTick()
    expect(index.value).toBe(0)
  })

  it('shows an image at its own size, to scroll round, where the arrow keys scroll it', async () => {
    const { index } = await openOn()
    const fullSize = button('Full size')
    expect(fullSize.getAttribute('aria-pressed')).toBe('false')
    fullSize.click()
    await nextTick()
    expect(fullSize.getAttribute('aria-pressed')).toBe('true')
    const stage = viewer().querySelector('.kit-lightbox__stage')
    expect(stage?.getAttribute('tabindex')).toBe('0')
    expect(stage?.getAttribute('aria-label')).toBe('The oak shelf by the window')
    viewer().dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }))
    await nextTick()
    expect(index.value).toBe(0)
    expect(await axeFindings(document.body)).toEqual([])
  })

  it('closes on a press beside the image, not on the image, and gives focus back', async () => {
    const { open } = await openOn()
    viewer().querySelector('img')?.click()
    await flushPromises()
    expect(open.value).toBe(true)
    viewer().querySelector<HTMLElement>('.kit-lightbox__stage')?.click()
    await flushPromises()
    expect(open.value).toBe(false)
    expect(document.querySelector('[role="dialog"]')).toBeNull()
    expect(document.activeElement).toBe(button('Look closer'))
  })

  it('closes on Escape', async () => {
    const { open } = await openOn()
    viewer().dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    await flushPromises()
    expect(open.value).toBe(false)
  })

  it('has no way to move, nor a place, with one image', async () => {
    page([{ src: '/a.jpg', alt: 'The oak shelf by the window' }])
    button('Look closer').click()
    await flushPromises()
    expect(viewer().querySelectorAll('.kit-lightbox__step')).toHaveLength(0)
    expect(viewer().textContent).not.toContain('1 of 1')
    expect(viewer().querySelector('a')).toBeNull()
  })
})
