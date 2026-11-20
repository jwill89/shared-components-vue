/**
 * Cloudflare Turnstile's script, loaded once, the first time a KitTurnstileWidget needs it, and
 * shared by every widget on the page. A load that fails is forgotten, so the next widget tries
 * again.
 */

/** What a widget is drawn with, as Turnstile's `render` takes it. */
export interface TurnstileOptions {
  sitekey: string
  /** Checked by the server, so a token passes only for the form it was made for. */
  action?: string
  theme: 'auto' | 'light' | 'dark'
  callback: (token: string) => void
  'expired-callback': () => void
  'error-callback': () => void
}

/** The part of Turnstile's script the kit calls. */
export interface TurnstileApi {
  render: (container: HTMLElement, options: TurnstileOptions) => string
  reset: (widgetId: string) => void
  remove: (widgetId: string) => void
}

export const TURNSTILE_SCRIPT =
  'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'

// Read from the window rather than declared on it: an app that declares Turnstile on `Window`
// itself would clash with a declaration the kit shipped.
function loaded(): TurnstileApi | undefined {
  return (window as { turnstile?: TurnstileApi }).turnstile
}

/**
 * The page's Content-Security-Policy nonce, which Vite writes into
 * `<meta property="csp-nonce">` when the app sets `html.cspNonce`. Read as the property: the
 * browser hides the attribute's value from the page.
 */
export function pageNonce(): string {
  return document.querySelector<HTMLMetaElement>('meta[property="csp-nonce"]')?.nonce ?? ''
}

let loading: Promise<TurnstileApi> | null = null

/** Turnstile's script, loaded once with `nonce`, for every widget that asks. */
export function loadTurnstile(nonce: string): Promise<TurnstileApi> {
  loading ??= new Promise<TurnstileApi>((resolve, reject) => {
    const ready = loaded()
    if (ready) {
      resolve(ready)
      return
    }
    const script = document.createElement('script')
    script.src = TURNSTILE_SCRIPT
    script.async = true
    script.nonce = nonce
    script.addEventListener('load', () => {
      const api = loaded()
      if (api) {
        resolve(api)
      } else {
        loading = null
        reject(new Error('Turnstile loaded without its API.'))
      }
    })
    script.addEventListener('error', () => {
      loading = null
      script.remove()
      reject(new Error('Turnstile did not load.'))
    })
    document.head.appendChild(script)
  })
  return loading
}
