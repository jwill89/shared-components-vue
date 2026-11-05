# shared-components-vue: Plan

Written November 5, 2026. This is the kit's own plan. The overall plan and the standards every project follows live in shared-tooling (`PLAN.md` and `standards/`); this file covers only what is specific to the kit, and links there rather than repeating it.

Work here starts after shared-tooling's rollout (step 7 of its plan, right after TarotGen.io's Go port and Senpan's move to huma). The token and first-wave decisions below can be settled now.

## What it is

- Vue 3 components built on Reka UI's headless primitives, which supply the WAI-ARIA roles, keyboard handling and focus management.
- Styled only through design tokens, written as plain CSS custom properties, so each app keeps its own look.
- Used by every Vue front end. Family Card Game is React and stays on Mantine. The résumé site loads Vue from a script tag with no build step, so it stays out too.
- Versioned and released on its own, apart from shared-tooling: an app takes a new kit version on purpose, never because a lint rule changed.

## Why replace what's there

The Vue apps use three approaches today: PrimeVue with Tailwind (Home Library, Kindred), Bulma with Reka UI (the Gallery, TarotGen.io), and hand-written components (Senpan, Fantasy Dossier, Fingerprint Generator).

- **Bulma** is maintained, but barely: still on 1.0.4, with about 400K weekly npm downloads against Tailwind's 125M.
- **PrimeVue** works, but it's styled first, so apps keep overriding its look. Its published roadmap leans toward the paid PrimeVue+ suite and templates, with nothing on accessibility.
- **Hand-written components** repeat the same work in each app, and each copy has to get keyboard and focus handling right on its own.

## Decisions

Decided for the kit on November 5, 2026:

- Reka UI underneath, with design tokens as plain CSS custom properties.
- No Bulma, PrimeVue, Tailwind or Font Awesome dependency. Icons come in through slots, so each app keeps its own Font Awesome setup, and the kit's CI never needs the Font Awesome Pro token.
- Vue is a peer dependency. Reka UI is a regular dependency at a pinned version, so apps don't manage it.
- Vapor waits. Reka UI's components are regular (virtual DOM) components, so the kit moves to Vapor only once Reka UI supports it.

From shared-tooling's plan, as for every repo:

- ESLint, Prettier and Stylelint from shared-tooling's `lint/web`. The kit holds shared-tooling as a submodule at `shared/`, like every other repo.
- Vitest on jsdom with Vue Test Utils for behavior, and Playwright with axe for whole pages.
- WCAG 2.2 AA.
- The repo is public.

## What to build first

Your apps already contain the same components several times over. The first wave covers those, starting with the ones repeated most.

| Component | Built on | Replaces today |
| --- | --- | --- |
| Dialog, ConfirmDialog | Reka Dialog, AlertDialog | PrimeVue Dialog and ConfirmDialog (Home Library, Kindred); Senpan's ModalOverlay and ConfirmModal; TarotGen.io's BaseModal and ConfirmDialog; the Gallery's AppDialog; Fantasy Dossier's modal |
| Toast | Reka Toast | PrimeVue Toast (Home Library, Kindred); Senpan's ToastNotification; the ToastContainers in TarotGen.io and the Gallery |
| Button, IconButton | Native `<button>` | PrimeVue Button (120 imports across Home Library and Kindred); TarotGen.io's IconButton; Bulma buttons |
| TextField, Textarea, NumberField | Native inputs, Reka NumberField | PrimeVue InputText, Textarea and InputNumber; TarotGen.io's NumberField |
| FormField | Label, help and error wiring | FormField in Kindred and Home Library |
| PageHeader, PagePanel | Plain markup | PageHeader in TarotGen.io, the Gallery, Kindred and Home Library; PagePanel in Kindred and Home Library |
| Lightbox | Reka Dialog | Lightboxes in TarotGen.io, the Gallery, Kindred and Fantasy Dossier |
| Select, Combobox | Reka Select, Combobox | PrimeVue Select and AutoComplete; TarotGen.io's BaseSelect and combo boxes |
| Switch, SegmentedControl | Reka Switch, ToggleGroup | PrimeVue ToggleSwitch and SelectButton; TarotGen.io's ToggleSwitch and SegmentedControl |
| Tooltip | Reka Tooltip | TarotGen.io's Tooltip, the Gallery's AppTooltip, Kindred's HelpTip |
| Spinner, LoadingOverlay | Plain markup | LoadingSpinner in Senpan and the Gallery; TarotGen.io's LoadingOverlay |
| Alert, EmptyState | Plain markup | PrimeVue Message; the Gallery's AppAlert and EmptyState |
| TagInput | Reka TagsInput | TagInput in TarotGen.io and Home Library; the Gallery's TagMultiSelect |
| TurnstileWidget | Cloudflare's script | The same widget in Senpan, TarotGen.io and the Gallery |

