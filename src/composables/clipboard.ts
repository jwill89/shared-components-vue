/**
 * Puts `text` on the clipboard, and `html` beside it where given, so a page that takes rich text
 * (a document, an email) pastes the markup and anything else the words. It answers whether the
 * copy happened and never throws: a browser that has no clipboard, or refuses it (outside a
 * secure page, or without the person's leave), answers false, and the caller says so in words,
 * with what to do instead. KitCopyButton is a button that does this and says how it went.
 */
export async function copyText(text: string, html?: string): Promise<boolean> {
  if (!('clipboard' in navigator)) {
    return false
  }
  try {
    if (html !== undefined && 'ClipboardItem' in window && 'write' in navigator.clipboard) {
      await navigator.clipboard.write([
        new ClipboardItem({
          'text/plain': new Blob([text], { type: 'text/plain' }),
          'text/html': new Blob([html], { type: 'text/html' }),
        }),
      ])
    } else {
      await navigator.clipboard.writeText(text)
    }
    return true
  } catch {
    return false
  }
}
