// The bundle's entry (vite.config.ts): the package's exports, and the global stylesheets (the
// tokens, the open lists Reka draws outside every component, and what two components share: the
// chips, the choice groups' layout, the disclosures' buttons, and the date fields and calendar),
// so the build gathers every style into one style.css. The declarations come from index.ts alone
// (tsconfig.build.json), which never names a stylesheet: one there would point an app's type
// check at a file the package doesn't ship.
import './tokens/tokens.css'
import './styles/option-list.css'
import './styles/chips.css'
import './styles/choices.css'
import './styles/disclosure.css'
import './styles/dates.css'

export * from './index'
