# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.10.0] - 2026-11-20

A line under an empty table's title, and fields in a popover drawn at the size of every other field.

### Added

- KitDataTable's `emptyMessage` and `noMatchMessage`, a line under its empty and nothing-matching states' titles.

### Fixed

- A field in a KitPopover draws at the size of every other field, where it took the popover's small text; the popover is drawn at the body's size, whatever its control sits in, and a KitHelpTip's note stays small.

## [0.9.0] - 2026-11-20

A menu that leaves the page as it is, a table whose rows have headers and stay while it reloads, a popover a form field can open, and a date picker as tall as the fields beside it.

### Added

- KitDataTable's `rowHeader` column, whose cells name their rows, as a screen reader reads with every other cell; and the `empty-icon`, `no-match-icon` and `error-icon` slots for its states' icons.
- KitPopover's `id`, which gives its trigger a form field's id, so the field's label names a trigger that is the field's control.
- KitMenu's `modal`, which hides the page from screen readers and holds focus in the menu while it is open.

### Changed

- KitMenu leaves the page as it is while open, where it hid the page from screen readers and so failed axe; its plain items line up with its label, the check's room kept for a choice's items.

### Fixed

- KitDataTable keeps its rows while it reads the list again, marked busy with a line that says it is loading, where it swapped them for the loading state.
- KitDatePicker stands as tall as a text box beside it, where it was 2 px taller.

## [0.8.0] - 2026-11-20

The second wave: tabs, popovers and the help tip, menus, pagination, the drawer, the date picker and the data table.

### Added

- KitTabs, a page in parts with a row of tabs over the chosen one's part: the arrow keys move along the row and Enter chooses, so passing a tab opens nothing. The chosen tab is raised, edged and underlined, not only colored.
- KitPopover, a small panel opened by a press of the control beside it, for a note or a few controls of its own, named by its control's words; and KitHelpTip, a question mark beside a title, named "About" and its topic, that opens a short note.
- KitMenu, the actions a row has no room for behind one button, with KitMenuItem, KitMenuLabel, KitMenuSeparator, and KitMenuRadioGroup with KitMenuRadioItem for a choice of one. It reads like an open select's list, and an action that can't be undone is drawn in the danger color.
- KitPagination, the pages of a long list: Previous, the page numbers around the one shown with the first and last always there, Next, and past a few pages a box that goes straight to one. It shows nothing for a single page.
- KitDrawer, a modal the full height of the screen against one side, with its title and footer in view while its body scrolls.
- KitDatePicker, a date typed in its parts or picked from a calendar, as `YYYY-MM-DD`, held between `min` and `max`, in a `group` KitFormField.
- KitDataTable, the one table a list of records sits in: given the whole list it searches, sorts and pages it itself; a sortable heading is a button that says which way it sorts; loading, failed, empty and nothing matching show in the rows' place; `selectable` selects rows across the pages; and wider than its panel, it scrolls inside its frame. Given one page and the count of every row, it leaves all three to the server. The `KitColumn` and `KitSort` types come with it.
- `--kit-width-popover` and `--kit-width-drawer`, for an app that sizes a popover or a drawer otherwise.

## [0.7.0] - 2026-11-20

The rest of the first wave: the tooltip, the loading overlay, the lightbox, the tag input and the Turnstile widget.

### Added

- KitTooltip, a short note on a control, shown on hover and on focus and gone on Escape, which adds to the control's name and never stands in for it. It needs Reka's `TooltipProvider` once at the app's root.
- KitLoadingOverlay, a cover over a region while something it started must finish: the content can't be reached or pressed and is marked busy, a panel says what is under way, and focus that was inside waits on the panel and goes back afterwards.
- KitLightbox, images one at a time as large as the screen allows, named by each image's description: the arrow keys and its buttons move through several, "Full size" shows one at its own size, and a bar holds the caption, the place among the rest and a link to the original.
- KitTagInput, a list of short words typed into a field: Enter or a comma adds one, each shows as a chip with its own Remove button, and suggestions add one with a press.
- KitTurnstileWidget, Cloudflare Turnstile's check against bots, its token the model. Cloudflare's script loads once for every widget, admitted by the page's nonce, and the widget says so when it can't load.
- `--kit-layer-cover`, `--kit-width-tooltip` and `--kit-height-turnstile`, for an app that wants a loading cover, a tooltip or a Turnstile check placed or sized otherwise.

