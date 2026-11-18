import { onBeforeUnmount, ref, shallowReactive } from 'vue'
import type { Ref } from 'vue'

/**
 * How urgently a message is read: `assertive` at once, cutting in, for an error or a warning;
 * `polite` when the screen reader next pauses, for everything else.
 */
export type Politeness = 'polite' | 'assertive'

/** One place a message is read from: a KitAnnouncer's two live regions. */
export interface AnnouncerRegion {
  polite: Ref<string>
  assertive: Ref<string>
}

// The regions mounted, oldest first. The newest is the one a screen reader can hear: an open
// modal dialog's, which mounts after the toast host's, since some screen readers ignore every
// live region outside an aria-modal dialog, and the page behind one is hidden from them.
const regions = shallowReactive<AnnouncerRegion[]>([])

/** How long a region stays empty before a message, so the same message twice is heard twice. */
export const ANNOUNCE_DELAY = 100

/**
 * Has a screen reader read out `message`, from the newest announcer on the page. With none
 * mounted, there is nowhere to read it from, and nothing happens.
 */
export function announce(message: string, politeness: Politeness): void {
  const region = regions.at(-1)
  if (!region) {
    return
  }
  const live = region[politeness]
  live.value = ''
  setTimeout(() => {
    live.value = message
  }, ANNOUNCE_DELAY)
}

/** A region for a KitAnnouncer to show, counted while the announcer is mounted. */
export function useAnnouncerRegion(): AnnouncerRegion {
  const region: AnnouncerRegion = { polite: ref(''), assertive: ref('') }
  regions.push(region)
  onBeforeUnmount(() => {
    regions.splice(regions.indexOf(region), 1)
  })
  return region
}
