# shared-components-vue: Plan

Written November 5, 2026, and checked again against each app's code on November 18. This is the kit's own plan. The standards every project follows live in shared-tooling's `standards/`; this file covers only what is specific to the kit, and links there rather than repeating it.

Work here starts after the apps' shared-tooling rollouts (`plans/shared-tooling-rollout.md`; Senpan's move to huma, the last step before it, finished on November 10, and TarotGen.io's Go port was dropped on November 6). Those are done, and Home Library and Kindred have since moved their sign-in into huma, so building starts on November 18, 2026.

## What it is

- Vue 3 components built on Reka UI's headless primitives, which supply the WAI-ARIA roles, keyboard handling and focus management.
- Styled only through design tokens, written as plain CSS custom properties, so each app keeps its own look.
- Used by every Vue front end except MirageGO, which is left out for now (see Rollout order). Family Card Game is React and stays on Mantine. The résumé site loads Vue from a script tag with no build step, so it stays out too.
- Versioned and released on its own, apart from shared-tooling: an app takes a new kit version on purpose, never because a lint rule changed.

## Why replace what's there

The Vue apps use four approaches today: PrimeVue with Tailwind (Home Library, Kindred), Bulma with Reka UI (the Gallery, TarotGen.io), Reka UI with no styled library (MathBot, and Fantasy Dossier's dialog since November 15), and hand-written components (Senpan, Fingerprint Generator and the rest of Fantasy Dossier).

- **Bulma** is maintained, but barely: still on 1.0.4, with about 400K weekly npm downloads against Tailwind's 125M.
- **PrimeVue** works, but it's styled first, so apps keep overriding its look. Its published roadmap leans toward the paid PrimeVue+ suite and templates, with nothing on accessibility.
- **Each app's own components**, on Reka UI or hand-written, repeat the same work in every app, and each hand-written copy has to get keyboard and focus handling right on its own.

## Decisions

Decided for the kit on November 5, 2026:

- Reka UI underneath, with design tokens as plain CSS custom properties.
- No Bulma, PrimeVue, Tailwind or Font Awesome dependency. Icons come in through slots, so each app keeps its own Font Awesome setup, and the kit's CI never needs the Font Awesome Pro token.
- Vue is a peer dependency. Reka UI is a regular dependency at a pinned version, so apps don't manage it.
- Vapor waits. Reka UI's components are regular (virtual DOM) components, so the kit moves to Vapor only once Reka UI supports it.

Decided on November 18, 2026, after checking the plan against each app's code:

- Component names take the `Kit` prefix: `KitButton`, `KitDialog`, `KitConfirmDialog`. The shared ESLint refuses one-word names and the names of HTML elements (`vue/multi-word-component-names`, `vue/no-reserved-component-names`), so `Button` or `Dialog` can't pass. The prefix matches the `--kit-` tokens and the classes (`.kit-button__icon`), never collides with an app's own `Base*`, `App*` or `PageHeader` while the app moves over screen by screen, and a search for `Kit` shows where an app uses the kit.
- Tokens take the `--kit-` prefix (see Design tokens).
- Each component starts from the cleanest copy the apps already have, renamed and moved onto the kit's tokens, rather than being written fresh. MathBot's is the default: its dashboard, built November 12 to 17, has Reka-based versions of most of the first wave, written to the current standards, with AAA tokens in both color schemes, a contrast test, and a styleguide page that axe checks. Where another app's copy is cleaner, or MathBot has none, that one is the start (see What to build first).
- MathBot adopts the kit first, as the pilot, and MirageGO is left out for now (see Rollout order).
- The kit builds the one Markdown editor, `KitMarkdownEditor`, with a CommonMark dialect and a Discord one: Discord's mentions, emoji and timestamps show by name and are suggested as the person types from the first version, and Kindred's widgets and tables move onto it as Kindred's own extensions (see The Markdown editor).
- TypeScript stays on the standards' `~6.0` and doesn't hold the kit up. TypeScript 7.1, due in late November, moves Vue's type check onto TypeScript itself, but typescript-eslint doesn't support TypeScript 7 yet (8.73.0 still requires below 6.1) and Vue's support for it is an alpha. The kit moves when shared-tooling does, after the apps, since an app on 7.1 reads declarations built with 6.0 but the reverse isn't certain. No app moves to 7.1 in the same pass as it adopts the kit.

From the shared standards, as for every repo:

- ESLint, Prettier and Stylelint from shared-tooling's `lint/web`. The kit holds shared-tooling as a submodule at `shared/`, like every other repo.
- Vitest on jsdom with Vue Test Utils for behavior, its specs in `src/__tests__/` as `*.spec.ts` with the config in `vite.config.ts`, and Playwright with axe for whole pages.
- WCAG 2.2 AAA as the target, AA as the floor where AAA can't be met (shared-tooling's `standards/accessibility.md`).
- The repo is public.