### Changed

- KitCombobox's chips are drawn as KitTagInput's are, with the classes `kit-chip` and `kit-chip__label`.

## [0.6.0] - 2026-11-19

The name of every token the kit has, for an app's theme check.

### Added

- `KIT_TOKENS` in `@jwill89/shared-components-vue/contrast`: the name of every token the kit has, the colors among them, so an app's test can check its theme sets only names the kit reads.

## [0.5.0] - 2026-11-19

No colors of its own: every color is the app's to set.

### Added

- `COLOR_TOKENS` in `@jwill89/shared-components-vue/contrast`: every color token an app sets.

### Removed

- The default colors. The kit draws no color of its own: an app sets every color token, in each scheme it serves, and where one is unset nothing is drawn with it. The scrim behind a dialog and the shadow under what floats stay neutral black.

## [0.4.0] - 2026-11-19

The kit's color pairs, for an app to measure its own colors with.

### Added

- `@jwill89/shared-components-vue/contrast`, every color pair the kit holds, the washes and hovers its components mix among them, and `pairRatio()`, which measures a pair in the colors an app gives. An app that maps the tokens to its own colors tests each pair in them, with the kit's own weights rather than copies that a release can leave behind.

## [0.3.1] - 2026-11-18

A form dialog that opens on its first field whatever kind it is, and a quiet button that keeps AAA contrast on hover in an alert.

### Fixed

- A form dialog opens on its first field whatever kind it is, a select, a switch or a segmented control among them, where it passed over any but a text box and opened partway down the form. A disabled field is still passed over.
- A quiet button in an alert keeps AAA contrast on hover in the dark scheme, where it fell just short: an alert's wash, and a failed load's, is a shade fainter for it.

## [0.3.0] - 2026-11-18

A slot in the submit button's place, an info tone an app can color, and fixes to the loading state and to empty slots.

### Added

- KitDialog's `submit` slot, which takes the submit button's place, as a Reload does once a save has met a conflict and could only be refused again. While what it holds is switched off, the kit's own submit button shows.
- `--kit-info`, the tone of an informing alert and toast, for an app that marks information in a color of its own. It is the muted text's grey until an app maps it, as before.
- The package carries CHANGELOG.md, so an app can read what a release changed where it installed it.

### Fixed

- KitLoadingState draws its words at the size of the text around them; only its ring is large.
- A box the kit draws around an app's slot (a dialog footer's start, a panel's actions, an alert's buttons, a button's icon) is left out when everything in the slot is switched off with `v-if`, so it leaves no empty gap behind.

## [0.2.0] - 2026-11-18

A page's frame, its alerts and its states, and the choice controls, with a plain button, more room in a dialog's footer, and toasts an app's tests can follow.

### Added

- KitPageHeader, the one page header: the page's one h1, a line on what the page is for (with markup where it needs it), the trail of pages above it, and the page's own actions. Each crumb moves within the app without a reload where the app has Vue Router, and is a plain link where it hasn't; its separators are hidden from screen readers.
- KitPagePanel, the one panel a page's content sits in: a section named by its heading, with a line under the heading, buttons at its end and a footer, and an h3 for a panel inside a panel.
- KitAlert, a condition sat flat in the page where it applies, in four tones: a wash of its tone and an icon whose shape differs by tone, its words in the text color, and buttons that resolve it. One that appears while the page is open is read out at once.
- KitEmptyState, KitErrorState and KitLoadingState, the three things a list can say once its data is asked for: nothing here, with what to do; "Couldn't load …" with the server's own words and Try again; and what is loading, as a status.
- KitSelect, a choice of one from a short list, opened and chosen from by keyboard alone, its model the option's own value.
- KitCombobox, a choice from a list long enough to search: typing narrows it, options sit under their group's heading, and with `multiple` each choice shows as a chip with its own Remove button, or a single choice can be cleared.
- KitSwitch, an on and off switch that says "On" or "Off" in words beside it, in the app's own words where it gives them.
- KitSegmentedControl, a choice of one from a few options all in view, moved through by the arrow keys, that always holds a value; the chosen option is filled and bold.
- KitFormField's `group` form, for a control that is a group of buttons: its caption names the group, as a label can't.
- KitButton's `plain` variant, for a minor action: its words in the text color with no border, and a faint wash and an underline on hover. The dialog's Close, a toast's Dismiss and the combobox's Clear and Remove use it.
- KitDialog's `footer-start` slot, for an action of the form's own at the footer's start, beside Cancel and submit, and its `submit-icon` slot, for an icon on the submit button. The default and `footer-start` slots are handed the form's id, `formId`, for a button that submits the form from outside it.
- `onToast()`, which hears each toast as it is raised, for an app's own log or its tests, and `dismissAllToasts()`, which closes every one, as tests do between cases. The `KitToast` and `KitToastTone` types come with them.

