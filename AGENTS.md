# AGENTS.md

The guide to this repo, for agents and developers alike: read it before any change. The rules every project follows are in [shared/standards/README.md](shared/standards/README.md); this file covers only what is the kit's own. The kit's design and the order it is built and adopted in are in [PLAN.md](PLAN.md).

## What this is

shared-components-vue is the component kit every Vue front end uses: Vue 3 components on Reka UI's headless primitives, styled only through design tokens, so each app keeps its own look. Apps install it by its release tag and import its stylesheet once. It ships no app: the playground in `playground/` exists for review and for the end-to-end run.

## Commands

`task` alone lists them all.

| Task | Purpose |
| --- | --- |
| `task setup` | Install the dependencies, which also builds the package |
| `task dev` | The playground, with the kit's source, on `http://localhost:5173` |
| `task build` | The package into `dist/`: one ES module, its type declarations and `style.css` |
| `task test` | The Vitest specs |
| `task test:coverage` | The same, failing below the coverage floor in `vite.config.ts` |
| `task test:e2e` | Build the playground and run Playwright and axe on it, AAA rules on, in both color schemes |
| `task lint` | ESLint, Stylelint, Prettier, the type check and the docs checks |
| `task vuln` | npm audit of what ships, and OSV-Scanner over the lockfile |
| `task check` | Everything CI runs; it passes before a change is done |
| `task push` | Take the in-range updates, run the check, push and follow CI |

## Architecture and conventions

- `src/components/` holds the components, one file each, named `Kit` and the job (`KitButton.vue`). The shared ESLint refuses one-word names and the names of HTML elements, and the prefix keeps the kit's components apart from an app's own while the app moves over.
- `src/index.ts` exports every component and composable an app may import, and the type declarations are built from it alone. `src/bundle.ts`, the bundle's entry, adds the tokens to those exports, so the build gathers every style into one `style.css`.
- `src/composables/` holds what code calls rather than renders, such as `confirm()` and `useToast()`.
- `src/tokens/tokens.css` defines every token as `--kit-*`, and `src/tokens/contrast.ts` lists the color pairs the default theme holds.
- `src/__tests__/` holds the specs, as `*.spec.ts`.
- `playground/` imports the kit by its package name, pointed at the source by `playground/vite.config.ts`, and shows every component in each of its states. Its own stylesheet stands in for an app's: it sets the color scheme and draws the page from the kit's tokens.
- Every style the kit ships sits in `@layer kit`: each component's style block is one `@layer kit { ... }`, and so is the token file. An app's rules are unlayered, so they win without a heavier selector.
- An element the kit sizes or pads sets `box-sizing: border-box` itself, since an app may have no reset that sets it. The playground has none on purpose, and `e2e/fields.spec.ts` fails on a control that spills out of its field.
- Every color, font, size and space a component uses is a `--kit-*` token, read through `var()`; Stylelint's palette rule refuses a color written anywhere but the token file. A component's classes are BEM with its own name as the block (`.kit-button__icon`).
- Each color token is `light-dark(light, dark)`, so it follows the `color-scheme` the app sets on its page. The kit never queries the device's scheme itself.
- Every form control takes the same three props, `id`, `describedBy` and `invalid`, which `KitFormField`'s slot hands it (`v-bind="field"`), so one wrapper names and describes any control. A new control takes the same three.
- Icons come in through slots; the kit has no icon library, so the app's own Font Awesome setup draws them.
- Vue is a peer dependency, and Reka UI a dependency pinned to one version. The build keeps both as imports, so the app's copy of each is the one that runs.
- The package build lowers and minifies nothing (`vite.config.ts`). The app's build does both, for the browsers it serves.

## Key principles: don't undo these

- **One style outside `@layer kit` beats the app.** `layers.spec.ts` reads every stylesheet and style block under `src/` and fails on anything outside the layer.
- **Every color pair is measured.** A color token sits in a pair in `contrast.ts` or in its `UNPAIRED` list with a reason; `contrast.spec.ts` fails on one in neither, and on a pair below its floor in either scheme.
- **The kit follows the page's color scheme.** Turning a token back into a `prefers-color-scheme` query would break every app that lets the user pick a scheme.
- **A component starts from the cleanest copy an app already has** (PLAN.md, What to build first), not from scratch.

## Known traps