## What to build first

Your apps already contain the same components several times over. The first wave covers those, starting with the ones repeated most. "Starts from" names the copy each component begins as; where it names more than one, the cleanest is chosen when the component is built. Kindred's own components are always among those compared where it has one (its FormField, PageHeader, PagePanel and FormDialog, say), as one of the cleanest apps, though it builds on PrimeVue rather than Reka UI. A copy is checked against the standards as it moves, not taken as it is: MathBot's button hover, which mixed the fill toward its own words, fell to about 6:1 in the light scheme, under AAA. Counts are files that use a component, as of November 18.

| Component | Built on | Starts from | Replaces today |
| --- | --- | --- | --- |
| KitButton, KitIconButton | Native `<button>` | MathBot's BaseButton and IconButton | PrimeVue Button (128 files across Home Library and Kindred); Bulma's `.button` in the Gallery and TarotGen.io; Senpan's `.btn` classes; TarotGen.io's IconButton |
| KitSpinner, KitLoadingOverlay | Plain markup | MathBot's LoadingSpinner; TarotGen.io's LoadingOverlay | LoadingSpinner in Senpan (51 files) and the Gallery; spinning icons in TarotGen.io and Fantasy Dossier; PrimeVue's `loading` spinners; TarotGen.io's LoadingOverlay |
| KitFormField | Label, help, error and required wiring | MathBot's FormField | FormField in Kindred (58 files), Home Library (30) and Senpan (29); Bulma's `.field` markup in the Gallery and TarotGen.io |
| KitTextField, KitTextarea, KitNumberField | Native inputs, Reka NumberField | MathBot's TextField, TextArea and NumberField | PrimeVue InputText, Textarea and InputNumber; Bulma's `.input` and `.textarea`; TarotGen.io's NumberField; Senpan's bare inputs |
| KitDialog, KitConfirmDialog | Reka Dialog, AlertDialog | MathBot's BaseDialog, ConfirmDialog and confirm queue; Kindred's FormDialog for the form; the Gallery's AppDialog for the alert form | PrimeVue Dialog and ConfirmDialog (Home Library; Kindred, mostly through its FormDialog); Senpan's ModalOverlay and ConfirmModal; TarotGen.io's BaseModal and ConfirmDialog; the Gallery's AppDialog; Fantasy Dossier's ModalDialog |
| KitToastHost, `useToast()` | Reka Toast | MathBot's ToastHost, ToastList and `useToast`; TarotGen.io's warning tone | PrimeVue Toast (Home Library, Kindred); Senpan's ToastNotification; the ToastContainers in TarotGen.io and the Gallery; Fantasy Dossier's ToastStack |
| KitPageHeader, KitPagePanel | Plain markup | MathBot's PageHeader and PagePanel, which name only the pages above; Kindred's status line under the title. Crumbs are RouterLinks only where the app has Vue Router, which the kit never imports | PageHeader in Kindred, TarotGen.io, Home Library, the Gallery and Fantasy Dossier; Senpan's SubPageHeader; PagePanel in Kindred and Home Library; Senpan's AdminPanel; Fantasy Dossier's SectionPanel |
| KitAlert, KitEmptyState, KitErrorState, KitLoadingState | Plain markup | MathBot's BaseAlert, EmptyState, ErrorState and LoadingState; the Gallery's flat look for an alert, so it never looks like a toast; Senpan's markup slot for the empty state's message. The error and loading states join because the standard keeps loading, empty and failed apart | PrimeVue Message (Kindred); Home Library's plain `role="alert"` and `role="status"` lines; Bulma's `.notification` in TarotGen.io; the Gallery's AppAlert and EmptyState; Senpan's EmptyState and sticky alerts |
| KitSelect, KitCombobox | Reka Select, Combobox | MathBot's BaseSelect and BaseCombobox, with its fix for Reka's stale active option | PrimeVue Select and AutoComplete; Kindred's SearchPicker; TarotGen.io's BaseSelect, DeckComboBox and SpreadComboBox; the Gallery's TagMultiSelect, a multi-select combobox; native selects in Senpan, the Gallery and Fingerprint Generator |
| KitSwitch, KitSegmentedControl | Reka Switch, ToggleGroup | MathBot's ToggleSwitch, which says its state in words; TarotGen.io's SegmentedControl, which always holds a value, named by a `group` KitFormField's caption | PrimeVue ToggleSwitch and SelectButton; TarotGen.io's ToggleSwitch and SegmentedControl; hand-made switches and button groups in Senpan, Kindred and Fingerprint Generator |
| KitTooltip | Reka Tooltip | MathBot's BaseTooltip | TarotGen.io's Tooltip, the Gallery's AppTooltip |
| KitLightbox | Reka Dialog | The Gallery's, TarotGen.io's or Fantasy Dossier's | The Gallery's AppLightbox, TarotGen.io's LightboxOverlay, Fantasy Dossier's ImageLightbox, Kindred's PhotoLightbox (PrimeVue Galleria) |
| KitTagInput | Reka TagsInput | TarotGen.io's TagInput, the only one on TagsInput | TagInput in TarotGen.io and Home Library |
| KitTurnstileWidget | Cloudflare's script, loaded once for every instance | Senpan's, TarotGen.io's or the Gallery's | The same widget in Senpan, TarotGen.io and the Gallery |

