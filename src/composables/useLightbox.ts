import { reactive } from 'vue'
import type { KitLightboxImage } from '../components/lightbox'

/** The images the app's one viewer shows, which KitLightboxHost draws, and where it is. */
export const lightbox = reactive<{ images: KitLightboxImage[]; index: number; open: boolean }>({
  images: [],
  index: 0,
  open: false,
})

/**
 * Shows `images` in the app's one viewer, from the one at `start`, for a page that opens it from
 * anywhere (a picture in a record, a link in a list) without a KitLightbox of its own. A
 * KitLightboxHost, mounted once at the app's root, draws it; focus goes back to what had it when
 * the viewer closes.
 */
export function openLightbox(images: KitLightboxImage[], start = 0): void {
  lightbox.images = images
  lightbox.index = start
  lightbox.open = images.length > 0
}

/** Closes the app's one viewer. */
export function closeLightbox(): void {
  lightbox.open = false
}
