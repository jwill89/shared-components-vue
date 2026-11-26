# AGENTS.md

The guide to this repo, for agents and developers alike: read it before any change. The rules every project follows are in [shared/standards/README.md](shared/standards/README.md); this file covers only what is the kit's own. The kit's design and the order it is built and adopted in are in [PLAN.md](PLAN.md).

## What this is

shared-components-vue is the component kit every Vue front end uses: Vue 3 components on Reka UI's headless primitives, styled only through design tokens, so each app keeps its own look. The kit sets no color: each app sets every color token, and holds the pairs the kit names to their floors in its own colors. Apps install it by its release tag and import its stylesheet once. It ships no app: the playground in `playground/` exists for review and for the end-to-end run.

## Commands

`task` alone lists them all.

| Task | Purpose |
| --- | --- |
| `task setup` | Install the dependencies |
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
- `src/editor/` is the package's third entry, `@jwill89/shared-components-vue/editor`: KitMarkdownEditor and what it alone uses, apart from the main bundle so an app that loads it on first use carries TipTap only there. `engine.ts` sets TipTap up for a dialect and a profile; `writer.ts` writes both dialects' Markdown, with its own escaping; `discord.ts` holds the Discord dialect's own pieces (spoiler, subtext, the tokens); `suggest.ts` its suggestions; `tools.ts` the toolbar's tools.
- `src/discord/` holds Discord's Markdown for both the preview and the editor: `grammar.ts` reads it as Discord does, `tokens.ts` reads, writes and shows its mentions, emoji and times, and `embed.ts` holds the embed in Discord's API shape, its limits and Discord's own colors. KitDiscordPreview in the main bundle draws what the grammar reads, and the editor's Discord dialect edits it, so the two agree.
- `src/composables/` holds what code calls rather than renders, such as `confirm()` and `useToast()`, and the Turnstile loader every KitTurnstileWidget shares.
- `src/styles/` holds the global stylesheets two components share: the open lists (`option-list.css`) and the chips (`chips.css`).
- `src/tokens/tokens.css` defines every token but the colors as `--kit-*`. `src/tokens/contrast.ts` names every color token, which the app sets (`COLOR_TOKENS`), every pair they meet in, with its floor, and every token the kit has (`KIT_TOKENS`), which `contrast.spec.ts` holds to `tokens.css` and the components. The package ships `contrast.ts` as its own entry, `@jwill89/shared-components-vue/contrast` (a second entry in `vite.config.ts`, its declaration from `tsconfig.build.json`), so an app's tests measure every pair in the app's colors with the weights the components write. It imports nothing, so an app's tests load it without Vue or a page, and it shares no code with the main bundle.
- `src/__tests__/` holds the specs, as `*.spec.ts`.
- `playground/` imports the kit by its package name, pointed at the source by `playground/vite.config.ts`, and shows every component in each of its states. Its own stylesheets stand in for an app's: `palette.css` sets every color token, and `playground.css` sets the color scheme and draws the page from the kit's tokens.
- Every style the kit ships sits in `@layer kit`: each component's style block is one `@layer kit { ... }`, and so is the token file. An app's rules are unlayered, so they win without a heavier selector.
- An element the kit sizes or pads sets `box-sizing: border-box` itself, since an app may have no reset that sets it. The playground has none on purpose, and `e2e/fields.spec.ts` fails on a control that spills out of its field.
- Every color, font, size and space a component uses is a `--kit-*` token, read through `var()`; Stylelint's palette rule refuses a color written anywhere in `src/` but neutral black and white (the scrim, the shadow). A component's classes are BEM with its own name as the block (`.kit-button__icon`).
- The kit sets no color and asks nothing of the color scheme: the app's colors follow the scheme the app picks, by its own `light-dark()` or otherwise.
- Every form control takes the same three props, `id`, `describedBy` and `invalid`, which `KitFormField`'s slot hands it (`v-bind="field"`), so one wrapper names and describes any control. A new control takes the same three.
- Icons come in through slots; the kit has no icon library, so the app's own Font Awesome setup draws them.
- A box the kit draws around a slot asks `filled($slots.x)` (`src/components/slots.ts`), not `$slots.x`, so a slot whose content an app switches off with `v-if` leaves no empty box behind.
- Vue is a peer dependency, and Reka UI a dependency pinned to one version. `@internationalized/date`, which Reka and KitDatePicker share, is a dependency whose range overlaps Reka's own, so an app installs one copy, and `@tanstack/vue-table` runs KitDataTable's search, sort and pages. TipTap runs KitMarkdownEditor, every `@tiptap/*` package pinned to one version as Reka is, and `marked` with it, in the range TipTap's Markdown package takes. The build keeps all of them as imports, so the app's copy of each is the one that runs.
- The package build lowers and minifies nothing (`vite.config.ts`). The app's build does both, for the browsers it serves.