The second wave covers the bigger pieces: a data table (PrimeVue DataTable today, plus Kindred's StackTable and Senpan's TanStack table), drawers, menus, a date picker, pagination and popovers.

Components that belong to one app stay in that app, such as Senpan's bingo board, TarotGen.io's spread editor and Home Library's book cover.

## Design tokens

- Every color, space, radius, font and shadow a component uses comes from a token, never a hard-coded value. A Stylelint rule enforces it.
- Tokens have semantic names (surface, text, muted, accent, danger, focus ring), not raw colors. Each app maps its theme onto them in one file, so TarotGen.io keeps its mystic palette and Fantasy Dossier its vellum.
- Today each app names its variables its own way: `--myst-*` in TarotGen.io, `--seal-*` and `--paper-*` in Fantasy Dossier, `--color-*` in Kindred and Home Library. `--color-*` is also Tailwind 4's own namespace, so kit tokens need a prefix that collides with none of these.
- The kit's CSS sits in a cascade layer (`@layer kit`), so an app's own styles always win without specificity fights.
- The default theme meets WCAG AA contrast, and each app's theme is checked by its own page tests.

## Accessibility

- Reka UI supplies roles, keyboard handling and focus management. The kit adds a visible focus ring from a token, 44 px touch targets (as Home Library already requires), and `prefers-reduced-motion` handling for every animation.
- Each component has Vitest tests for its behavior, with axe run on what it renders.
- A `playground/` app shows every component in every state. Playwright and axe run against it, the same way `test/a11y` checks the apps.

## Repo layout and build

- `src/components/<Name>/` holds each component with its tests.
- `src/tokens/` holds the token names and the default theme.
- `playground/` is a small Vite app for review and for the Playwright and axe runs.
- Vite's library mode builds ES modules plus type declarations (vue-tsc), and one CSS file that apps import once.
- `shared/` is the shared-tooling submodule, for lint and test configs and CI workflows.

## Releases

- Semantic version tags (`v1.0.0`) with a CHANGELOG. Breaking changes only in major versions.
- Apps install a tag: `npm install github:jwill89/shared-components-vue#v1.0.0`. npm runs the kit's `prepare` build during install. If that gets slow, publish to npm as `@jwill89/shared-components-vue` instead.

## Rollout order

1. **The Gallery and TarotGen.io first.** Both already use Reka UI, and both drop Bulma. Bulma also supplies layout helpers (columns, spacing), which those apps replace with plain CSS at the same time.
2. **Home Library and Kindred next.** They replace PrimeVue screen by screen; PrimeVue is removed once its last import goes.
3. **Senpan, Fantasy Dossier and Fingerprint Generator.** They swap their hand-written equivalents and map their themes onto the kit's tokens.
4. **MirageGO last,** for its menus and dialogs only; the game canvas stays Phaser.

## Open questions

- **Token prefix.** Recommended: `--kit-`, which is short and collides with nothing in the apps or Tailwind.
- **Data table.** Build it on TanStack Table, which Senpan already uses, in the second wave; or keep PrimeVue's DataTable in Home Library and Kindred until last.
- **Markdown editor.** Kindred and TarotGen.io use TipTap and Senpan uses Milkdown. One shared editor (TipTap, as the majority) could ship as a separate, optional import, so apps without it don't carry its weight.

## Sources

The component counts come from each app's source code in `C:\Web Projects` on November 5, 2026.

- [PrimeVue roadmap](https://primevue.org/roadmap)
- [Bulma vs Tailwind CSS](https://devtools-vs.pages.dev/bulma-vs-tailwindcss)