- **The package marks only its CSS as having side effects.** An app that imports the package without `@jwill89/shared-components-vue/style.css` gets the components unstyled, and a bare `import '@jwill89/shared-components-vue'` is dropped from a build altogether. The playground imports `style.css` as an app does, which its end-to-end run checks.
- **An app's build lowers `light-dark()`.** Vite's default CSS target rewrites it into lightningcss's stand-in, which reads variables lightningcss writes only beside a `color-scheme` declared in CSS. An app that declares its scheme in CSS, as the standards ask, is fine; one that sets it from script, or not at all, gets no default kit colors in production, only in development. Such an app maps every color token to its own. Lowering the kit's own build (a `target` or minifier in `vite.config.ts`) would bake the stand-in into `style.css`, so it stays off.
- **A stylesheet imported in `src/index.ts` ships in the declarations.** vue-tsc keeps a side-effect import in `dist/index.d.ts`, pointing an app's type check at a file the package doesn't ship, so stylesheets are imported in `src/bundle.ts` and never in `index.ts`.
- **A hover is a color too.** A state's color mixed where it is used (a hover's `color-mix()`) is listed in `contrast.ts` with the same weight the component writes, and `e2e/buttons.spec.ts` measures what the browser draws, so the two can't drift. MathBot's button hover, which mixed the fill toward its own words, fell to about 6:1.
- **`confirm()` needs a `KitConfirmHost`.** The queue lives in the kit, and the host draws it; with no host, `confirm()` throws rather than wait for an answer that can't come, and when the last host unmounts, what is still waiting is answered no.
- **Reka focuses the first control in a dialog, which is its Close button.** A form dialog moves focus to its first field itself (`onOpenAutoFocus` in `KitDialog.vue`), and an alert dialog's focus starts on Cancel through `AlertDialogCancel`, so KitConfirmDialog wraps its Cancel button in it.
- **Reka sets a dialog's role but not `aria-modal`**, which the standards ask for, so KitDialog sets it.
- **Teleported content isn't reached by scoped styles.** Reka's Toast, Select, Combobox and Tooltip content render outside the component's tree, so their styles go in an unscoped style block, still in `@layer kit`. Reka's Dialog parts are the exception.
- **vue-tsc 3.3.14 is skipped.** It stops checking a template at a `//` in a static attribute. Dependabot skips that version only.

## Recipes

### Add a component

1. Find its "Starts from" copy in PLAN.md's table; where it names several, compare them and take the cleanest.
2. Copy it to `src/components/Kit<Name>.vue`. Rename its classes to `.kit-<name>`, its tokens to `--kit-*`, and wrap its style block in `@layer kit { ... }`. Anything app-specific it imports (a formatter, a router link) becomes a prop or a slot.
3. Export it from `src/index.ts`.
4. Write `src/__tests__/Kit<Name>.spec.ts`: mount it with `@vue/test-utils`, drive it as a user would, and run axe on what it renders.
5. Add it to the playground in each of its states.
6. Add a line under Unreleased in CHANGELOG.md, then run `task check`.

### Change a color or add a token

1. Write it in `src/tokens/tokens.css`, a color as `light-dark(light, dark)`.
2. A color joins a pair in `src/tokens/contrast.ts`, or `UNPAIRED` with its reason. A component's state color made with `color-mix()` (a hover, a wash) joins as a mixed pair, with the weight the component writes.
3. `task test` measures it; the playground shows each pair with its ratio in the scheme on screen.
4. A renamed or removed token breaks every app that maps it, so it waits for a major version.

### Cut a release

1. Set the version in `package.json` (semver: a removed or renamed component, prop, slot or token is a major).
2. Turn CHANGELOG.md's Unreleased into `## [x.y.z] - YYYY-MM-DD` and run `task shared:changelog:links`.
3. Push. Once CI passes, its release job tags `vx.y.z` and publishes the notes, and apps take it with `npm install github:jwill89/shared-components-vue#vx.y.z`.

### Take a shared-tooling release

`task shared:update -- vX.Y.Z` moves the submodule, the workflow refs and the lint package together; commit the result.

## Testing

- `src/__tests__/` runs under Vitest on jsdom; the token and stylesheet specs read the source files under Node. The coverage floor in `vite.config.ts` only rises.
- `src/__tests__/helpers.ts` keeps each mounted wrapper for unmounting after the test (`kept`, `unmountKept`) and runs axe on what a component renders (`axeFindings`); `setup.ts` stands in for the browser APIs jsdom lacks. A component spec mounts with `@vue/test-utils`, drives it as a user would, and expects no axe findings.
- Reka's primitives start listening a tick after mounting, so a spec awaits `nextTick()` before it sends a pointer event. Test Utils' `trigger` leaves out a pointer's type, which Reka reads as a touch, so a click on a Reka button is a real `PointerEvent` (`press()` in `KitNumberField.spec.ts`).
- `e2e/` runs Playwright on the built playground: axe with the AAA rules in the light and dark schemes, the tokens following the scheme the page sets, each button's hover held at 7:1 as the browser draws it, the focus rings, and each dialog as a person meets it (focus held, the page locked under the wheel, Escape, focus given back). A scroll lock is checked with the mouse wheel: `overflow: hidden` still lets a script scroll.
- A component that teleports (a dialog) is read from `document.body` in its spec, found by its role as a screen reader finds it.

## Departures from the standards

None.

## Not yet meeting the standards

None.