## Key principles: don't undo these

- **One style outside `@layer kit` beats the app.** `layers.spec.ts` reads every stylesheet and style block under `src/` and fails on anything outside the layer.
- **The kit ships no colors.** Each app sets every color token, so the colors and their contrast are the app's alone; a color given a value in the kit is one an app can forget to set and never notice. `contrast.spec.ts` fails on a color token given a value under `src/`, and on a component drawing with one that `COLOR_TOKENS` doesn't name; Stylelint refuses a color written there.
- **Every color pair is named and measured.** A color token sits in a pair in `contrast.ts` or in its `UNPAIRED` list with a reason, and `contrast.spec.ts` fails on one in neither. Apps run the pairs through `pairRatio()` in their own colors, so a weight lives only in `contrast.ts` and the component that writes it, never copied into an app. The kit's own run measures them in the playground's colors, in both schemes.
- **A component starts from the cleanest copy an app already has** (PLAN.md, What to build first), not from scratch.

## Known traps

- **An app's unlayered element rules beat the kit's components.** A rule outside any layer beats every layered one, so `button { color: inherit }` or `a { color }` in an app's base stylesheet overrides a KitButton's colors. An app names `@layer base, kit;` in a stylesheet imported before the kit's and puts its element rules in `base` (README, Your own base styles); the playground does the same (`playground/layers.css`), and `e2e/buttons.spec.ts` measures a link-button's words, which an unlayered `a { color }` would paint the color of its own fill.
- **The package marks only its CSS as having side effects.** An app that imports the package without `@jwill89/shared-components-vue/style.css` gets the components unstyled, and a bare `import '@jwill89/shared-components-vue'` is dropped from a build altogether. The playground imports `style.css` as an app does, which its end-to-end run checks.
- **A new color token is a breaking change.** Every app must set it before anything drawn with it shows, so one added to a component waits for a version that says so, and its line in CHANGELOG.md names it.
- **The playground's colors are an app's, not the kit's.** `playground/palette.css` sets every color token so the playground and its axe runs have something to draw; nothing in `src/` reads it, and the package doesn't ship it.
- **A stylesheet imported in `src/index.ts` ships in the declarations.** vue-tsc keeps a side-effect import in `dist/index.d.ts`, pointing an app's type check at a file the package doesn't ship, so stylesheets are imported in `src/bundle.ts` and never in `index.ts`.
- **Browsers round a `color-mix()` to whole channels.** A pair worked out in fractions can measure 7.01 here and 6.98 on screen, so `mixRgb` rounds as the browser does, one wash at a time where one lies over another.
- **The kit never imports Vue Router.** An app without it would fail to build. KitPageHeader takes RouterLink from the app's registered components when it is there, and draws a plain link when it isn't.
- **An alert must never look like a toast.** A toast floats: a border, a thick edge and a shadow. An alert sits flat: a wash and an icon only. Giving either the other's look breaks the standard that the two are told apart at a glance.
- **A hover is a color too.** A state's color mixed where it is used (a hover's `color-mix()`) is listed in `contrast.ts` with the same weight the component writes, and `e2e/buttons.spec.ts` measures what the browser draws, so the two can't drift. A hover that mixes a fill toward its own words falls to about 6:1. A see-through button's hover lies over whatever is behind it, so one in a toast or an alert is measured over that wash too, as a mix whose base is the wash's own mix; a quiet button's hover in an alert is why the alert's wash is 6%, not 7%.
- **`confirm()` needs a `KitConfirmHost`.** The queue lives in the kit, and the host draws it; with no host, `confirm()` throws rather than wait for an answer that can't come, and when the last host unmounts, what is still waiting is answered no.
- **Reka focuses the first control in a dialog, which is its Close button.** A form dialog moves focus to its first field itself (`onOpenAutoFocus` in `KitDialog.vue`), and an alert dialog's focus starts on Cancel through `AlertDialogCancel`, so KitConfirmDialog wraps its Cancel button in it.
- **Reka sets a dialog's role but not `aria-modal`**, which the standards ask for, so KitDialog sets it.
- **Reka 2.11's toasts are never read out.** Their announcer is wrapped in `VisuallyHidden` with `feature="fully-hidden"`, which sets `aria-hidden="true"` on it, and a modal dialog hides the toast stack besides. The kit reads each toast through its own `KitAnnouncer`, from the newest one mounted: the open dialog's when there is one, since some screen readers ignore live regions outside an `aria-modal` dialog. Its two regions are plain `aria-live` spans with no role, so an app's test that finds a dialog's alert finds the app's own, not an empty one of the kit's. `KitToastHost.spec.ts` fails the day Reka's announcer speaks; remove the kit's from the toasts then, or each is read twice.
- **Reka's toast manager holds what it's given until a host listens.** A spec that raises a toast with no host mounted leaves it for the next spec's host to show, so such a spec stubs `toastManager.add`.
- **A global stylesheet goes in two places.** The open lists' and the chips' styles (`src/styles/`), like the tokens, are imported by `src/bundle.ts` for `style.css` and by `playground/kit-source.css`, the playground's stand-in for it. One added to the first and not the second leaves the playground unstyled where apps aren't.
- **ESLint's type checker can't see into a `.vue` file another file imports**, and reads the type as `any`. A type two components share lives in a plain `.ts` file (`src/components/options.ts`).
- **An open list hides the page from screen readers.** Reka's Select, like a native select's popup, hides everything behind its list and holds focus in it, so axe run on the whole page with a list open finds "focusable but hidden" buttons and no h1. `e2e/choices.spec.ts` runs axe on the open list alone, and the page is checked with every list closed.
- **A group isn't named by a `<label>`.** KitSegmentedControl and KitDatePicker sit in a `group` KitFormField, whose caption is a span the group names itself by (`aria-labelledby`); a label's `for` reaches only a form control. Reka's date field is a group of spinbuttons, and puts the `id` it is given on a hidden input.
- **Teleported content isn't reached by scoped styles.** Reka's Toast, Select and Combobox content render outside the component's tree, and its Tooltip puts the class on an element of its own inside its wrapper, so their styles go in an unscoped style block, still in `@layer kit`. Reka's Dialog parts are the exception.
- **A tooltip drawn at the end of the page fails axe.** Teleported to `<body>`, it sits outside every landmark, which axe's region rule refuses while it is open, in an app's own run too, so KitTooltip, KitPopover, KitMenu and KitDatePicker's calendar are drawn beside their controls (the calendar with `:portal="{ disabled: true }"`, since Reka's DatePickerContent teleports by default). A menu is non-modal unless asked, so axe runs on the whole page with one open; a modal menu, like an open list, hides the page and is checked alone.
- **A word hidden for screen readers escapes a scroller that isn't positioned.** Hidden words are `position: absolute`, so their containing block is the nearest positioned ancestor; in a table wider than its frame, the far column's would sit past the frame's edge, unclipped, and widen the page. KitDataTable's frame is `position: relative` for it, and `e2e/table.spec.ts` fails on a page that scrolls sideways at a phone's width.
- **TanStack looks only at whether the rows are a new array.** Rows pushed into the same array would never show, so KitDataTable hands it a copy remade whenever the rows change.
- **The table's page is the page's to keep.** It reads as it was until the page passes the new one back, so one watcher decides between starting a new search at page one and bringing a page past the end back to the last, and nothing is clamped while the list loads, or a page restored from the address would be lost.
- **A heading is named from what it holds.** A resizable column's edge is a separator named "Width of" the column, inside its heading, and a name from content takes in a child's `aria-label`, so the heading would read as "Title Width of Title" with every cell under it. While the edges are drawn, KitDataTable names each heading by its label (`aria-label`), and `e2e/table.spec.ts` finds a heading by its exact name.
- **A table drawn as cards loses its roles.** A browser treats a table whose parts are set to `display: block` or `grid` as plain boxes, and a screen reader stops reading each cell with its heading. KitDataTable's cards write every role out (`role()`), only while stacked, and `e2e/table.spec.ts` reads a card's cells by role at a phone's width.
- **A popover's trigger takes the id its root already holds.** Reka makes the trigger's id only when the root has none, so KitPopover's `id` is set on the root context from a component between the root and the trigger (`popoverTrigger.ts`), and a form field's label names a trigger that is the field's control.
- **Reka names a popover by its trigger.** It sets the panel's `aria-labelledby` to the trigger's id after the props it is given, so nothing a component passes outranks it; KitPopover takes no label, and its trigger's words say what it holds.
- **Reka closes a tooltip when the page scrolls.** Focus scrolls a control below the fold into view, so `focus()` alone on such a control opens no tooltip; `e2e/overlays.spec.ts` brings it into view first, as a person sees what they tab to, and tries the focus again until the note shows, since a page still settling can scroll just after it (CI's runner did, now and then).
- **The Turnstile loader keeps Cloudflare's script for the page.** That is the point (one script for every widget), so `KitTurnstileWidget.spec.ts` imports the widget afresh for each test (`vi.resetModules`). The kit never declares `turnstile` on `Window`, which would clash with an app's own declaration; it reads it through a cast.
- **Apps install the release's file, never the git tag.** The package has no `prepare` script, so a git install gets no `dist/`. A build on install costs each app about 40 seconds of cloning, fetching `shared/` and installing the kit's tools, and npm 11 warns on an install script it hasn't approved, in the packed file's manifest too. The release job attaches the build the `web` job checked.
- **vue-tsc 3.3.14 is skipped.** It stops checking a template at a `//` in a static attribute. Dependabot skips that version only. 3.3.13 does the same inside a slot's template within a `v-for` (KitMarkdownEditor's link field), reporting the slot's names as unknown, so such a value is bound from the script (`LINK_PLACEHOLDER`).
- **TipTap's bold reads `__` as bold**, as it is typed and pasted, which in Discord is underline. The Discord dialect turns bold's own typing and pasting rules off (`enableInputRules`, `enablePasteRules`) and brings its own for `**`, `__` and `||`; `markdownWriter.spec.ts` and `e2e/editor.spec.ts` fail on a bold written or typed as `__`.
- **The Discord grammar answers to Discord's own parser.** `discordGrammar.spec.ts` reads each text with the grammar and with `@discord/markdown-wasm`, and `markdownWriter.spec.ts` reads what the editor writes with Discord's, so a change to the grammar or the writer is held to what Discord does. The parser is a development dependency only, loaded by those specs on Node.
- **TipTap adds a `<style>` to the page** unless told not to, which a content security policy refuses without a nonce, so the editor sets `injectCSS: false` and the kit's stylesheet carries TipTap's base rules.
- **A heading in the editor is no heading of the page.** Drawn as `h1` to `h6`, it would join the page's outline and fail axe's heading order, so each takes `role="presentation"`, and the toolbar says which level the line at the cursor is.
- **A tool's sign is drawn, not written.** Where the app gives no icon, a tool shows one of KitGlyph's marks (link, clock, quote, the lists) or its letters. A sign such as "H2" written in a button named "Heading 2" fails WCAG's label in name, so letters are CSS content with empty alternative text (`content: attr(data-glyph) / ''`), standing in for an icon as an app's own does.
- **An embed's parts change one at a time, but may land in one tick.** Two editors in KitDiscordEmbedEditor can each report a change before the page passes the first back, so it builds each change on the embed it last wrote (`latest`), which the page's own value replaces whenever it changes; built on `model.value`, the second change would drop the first.
- **A toolbar's tool is no plain button.** KitButton's plain variant underlines on hover, which in the editor's toolbar reads as a link, and as the Underline tool; the editor's stylesheet keeps the wash and drops the underline for its tools.