The first release, v0.1.0, holds the first six rows but KitLoadingOverlay: the jobs repeated most, and the pieces the rest build on (a dialog's buttons, a field's wrapper). MathBot moved onto it as the pilot while the rest of the wave was built. v0.2.0 adds the next four rows, and what the pilot asked for: a plain button for minor actions, more room in a dialog's footer, a way for an app's tests to see its toasts, and live regions that no test mistakes for an alert. v0.3.0 answers what MathBot's move onto v0.2.0 found: a slot that takes the submit button's place, an info tone an app can color, and no empty box where a slot's content is switched off. v0.3.1 answers what the move onto v0.3.0 found: a form dialog that opens on its first field whatever kind it is, and a quiet button that keeps AAA contrast on hover in an alert. v0.4.0 ships the kit's color pairs as their own entry, so an app's tests measure its colors with the weights the components write rather than copies of them. v0.5.0 drops the default colors: every color token is the app's to set, and the kit names them all. v0.6.0 names every other token too, so an app checks its theme without reading the kit's stylesheet. v0.7.0 finishes the wave with the tooltip, lightbox, tag input, Turnstile widget and loading overlay. v0.8.0 brings the second wave: tabs, popovers and the help tip, menus, pagination, the drawer, the date picker, and the data table on TanStack Table. v0.9.0 answers what MathBot's move onto v0.8.0 found: a menu that leaves the page as it is, row headers in the table and its rows kept while it reloads, a popover a form field can open, and a date picker as tall as the fields beside it. v0.10.0 answers what the move onto v0.9.0 found: a line under an empty table's title, and fields in a popover at the size of every other field. v0.11.0 brings the Markdown editor in its own entry, with its CommonMark and Discord dialects, and the Discord preview (see The Markdown editor). v0.12.0 brings Discord's embeds: the embed editor in Discord's own shape, the embed and message previews, and the color field (see The Discord embed editor).

