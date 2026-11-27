// Links that move within an app: a RouterLink where the app has Vue Router, and a plain link
// where it hasn't. The kit never imports Vue Router, so an app without it takes the kit just the
// same; it reads RouterLink from the components the app has registered.
import { getCurrentInstance } from 'vue'
import type { Component } from 'vue'

/** Where a link within the app leads: a RouterLink's `to`, or an address. */
export type KitLinkTarget = string | object

/** The app's RouterLink, where it has Vue Router. Called while a component sets up. */
export function appRouterLink(): Component | undefined {
  return getCurrentInstance()?.appContext.components.RouterLink
}

/** What a link to `to` binds: `to` on the app's RouterLink, or `href` on a plain link. */
export function linkBinding(
  routerLink: Component | undefined,
  to: KitLinkTarget,
): Record<string, unknown> {
  return routerLink ? { to } : { href: typeof to === 'string' ? to : undefined }
}