## Recipes

### Add a component

1. Find its "Starts from" copy in PLAN.md's table; where it names several, compare them and take the cleanest.
2. Copy it to `src/components/Kit<Name>.vue`. Rename its classes to `.kit-<name>`, its tokens to `--kit-*`, and wrap its style block in `@layer kit { ... }`. Anything app-specific it imports (a formatter, a router link) becomes a prop or a slot.
3. Export it from `src/index.ts`.
4. Write `src/__tests__/Kit<Name>.spec.ts`: mount it with `@vue/test-utils`, drive it as a user would, and run axe on what it renders.
5. Add it to the playground in each of its states.
6. Add a line under Unreleased in CHANGELOG.md, then run `task check`.

### Add a token, or a pair of colors

1. A font, size, space or timing goes in `src/tokens/tokens.css`, with its value, and its name in `VALUED_TOKENS` in `src/tokens/contrast.ts`, which `KIT_TOKENS` is made from.
2. A color token gets no value in the kit. It joins a pair in `src/tokens/contrast.ts`, or `UNPAIRED` with its reason, which puts it in `COLOR_TOKENS`, and the playground sets it in `playground/palette.css`, in light and dark. Every app must set it too, so it is a breaking change (Known traps).
3. Where two colors meet that no pair names yet, the pair joins `contrast.ts`. A component's state color made with `color-mix()` (a hover, a wash) joins as a mixed pair, with the weight the component writes.
4. `task test` measures every pair in the playground's colors; the playground shows each with its ratio in the scheme on screen.
5. A renamed or removed token breaks every app that sets it, so it waits for a major version.