### Changed

- A toast with no icon from the app shows its tone's own shape, not a dot, so color is never the only thing that tells one tone from another.
- The live regions that read toasts out are plain `aria-live` regions, without the status and alert roles, so an open dialog no longer holds an empty alert that an app's test finds before its own.

### Removed

- The package's `prepare` script, so a git install builds nothing: the release's file is the package.

## [0.1.0] - 2026-11-18

The first release: the jobs the apps repeat most, and the pieces the rest build on.

### Added

- Each release carries the built package, which an app installs by its URL, with nothing built or run on install.
- The design tokens (`--kit-*`) and their default theme, in light and dark at AAA contrast, in one stylesheet an app imports once.
- KitButton, in four variants (primary, secondary, danger and quiet), with a leading icon from the app's own icon set, a busy state that shows a spinner and can't be pressed again, a disabled state, and a link form for an action that opens another page. Every variant keeps AAA contrast on hover.
- KitIconButton, a button that shows only an icon, named by a label it can't be made without, which also shows as the browser's tooltip.
- KitSpinner, a turning ring that takes the size and color of the text around it, and that says what is loading as a status when given words.
- KitFormField, the one field wrapper: the label above its control, and the error and hint below it, each read with the control by a screen reader. A required field shows an asterisk and says "(required)" in words. Its slot hands the control its id and what describes it, and a hint may hold markup, such as a link.
- KitTextField, a one-line text box, as text, email, URL, search, phone, password, date or time, with a placeholder that keeps AAA contrast.
- KitTextarea, a text box of several lines with an optional running count against a limit. Text past the limit stays, marked as over, and a screen reader is told as the remainder runs low.
- KitNumberField, a number box with a button either side to step it, which the arrow keys, Page Up and Down, and Home and End step too, held to its least and most. It groups thousands unless told how to write the number, so a year can be written without a comma, and an amount as a percent or a currency.
- KitDialog, the one modal: it holds focus while open, locks the page behind it, closes on Escape and gives focus back to what opened it, with a header and footer that stay in view while a long body scrolls. Given a submit label it is a form, which opens on its first field, submits on Enter, waits while it saves, and never closes on a click outside, where it would lose what was typed.
- KitConfirmDialog, the question before an irreversible action, announced as an alert, with focus starting on Cancel. It stays open while its action runs.
- `confirm()`, which asks through the app's one KitConfirmHost and resolves to the answer, one question at a time. It refuses to ask while no host is mounted, rather than waiting for an answer that can't come.
- Toasts, raised with `useToast()` and shown by the app's one KitToastHost: success, error, warning and info, at the screen's top edge and above any dialog, each for a few seconds and held while hovered or focused. A screen reader hears each one, errors and warnings at once, including while a dialog is open. A press on a toast leaves an open dialog open.

[0.10.0]: https://github.com/jwill89/shared-components-vue/compare/v0.9.0...v0.10.0
[0.9.0]: https://github.com/jwill89/shared-components-vue/compare/v0.8.0...v0.9.0
[0.8.0]: https://github.com/jwill89/shared-components-vue/compare/v0.7.0...v0.8.0
[0.7.0]: https://github.com/jwill89/shared-components-vue/compare/v0.6.0...v0.7.0
[0.6.0]: https://github.com/jwill89/shared-components-vue/compare/v0.5.0...v0.6.0
[0.5.0]: https://github.com/jwill89/shared-components-vue/compare/v0.4.0...v0.5.0
[0.4.0]: https://github.com/jwill89/shared-components-vue/compare/v0.3.1...v0.4.0
[0.3.1]: https://github.com/jwill89/shared-components-vue/compare/v0.3.0...v0.3.1
[0.3.0]: https://github.com/jwill89/shared-components-vue/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/jwill89/shared-components-vue/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/jwill89/shared-components-vue/releases/tag/v0.1.0
