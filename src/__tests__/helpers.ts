import axe from 'axe-core'
import type { VueWrapper } from '@vue/test-utils'

const cleanups: (() => void)[] = []

/** Keeps a wrapper to unmount after the test, so one test's leftovers never reach the next. */
export function kept<W extends VueWrapper>(wrapper: W): W {
  cleanups.push(() => {
    wrapper.unmount()
  })
  return wrapper
}

/** Unmounts every wrapper kept, and empties the document of what they teleported. */
export function unmountKept(): void {
  for (const cleanup of cleanups.splice(0)) {
    cleanup()
  }
  document.body.innerHTML = ''
}

/**
 * What axe finds wrong in what the wrapper renders, or in an element (the document's body,
 * for what a component teleports there), at WCAG 2.2 AA with its best practices, one line per
 * failing element. jsdom lays nothing out, so contrast is left to contrast.spec.ts and the
 * end-to-end suite, and `region` to the page, since a component alone sits in no landmark.
 */
export async function axeFindings(target: VueWrapper | Element): Promise<string[]> {
  const element = target instanceof Element ? target : target.element
  const results = await axe.run(
    { include: [element] },
    {
      runOnly: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'],
      rules: { 'color-contrast': { enabled: false }, region: { enabled: false } },
    },
  )
  return results.violations.flatMap((violation) =>
    violation.nodes.map((node) => `${violation.id}: ${node.target.join(' ')} — ${violation.help}`),
  )
}
