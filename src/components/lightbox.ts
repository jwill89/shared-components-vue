// The image a KitLightbox shows. It lives in a plain TypeScript file, not in the component, so
// openLightbox() and the component read the same type; ESLint's type checker can't see into a
// .vue file another file imports.

/** One image for the viewer. */
export interface KitLightboxImage {
  src: string
  /** What the image shows, which names the viewer while it is on screen. */
  alt: string
  caption?: string
  /** The original file, for a link that opens it on its own. */
  href?: string
  /** Other forms of the image, as a picture's sources: `{ srcset, type: 'image/avif' }`. */
  sources?: { srcset: string; type: string }[]
}
