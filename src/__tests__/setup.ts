// The browser APIs jsdom lacks that axe and Reka's primitives call. jsdom lays nothing out, so
// each stands in doing nothing. A spec on Node has no DOM at all, and needs none of them.
class ResizeObserverStandIn {
  observe(): void {
    // Nothing is laid out, so nothing ever resizes.
  }
  unobserve(): void {
    // As above.
  }
  disconnect(): void {
    // As above.
  }
}

if (typeof Element !== 'undefined') {
  if (!('ResizeObserver' in globalThis)) {
    globalThis.ResizeObserver = ResizeObserverStandIn
  }
  if (!('scrollIntoView' in Element.prototype)) {
    Object.assign(Element.prototype, { scrollIntoView: () => undefined })
  }
  // ProseMirror measures the text's ranges as it scrolls the cursor into view, and jsdom's
  // ranges have no measure to give.
  if (!('getClientRects' in Range.prototype)) {
    Object.assign(Range.prototype, {
      getClientRects: () => Object.assign([], { item: () => null }),
      getBoundingClientRect: () => new DOMRect(),
    })
  }
  // ProseMirror makes a paste event of its own when a spec pastes text, and jsdom has no
  // ClipboardEvent to make it with.
  if (!('ClipboardEvent' in globalThis)) {
    globalThis.ClipboardEvent = class extends Event {
      readonly clipboardData = null
    }
  }
  // axe asks for a canvas while it looks at icons, and jsdom has none to give.
  Object.assign(HTMLCanvasElement.prototype, { getContext: () => null })
  if (!('hasPointerCapture' in Element.prototype)) {
    Object.assign(Element.prototype, {
      hasPointerCapture: () => false,
      setPointerCapture: () => undefined,
      releasePointerCapture: () => undefined,
    })
  }
}