The second wave covers the bigger pieces. Counts are files that use a component, as of November 20.

| Component | Built on | Starts from | Replaces today |
| --- | --- | --- | --- |
| KitTabs | Reka Tabs | MathBot's BaseTabs | Hand-made tab rows. Home Library's LibraryTabs is a row of links to other pages, which is navigation, not tabs |
| KitPopover, KitHelpTip | Reka Popover | Kindred's HelpTip, on PrimeVue's Popover | PrimeVue Popover (Kindred) |
| KitMenu and its items | Reka DropdownMenu | The Gallery's AppMenu and AppMenuItem, already on Reka, and its ThemeMenu for a choice of one | The Gallery's AppMenu and ThemeMenu |
| KitPagination | Reka Pagination | The Gallery's PaginationBar, with its jump to a page; Senpan's, which shows nothing for one page | Senpan's PaginationBar (7 files); PrimeVue's paginator (Home Library, 8 files) |
| KitDrawer | Reka Dialog | Kindred's HistoryDrawer, on PrimeVue's Drawer | PrimeVue Drawer (Kindred) |
| KitDatePicker | Reka DatePicker | No app has a calendar worth porting; the model is Home Library's and MathBot's `YYYY-MM-DD` | PrimeVue DatePicker (Kindred, 4 files); native date inputs (Home Library, MathBot, TarotGen.io, Senpan) |
| KitDataTable | TanStack Table (decided 2026-11-20) | Senpan's DataTable, with its toolbar and pager; TarotGen.io's SortableTh for the sort header's button and `aria-sort` | PrimeVue DataTable (Kindred, 32 files; Home Library, 22); Senpan's DataTable (13); TarotGen.io's sortable tables (8) |

The table's first cut holds what most lists use: sortable columns, a search with its count, pages, selection across the pages, a row's own actions in a column of its own, and the four states. Expandable rows, facet filters, group rows, a CSV of the rows matching, resizable columns, and Kindred's rows as labelled cards on a phone follow as the apps that use them move onto it.

A date range, a time and a date with a time aren't in the first cut: a range is two pickers, one bounding the other, as Home Library's loans and TarotGen.io's filters already are, and times stay native inputs until an app asks for more. The Markdown editor comes beside the wave, as its own piece (see The Markdown editor).

Components that belong to one app stay in that app, such as Senpan's bingo board, TarotGen.io's spread editor and Home Library's book cover.

## The Markdown editor

Decided on November 18, 2026, from what the apps run today. The standards already settle the editor itself: TipTap 3 with its Markdown package, storing Markdown (`standards/packages.md`). What the kit adds is one editor, with its toolbar, in place of each app's own.

### What the apps have

Counts and versions as of November 18; every `@tiptap/*` package is at 3.34.0.

| App | Editor | How it reads and writes Markdown | Toolbar | Used in |
| --- | --- | --- | --- | --- |
| Kindred | `MarkdownEditor.vue` on TipTap | `@tiptap/markdown`, with a custom `{{widget}}` block, GitHub tables, and aligned text written as HTML | Bold, italic, H2, H3, lists, quote, alignment, link, table tools, a widget menu | 5 places; its Discord messages are a plain text box with a preview of its own (`discordMarkdown.ts`) |
| Senpan | `MarkdownEditor.vue` on TipTap, built without the Vue package and loaded on first use | `@tiptap/markdown` on a `Marked` of its own, with Discord-safe overrides, since the same text is posted to Discord: a bare newline is a line break, `<t:…>`, `<@id>` and `<:n:id>` pass through, underline is off. It patches the package's private `encodeTextForMarkdown` to get there | A heading select, bold, italic, strike, code, lists, link, an emoji picker, quote, divider | 12 admin tabs |
| TarotGen.io | `MarkdownEditor.vue` on TipTap | No `@tiptap/markdown`: `marked` turns Markdown into HTML on the way in and `turndown` back on the way out, short of the standard | Bold, italic, H2, quote, lists, code, a link through `window.prompt` | 3 places |
| MathBot | None: a plain text box with a character count | Its own 270-line renderer (`app/markdown.ts`) previews Discord's Markdown, mentions, emoji and timestamps included | None | The message composer, an embed's description and its fields' values |

