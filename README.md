# shared-components-vue

Vue 3 components for jwill89's front ends, built on [Reka UI](https://reka-ui.com)'s headless primitives and styled only through design tokens, so each app keeps its own look. Reka UI supplies the roles, keyboard handling and focus management; each kit component adds a visible focus ring, 44 px touch targets and reduced-motion handling. The kit draws no color of its own: each app sets every color, and holds the pairs the kit names to WCAG AAA contrast in them.

The latest release, v0.5.0, has the buttons, the spinner, the form field and its text and number fields, the dialog with its confirm form, and the toast; the page header and panel, the alert, and the empty, failed and loading states; and the select, the combobox, the switch and the segmented control; and the color pairs an app measures its own colors with. [CHANGELOG.md](CHANGELOG.md) lists what each release brought, and [PLAN.md](https://github.com/jwill89/shared-components-vue/blob/main/PLAN.md) the rest and the order they come in.

## Using it in an app

Install the package a release carries, by its URL. It is already built, so nothing builds or runs on install, and the lockfile pins its hash:

```bash
npm install https://github.com/jwill89/shared-components-vue/releases/download/v0.5.0/jwill89-shared-components-vue-0.5.0.tgz
```

To take a later release, install its file the same way.

Import the stylesheet once, before the app's own styles:

```ts
// main.ts
import '@jwill89/shared-components-vue/style.css'
```

The package marks only its CSS as having side effects, so the components arrive unstyled without this line.

### Your own base styles

The kit's styles sit in the `kit` cascade layer, and a rule outside any layer beats every layered rule, whatever its selector. That is what lets an app's own classes restyle a kit component without a fight, and also what breaks one: an unlayered element rule in the app's base stylesheet, such as `button { color: inherit }`, `a { color: … }` or `:focus-visible { … }`, beats the kit's components too, so a primary button's words take the page's color and its focus ring the page's.

So name the layers' order in a stylesheet of its own, imported before the kit's, and put the app's element rules in `base`:

```css
/* src/styles/layers.css, imported first */
@layer base, kit;
```

```css
/* the app's base stylesheet */
@layer base {
  a { color: var(--link); }
  button { font: inherit; color: inherit; }
}
```

An app on Tailwind 4 names its layers around Tailwind's: `@layer theme, base, kit, components, utilities;`. The app's class rules stay unlayered, over the kit's.

### Your colors

The kit draws no color of its own. Every color a component draws is a `--kit-*` color token the app sets, in a stylesheet of its own:

```css
/* src/styles/kit-theme.css */
:root {
  --kit-surface: var(--page); /* the page's background, which the components sit on */
  --kit-surface-raised: var(--panel); /* panels, dialogs, toasts, open lists and fields */
  --kit-surface-sunken: var(--well); /* a switch's track, a number box's step buttons, a combobox's chips */
  --kit-text: var(--ink);
  --kit-text-muted: var(--ink-soft);
  --kit-accent: var(--brand); /* a primary button's fill, a quiet button's words, a switch that is on, the chosen segment */
  --kit-on-accent: var(--on-brand); /* words on the accent */
  --kit-focus-ring: var(--brand);
  --kit-danger: var(--danger); /* a danger button's fill, a field's error, an error alert's tone */
  --kit-on-danger: var(--on-danger); /* words on the danger color */
  --kit-success: var(--success);
  --kit-warning: var(--warning);
  --kit-info: var(--brand); /* an informing alert's and toast's tone */
  --kit-control-border: var(--edge); /* a control's edge */
  --kit-hairline: var(--rule); /* a divider */
}
```

A token left unset draws nothing: no fill, border or focus ring, and words in the color around them. `COLOR_TOKENS` in `@jwill89/shared-components-vue/contrast` names every one, so a test can check the app sets them all. The scrim behind a dialog and the shadow under what floats are neutral black, which the kit sets and an app may change (`--kit-scrim`, `--kit-shadow-overlay`). The rest of the tokens, the fonts, sizes, spaces and timings, are in [src/tokens/tokens.css](https://github.com/jwill89/shared-components-vue/blob/main/src/tokens/tokens.css), each with a value an app may change the same way.

A color that changes with the scheme is written `light-dark(light, dark)`, and follows the `color-scheme` the app declares on its page. Declare it in CSS (`:root { color-scheme: light dark; }`, and the scheme a user picks on the `html` element's class or attribute): an app's production build rewrites `light-dark()` into a form that works only beside a `color-scheme` written in CSS.

### Measuring your colors

The kit names every pair of colors that meet in its components, and the floor each holds to: 7:1 for words, the AAA level, and 3:1 for a control's border or an icon. The contrast is the app's, in its own colors: `@jwill89/shared-components-vue/contrast` lists every pair, the washes and hovers the components mix among them, and `pairRatio()` measures one in the colors the app gives, each token's by its name without `--kit-`, as `[red, green, blue]`. A test that runs them all fails the day a color, or a wash the kit changes, falls below its floor:

```ts
import { COLOR_TOKENS, TOKEN_PAIRS, describePair, pairRatio, parseHex } from '@jwill89/shared-components-vue/contrast'

it('sets every color the kit draws with', () => {
  expect(COLOR_TOKENS.filter((token) => ourColor(token, 'light') === undefined)).toEqual([])
})

describe.each(['light', 'dark'] as const)('in the %s scheme', (scheme) => {
  it.each(TOKEN_PAIRS.map((pair) => [describePair(pair), pair] as const))('%s holds its floor', (_, pair) => {
    expect(pairRatio(pair, (token) => parseHex(ourColor(token, scheme)))).toBeGreaterThanOrEqual(pair.floor)
  })
})
```

`ourColor` is the app's own: the hex color it sets the token to in that scheme. The entry imports nothing, so it runs under Node with no page.

### Fields

Every control sits in a `KitFormField`, whose slot hands it the id its label names, the ids of the error and hint that describe it, and whether it is in error. Bind them all with `v-bind`:

```vue
<KitFormField v-slot="field" label="Email" hint="The reset link goes here." :error="errors.email" required>
  <KitTextField v-model="email" v-bind="field" type="email" autocomplete="email" />
</KitFormField>
```

### Dialogs and confirm

A form in a dialog takes a submit label, and the page closes the dialog once its save has worked:

```vue
<KitDialog v-model:open="adding" title="Add a book" submit-label="Add the book" :busy="saving" @submit="addBook">
  <template #trigger><KitButton variant="primary">Add a book</KitButton></template>
  <KitFormField v-slot="field" label="Title" :error="titleError" required>
    <KitTextField v-model="title" v-bind="field" />
  </KitFormField>
</KitDialog>
```

The form's other buttons go in `footer-start`, at the footer's other end from Cancel and submit, and an icon on the submit button in `submit-icon`. A button that takes the submit button's place goes in `submit`: while what it holds is switched off, the kit's own submit button shows.

```vue
<template #submit>
  <KitButton v-if="conflict" variant="primary" @click="reload">Reload</KitButton>
</template>
```

A box the kit draws around a slot (a footer's start, a panel's actions) is left out when the slot's content is all switched off with `v-if`, so it leaves no gap behind. Cancel is a secondary button in every form dialog, as in the confirm dialog, so the way back looks the same in each.

The question before an irreversible action is `confirm()`. Mount `KitConfirmHost` once, at the app's root, and ask from anywhere:

```ts
import { confirm } from '@jwill89/shared-components-vue'

if (await confirm({ title: 'Delete this shelf?', message: 'Its 12 books go back to unshelved.', confirmLabel: 'Delete the shelf', danger: true })) {
  await deleteShelf()
}
```

### Pages, alerts and states

Every page opens with `KitPageHeader` and puts its content in `KitPagePanel`s. A list says it is loading, empty or failed with `KitLoadingState`, `KitEmptyState` and `KitErrorState`, never one for another, and a condition the person must act on is a `KitAlert` where it applies:

```vue
<KitPageHeader title="Living room" description="Twelve books, two shelves." :crumbs="[{ label: 'Shelves', to: '/shelves' }]">
  <template #actions><KitButton variant="primary" @click="adding = true">Add a book</KitButton></template>
</KitPageHeader>
<KitPagePanel title="Books">
  <KitLoadingState v-if="loading" label="Loading the books…" />
  <KitErrorState v-else-if="failed" title="Couldn’t load the books" :message="failed.detail" @retry="load" />
  <KitEmptyState v-else-if="books.length === 0" title="No books on this shelf" />
  <BookList v-else :books="books" />
</KitPagePanel>
```

### Toasts

Mount `KitToastHost` once, at the app's root, beside `KitConfirmHost`, and raise a toast after an action from anywhere, the app's global error handler included:

```ts
import { useToast } from '@jwill89/shared-components-vue'

const toast = useToast()
toast.success('Saved the shelf')
toast.error('That didn’t save', problem.detail)
```

`useToast()` raises a toast in one of four tones, `success`, `error`, `warning` and `info`, each with a title and an optional detail, and gives back its id, which `dismiss()` takes to close it early. `onToast()` hears each toast as it is raised and gives back the call that stops it, for an app's own log or its tests, and `dismissAllToasts()` closes every one, as tests do between cases.

A toast reports how a finished action went and goes; a condition the person must act on is a KitAlert on the page, which stays. An app with a fixed bar along the top maps `--kit-toast-inset-top` to the bar's height.

### Icons

Kit components take icons through slots, so the app's own icon set draws them and the kit carries no icon library, Font Awesome's or any other. Whatever renders an icon goes in the slot: Font Awesome's `<font-awesome-icon>`, another library's component, or an inline `<svg>`. The kit hides it from screen readers, since the button's words or label already name it.

```vue
<KitButton variant="primary" @click="addBook">
  <template #icon><font-awesome-icon icon="fa-solid fa-plus" /></template>
  Add a book
</KitButton>

<KitIconButton label="Delete the shelf" variant="danger" @click="deleteShelf">
  <font-awesome-icon icon="fa-solid fa-trash" />
</KitIconButton>
```

## Developing

Requires **Node 26 or later**, [Task](https://taskfile.dev) and PowerShell 7.4 or later. The repo holds the shared tooling as a git submodule, so clone with `--recurse-submodules`, or run `git submodule update --init` once.

```bash
task setup    # install the dependencies, which also builds the package
task dev      # the playground (http://localhost:5173): every component in each of its states
```

`task` alone lists every command, and `task check` runs everything CI runs. [AGENTS.md](https://github.com/jwill89/shared-components-vue/blob/main/AGENTS.md) is the guide to the code: its conventions, known traps, and the recipes for adding a component and cutting a release.

## License

[MIT](LICENSE)
