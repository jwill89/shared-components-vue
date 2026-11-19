# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.0] - 2026-11-18

A page's frame, its alerts and its states, the choice controls, and what the MathBot pilot asked for.

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

- The package's `prepare` script: a git install of the package no longer builds it. An app installs the release's file, as the README says.

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

[0.2.0]: https://github.com/jwill89/shared-components-vue/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/jwill89/shared-components-vue/releases/tag/v0.1.0