### The shape

- **One component, `KitMarkdownEditor`, in an entry of its own** (`@jwill89/shared-components-vue/editor`), which an app loads on first use. TipTap's core, StarterKit, Vue package and Markdown package come to about 136 KB gzipped (measured with rolldown, Vue left out), several times the rest of the kit, so an app without an editor never carries it (`standards/performance.md`).
- **It stores Markdown, and a toolbar sits above the text**, built from the kit's own parts on Reka's Toolbar and Toggle primitives (TipTap's own UI components are for React). Each tool names the extension it needs, so the toolbar shows only what the editor can write. Icons come in through slots, as everywhere in the kit.
- **A `dialect` prop says which Markdown it writes**: `commonmark`, the default, for the apps' own pages, or `discord` for text that is posted to Discord. Each dialect brings its own extensions, its own reader and the kit's own writer. The CommonMark dialect reads through TipTap's Markdown package on a `Marked` of its own, never `marked`'s global instance, which `@tiptap/markdown` falls back to: one dialect's rules would leak into every editor on the page. The Discord dialect reads through the kit's own grammar of Discord's Markdown, the one `KitDiscordPreview` draws with (decided 2026-11-22): Discord's Markdown is a grammar of lines, where each line stands alone, `>` quotes one line and a line after a list is no part of it, so `marked`'s block rules would have to be replaced nearly whole, and one grammar for the editor and the preview keeps the two in step.
- **A `profile` prop narrows a dialect for one field**: `full`; `inline`, marks only, for a Discord embed's title or a field's name; and `plain`, for a footer, which takes no Markdown at all.
- **An app adds its own pieces through an `extensions` prop**: each extension brings its Markdown syntax and, where it has one, its toolbar tool. Kindred's `{{widget}}` block and its tables move onto the kit's editor this way, rather than Kindred keeping an editor of its own (decided 2026-11-18). An extension one app needs stays in that app; one a second app needs moves into the kit.
- **It sits in a KitFormField** like any control (`id`, `describedBy`, `invalid`), and its `limit` counts the Markdown it writes, which is what a server and Discord count, not the text on screen.

### The Discord dialect

In the CommonMark dialect, TipTap's Markdown package lets an app's extension bring its own syntax (`markdownTokenizer`, `parseMarkdown`, `renderMarkdown`), which `marked` tries before its own rules. Discord's meanings are the kit's grammar's, checked against Discord's [own article on Markdown](https://support.discord.com/hc/en-us/articles/210298617) and its [message formatting reference](https://docs.discord.com/developers/reference):

- `__text__` is **underline**, not bold: TipTap's Underline, which reads and writes only `<u>`, is extended to read and write `__`.
- `||text||` is a **spoiler**, a line starting `-#` is **subtext**, and `>>>` quotes to the end of the message: a new mark and two new blocks.
- Every newline is a line break; headings stop at level 3; there are no tables, images, HTML, rules or reference links, so the dialect switches those rules off, as Senpan's editor already does.
- **Mentions, channels, roles, custom emoji, timestamps and slash commands** (`<@id>`, `<#id>`, `<@&id>`, `<:name:id>`, `<t:unix:R>`, `</name:id>`) are atoms that write their raw token back and show by name from the first version (decided 2026-11-18):
  - A person sees `@Sam`, `#general`, a role in its own color, the emoji itself, and a time as Discord would show it ("in 2 hours"), never the raw token. A screen reader hears the same name.
  - The app supplies the names, since only it can reach the server: a `names` prop for what the text already holds (as MathBot's preview takes them), and a `suggest(kind, query)` callback the editor calls as the person types, so a server with thousands of members is searched, not listed whole.
  - Typing `@` suggests members and roles, `#` channels, `:` emoji and `/` commands, through TipTap's Suggestion utility (MIT), which its Mention extension is built on, on the kit's own list of choices, which the keyboard drives. A timestamp comes from a toolbar tool: a date and a time, then how Discord should show it.
  - A token whose name the app doesn't know shows as a plain, readable placeholder ("unknown member"), and is still written back unchanged.
- A Discord preview is a second, smaller piece: MathBot's renderer and Kindred's `discordMarkdown.ts` do the same job twice, so MathBot's, the cleaner, becomes the kit's `KitDiscordPreview`, beside the editor, drawing what the kit's grammar reads rather than replacing marks in a string.
- Where the grammar reads otherwise than Discord, noted on November 22: a mark that runs across a line's end (`**a` then `b**`) is left as written, where Discord carries it across, since the editor never writes one; and `:smile:` stays words, since drawing Unicode's emoji by name needs a table of them all, which an app's `suggest` can offer instead.

**How it is tested.** Each dialect has round-trip specs: every construct read and written back unchanged. The kit's Discord grammar is held to Discord's own parser on every construct, and what the editor writes is read by it as the editor shows it, every run of marks included. Discord's own parser, [`@discord/markdown-wasm`](https://www.npmjs.com/package/@discord/markdown-wasm) (MIT, published by Discord), is the test oracle for the Discord dialect: what the editor writes, Discord must read as the editor meant it. At 1.2 MB of WebAssembly it stays a development dependency and never ships.

**The risks, each with its answer:**

- `@tiptap/markdown` calls itself an early release, and its writer rewrites some text as it saves (`_x_` comes back as `*x*`). The round-trip specs catch every rewrite before an app sees it, and the kit takes its new versions one at a time (Dependabot holds it to a pull request of its own, as Reka UI).
- Escaping goes through the package's private `encodeTextForMarkdown`, which Senpan patches. The kit doesn't patch a private function: both dialects write through the kit's own writer, which escapes text only where it would read as Markdown, and hands a node of an app's own to that extension's own Markdown.
- Pasted text has no handling in the package: the editor reads pasted text as its dialect's Markdown and pasted HTML through its own pieces, and copies as Markdown; specs paste both.

**Who adopts it, and when.** It comes after the first wave, beside the second, as its own minor release. Senpan and MathBot first, since both write text that is posted to Discord and gain the most, and each serves the names and suggestions from its own server's data; then Kindred, with its widgets and tables as its own extensions, and its Discord messages on the Discord dialect in place of its plain text box; then TarotGen.io, which leaves its `marked` and `turndown` round trip for the standard's package.

## The Discord embed editor

Decided on November 22, 2026: the kit takes on the embed, the boxed part of a Discord message, since two apps already build one each. It comes in the release after the Markdown editor, on top of it and of `KitDiscordPreview`.

| App | Editor | Preview | Parts it edits |
| --- | --- | --- | --- |
| MathBot | `EmbedEditor.vue` and `EmbedFields.vue`, on the kit's fields | `MessagePreview.vue`, on its own renderer (`app/markdown.ts`) | Title and its link, words, author, footer, colour with Discord's own swatches, a large and a small picture, fields side by side or not |
| Kindred | `EmbedEditor.vue` and `EmbedFields.vue`, on PrimeVue | `MessagePreview.vue`, on `discordMarkdown.ts` | Title and its link, words, a line above the title, footer, colour, a large and a small picture, fields |

- **`KitDiscordEmbedEditor`** edits one embed as a `v-model` object, in the shape Discord's API takes, so an app posts it as it is: its title and link, words, color as Discord's number, author (`name`, `url`, `icon_url`), footer (`text`, `icon_url`), image and thumbnail (`url`), time and fields. Decided on November 26, 2026, over the flat shape both apps store today: Discord's shape is the published contract a bot posts, and one model is kept rather than two that could disagree, so an app that stores its own shape converts at its edge. Its words and each field's value are KitMarkdownEditors in the Discord dialect, its title and field names the `inline` profile, and its footer and author the `plain` one. Each part counts against Discord's own limit, and the whole embed against its 6,000 characters. The pictures are URLs, as Discord takes them (`attachment://file.png` for an upload among them), and the app's to list, since only it holds them: it passes the choices, and the editor stores the one picked.
- **`KitColorField`** picks the bar's color: MathBot's ColorField, on Reka's color primitives, with Discord's own colors offered. Kindred's color is PrimeVue's picker, so it is the second app to want one.
- **`KitDiscordEmbedPreview`** draws one embed as Discord does: its bar of color, author, title, words, fields in their rows, pictures, footer and time, drawn through `KitDiscordPreview` with the same names. The bar's color is the embed's own, which the kit sets from data, as a role's color in a mention. An app turns a picture's URL into one a browser shows (an upload's, say). **`KitDiscordMessagePreview`** draws the whole message around it, as both apps' previews do: the sender with Discord's App tag, the text, each embed, and the pictures under them.
- Each app's own pieces stay in it: MathBot's picture list and Kindred's channel and role fields.
- MathBot moves first, as with every kit piece, then Kindred, whose move off PrimeVue takes it there anyway.

## Design tokens

- Every color, space, radius, font and shadow a component uses comes from a token, never a hard-coded value. A Stylelint rule enforces it.
- Tokens have semantic names (surface, text, muted, accent, danger, focus ring), not raw colors. Each app sets its colors on them in one file, so TarotGen.io keeps its mystic palette and Fantasy Dossier its vellum.
- Today each app names its variables its own way: `--myst-*` in TarotGen.io; `--seal-*`, `--paper-*` and about 40 other groups in Fantasy Dossier; `--color-*` in Kindred and Home Library, beside PrimeVue's `--p-*`; and plain semantic names (`--surface`, `--text`, `--accent`) in the Gallery, Senpan, MathBot and Fingerprint Generator. Tailwind 4 owns `--color-*`, `--radius-*`, `--text-*`, `--font-*` and `--shadow-*` in the two Tailwind apps. So kit tokens take the `--kit-` prefix, which nothing in the apps uses (decided 2026-11-18).
- The kit's CSS sits in a cascade layer (`@layer kit`), so an app's own styles always win without specificity fights.
- The kit ships no colors, as Reka UI ships none: every color token is the app's to set, in each scheme it serves, so the colors and their contrast are each app's alone (decided 2026-11-19, after the first releases carried a default theme). The kit keeps its structure: sizes, spaces, type, the focus ring's shape, and the washes and hovers it mixes from the app's colors.
- `contrast.ts` names every color token and every pair the components draw, with its floor: 7:1 for words, the AAA level, and 3:1 for a control's border or an icon. Each app runs the pairs in its own colors through `pairRatio()` from the package's `/contrast` entry, where a pair that reaches only AA is a recorded exception. The kit's own run measures them in the playground's colors, which began as MathBot's.

## Accessibility

- Reka UI supplies roles, keyboard handling and focus management. The kit adds a visible focus ring from a token, 44 px touch targets (as Home Library already requires), and `prefers-reduced-motion` handling for every animation.
- Each component has Vitest tests for its behavior, with axe run on what it renders.
- A `playground/` app shows every component in every state, in light and dark. Playwright and axe run against it through `test/a11y`, with axe's AAA rules on (`[...WCAG_22_AA, 'wcag2aaa']`) from the start, as the Gallery's and TarotGen.io's suites already have them, so a regression below AAA fails CI.

## Repo layout and build

- `src/components/` holds the components, one file each (`KitButton.vue`), and `src/__tests__/` their specs, as `standards/testing.md` asks.
- `src/composables/` holds what code calls rather than renders: `confirm()` for KitConfirmDialog, `useToast()` for KitToastHost, and the announcer both toasts and dialogs read out through.
- `src/tokens/` holds the tokens, the color tokens' names and the pairs they meet in.
- `playground/` is a small Vite app for review and for the Playwright and axe runs.
- Vite's library mode builds ES modules plus type declarations (vue-tsc), and one CSS file that apps import once.
- `shared/` is the shared-tooling submodule, for lint and test configs and CI workflows.

## Releases

- Semantic version tags (`v1.0.0`) with a CHANGELOG. Breaking changes only in major versions.
- Apps install the package each release carries: CI packs the build it checked and attaches it to the GitHub release, and an app installs that file by its URL (`npm install https://github.com/jwill89/shared-components-vue/releases/download/v1.0.0/jwill89-shared-components-vue-1.0.0.tgz`). The lockfile pins its hash, nothing is built on the app's side, and no install script runs (decided 2026-11-18).
- Installing the git tag instead (`github:jwill89/shared-components-vue#v1.0.0`) was tried on November 18 with npm 11.20: npm cloned the kit, fetched its `shared/` submodule, installed its development tools and ran a `prepare` build, about 40 seconds on each fresh install, and warned that the script wasn't approved, a warning the MathBot pilot then met in the packed file too. So the package has no `prepare` script any more, and the release file is the only way apps take the kit. Publishing to npm stays open, if Dependabot's updates of the kit are wanted.
- The kit's `shared/` is for its own lint, tests and CI. Nothing from it ships in the package, which holds only the built files, so an app on a different shared-tooling release takes the kit just the same, and each repo moves its own `shared/` when it chooses.

## Rollout order

An app adopts the kit only after its shared-tooling rollout, whose end-to-end suite and axe checks show the swap broke nothing, and never in the same pass as a backend change (decided 2026-11-06). Those suites find elements by role and label, never by a Bulma or PrimeVue class, so they pass before and after.

1. **MathBot first, as the pilot.** The kit starts from its components, so its switch is mostly imports and a token map. It proves the install from a release's file, the `@layer kit` stylesheet and the token mapping before any app's screens change, and its styleguide page and axe checks show that nothing moved.
2. **The Gallery and TarotGen.io next.** Both already use Reka UI, and both drop Bulma. Bulma also supplies layout helpers (columns, spacing), which those apps replace with plain CSS at the same time. TarotGen.io's unit tests find about 70 elements by CSS class, some of them on components the kit replaces, so those move to role and label queries first.
3. **Home Library and Kindred.** They replace PrimeVue screen by screen; PrimeVue is removed once its last import goes. Kindred's end-to-end suite covers only its public pages, while 81 of its 141 PrimeVue files are in `views/manage` and `views/staff`, so it gains signed-in tests that reach those first.
4. **Senpan, Fantasy Dossier and Fingerprint Generator.** They swap their hand-written equivalents and map their themes onto the kit's tokens. Senpan's unit tests find about 169 elements by its own CSS classes, so those move to role and label queries first. Its next phase, the Discord bot, is a backend change, so its switch comes before or after that, never with it.

MirageGO is left out for now (decided 2026-11-18). It stays outside shared-tooling (`MirageGO/plans/shared-tooling-rollout.md`, 2026-11-11), so the rule above never lets it adopt the kit, and it has no tokens to map: its colors are written into each component.

## Open questions

None open. Decided 2026-11-20:

- **Data table.** It is built on TanStack Table (`@tanstack/vue-table`, MIT), which Senpan already uses, as a dependency of the kit kept outside its bundle, with the kit's own markup: a sortable heading holds a button and carries `aria-sort`.
- **A list paged on the server.** The table takes the whole list by default, as the standards ask. It also takes one page the server gives (`total`), for a list too large to send whole, such as the Gallery's tags, TarotGen.io's readings and Kindred's audit log; an app that uses it records the list as a departure in its own `AGENTS.md`.

## Sources

The component counts come from each app's source code in `C:\Web Projects` on November 5, 2026, checked again on November 18.

- [PrimeVue roadmap](https://primevue.org/roadmap)
- [Bulma vs Tailwind CSS](https://devtools-vs.pages.dev/bulma-vs-tailwindcss)
