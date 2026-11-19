// The bundle's entry (vite.config.ts): the package's exports, and the global stylesheets (the
// tokens, and the open lists Reka draws outside every component), so the build gathers every
// style into one style.css. The declarations come from index.ts alone
// (tsconfig.build.json), which never names a stylesheet: one there would point an app's type
// check at a file the package doesn't ship.
import './tokens/tokens.css'
import './styles/option-list.css'

export * from './index'