### Cut a release

1. Set the version in `package.json` (semver: a removed or renamed component, prop, slot or token is a major).
2. Turn CHANGELOG.md's Unreleased into `## [x.y.z] - YYYY-MM-DD` and run `task shared:changelog:links`.
3. Push. Once CI passes, its release job tags `vx.y.z`, publishes the notes, and attaches the package, packed from the build the `web` job checked. Apps take it with `npm install https://github.com/jwill89/shared-components-vue/releases/download/vx.y.z/jwill89-shared-components-vue-x.y.z.tgz`.

### Take a shared-tooling release

`task shared:update -- vX.Y.Z` moves the submodule, the workflow refs and the lint package together; commit the result.

## Testing

- `src/__tests__/` runs under Vitest on jsdom; the token and stylesheet specs read the source files under Node. The coverage floor in `vite.config.ts` only rises.
- `src/__tests__/helpers.ts` keeps each mounted wrapper for unmounting after the test (`kept`, `unmountKept`) and runs axe on what a component renders (`axeFindings`); `setup.ts` stands in for the browser APIs jsdom lacks. A component spec mounts with `@vue/test-utils`, drives it as a user would, and expects no axe findings.
- ProseMirror measures ranges and makes a paste event of its own, which jsdom can't, so `setup.ts` stands in for both. Its `pasteText` always pastes as plain text, so a spec that pastes Markdown sends a paste event with `clipboardData` (`paste()` in `markdownWriter.spec.ts`).
- Reka's primitives start listening a tick after mounting, so a spec awaits `nextTick()` before it sends a pointer event. Test Utils' `trigger` leaves out a pointer's type, which Reka reads as a touch, so a click on a Reka button is a real `PointerEvent` (`press()` in `KitNumberField.spec.ts`).
- `e2e/` runs Playwright on the built playground: axe with the AAA rules in the light and dark schemes, the playground's colors following the scheme the page sets, each button's hover held at 7:1 as the browser draws it, the focus rings, and each dialog as a person meets it (focus held, the page locked under the wheel, Escape, focus given back). A scroll lock is checked with the mouse wheel: `overflow: hidden` still lets a script scroll.
- A component that teleports (a dialog) is read from `document.body` in its spec, found by its role as a screen reader finds it.
- Playwright finds a name by a part of it unless asked for it `exact`, so a section added to the playground keeps its labels clear of the names the older specs look for: the lending table's Room, Subjects and "Search lending" stand apart from the choices' Shelf and Genre and the books' Search, and its navigation from the one named "Pages of loans".
- A `Blob`'s `text()` takes a byte-order mark off, so a spec that checks a CSV's mark reads its bytes (`KitDataTableFeatures.spec.ts`).

## Departures from the standards

None.

## Not yet meeting the standards

None.
