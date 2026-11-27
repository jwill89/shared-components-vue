import { onScopeDispose } from 'vue'
import { confirm } from './useConfirmQueue'

/** What the question before leaving says, and the router's hook to ask it from. */
export interface KitLeaveGuardOptions {
  /**
   * The router's own leave hook, `onBeforeRouteLeave` from Vue Router, which the kit can't import,
   * so a move within the app asks too. Left out where the page isn't one the router drew (a
   * dialog's, or a spec's), whose hook would find no route to leave.
   */
  onBeforeRouteLeave?: (guard: () => boolean | Promise<boolean>) => void
  /** The question's heading. */
  title?: string
  /** What leaving does. */
  message?: string
  /** The button that leaves anyway. */
  leaveLabel?: string
  /** The button that stays on the page. */
  stayLabel?: string
}

/** What the guard hands back: a way to ask before a leaving of the page's own. */
export interface KitLeaveGuard {
  /**
   * Asks whether to go, through `confirm()`, while `holding` says there is unsaved work, and
   * resolves to whether to go; with nothing held, resolves to yes without asking. For a leaving
   * no router sees, such as closing a drawer that holds a form.
   */
  mayLeave: () => Promise<boolean>
}

/**
 * Warns before the person leaves a page while `holding` says it holds unsaved work: through the
 * browser's own prompt for a reload, a closed tab or another site, and through `confirm()`, which
 * needs a KitConfirmHost, for a move within the app, given the router's hook. Called in a
 * component's setup, and let go when the component is.
 *
 * @example
 * import { onBeforeRouteLeave } from 'vue-router'
 * useLeaveGuard(() => dirty.value, { onBeforeRouteLeave })
 */
export function useLeaveGuard(
  holding: () => boolean,
  options: KitLeaveGuardOptions = {},
): KitLeaveGuard {
  const {
    title = 'Leave without saving?',
    message = 'Your changes on this page haven’t been saved, and leaving drops them.',
    leaveLabel = 'Leave',
    stayLabel = 'Stay',
  } = options

  function beforeUnload(event: BeforeUnloadEvent): void {
    if (holding()) {
      event.preventDefault()
    }
  }
  window.addEventListener('beforeunload', beforeUnload)
  onScopeDispose(() => {
    window.removeEventListener('beforeunload', beforeUnload)
  })

  function mayLeave(): Promise<boolean> {
    if (!holding()) {
      return Promise.resolve(true)
    }
    return confirm({
      title,
      message,
      confirmLabel: leaveLabel,
      cancelLabel: stayLabel,
      danger: true,
    })
  }

  options.onBeforeRouteLeave?.(() => (holding() ? mayLeave() : true))
  return { mayLeave }
}
