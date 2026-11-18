# shared-components-vue

Vue 3 components for jwill89's front ends, built on [Reka UI](https://reka-ui.com)'s headless primitives and styled only through design tokens, so each app keeps its own look. Reka UI supplies the roles, keyboard handling and focus management; each kit component adds a visible focus ring, 44 px touch targets and reduced-motion handling, and the default theme holds WCAG AAA contrast in light and dark.

No components have been released yet. The first release, v0.1.0, brings the buttons, the spinner, the form field and its text and number fields, the dialog with its confirm form, and the toast; [PLAN.md](PLAN.md) lists the rest and the order they come in.

## Using it in an app

Install the package a release carries, by its URL. It is already built, so nothing builds or runs on install, and the lockfile pins its hash:

```bash
npm install https://github.com/jwill89/shared-components-vue/releases/download/v0.1.0/jwill89-shared-components-vue-0.1.0.tgz
```

To take a later release, install its file the same way.

Import the stylesheet once, before the app's own styles:

```ts
// main.ts
import '@jwill89/shared-components-vue/style.css'
```

The package marks only its CSS as having side effects, so the components arrive unstyled without this line.

### The theme

Every color, font, size and space the kit uses is a `--kit-*` custom property, defined in `@layer kit`. An app maps its own palette onto them in one file of its own; its rules are unlayered, so they win without a heavier selector:

```css
/* src/styles/kit-theme.css */
:root {
  --kit-surface: var(--surface);
  --kit-text: var(--text);
  --kit-accent: var(--accent);
  --kit-focus-ring: var(--focus-ring);
}
```

Each default color is `light-dark(light, dark)`, so it follows the `color-scheme` the app declares on its page. Declare it in CSS (`:root { color-scheme: light dark; }`, and the scheme a user picks on the `html` element's class or attribute): an app's production build rewrites `light-dark()` into a form that works only beside a `color-scheme` written in CSS. An app that sets its scheme from script maps every color token instead.

The token names and the default theme are in [src/tokens/tokens.css](src/tokens/tokens.css).

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

The question before an irreversible action is `confirm()`. Mount `KitConfirmHost` once, at the app's root, and ask from anywhere:

```ts
import { confirm } from '@jwill89/shared-components-vue'

if (await confirm({ title: 'Delete this shelf?', message: 'Its 12 books go back to unshelved.', confirmLabel: 'Delete the shelf', danger: true })) {
  await deleteShelf()
}
```

### Toasts

Mount `KitToastHost` once, at the app's root, beside `KitConfirmHost`, and raise a toast after an action from anywhere, the app's global error handler included:

```ts
import { useToast } from '@jwill89/shared-components-vue'

const toast = useToast()
toast.success('Saved the shelf')
toast.error('That didn’t save', problem.detail)
```

A toast reports how a finished action went and goes; a condition the person must act on is an alert on the page, which stays. An app with a fixed bar along the top maps `--kit-toast-inset-top` to the bar's height.

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

`task` alone lists every command, and `task check` runs everything CI runs. [AGENTS.md](AGENTS.md) is the guide to the code: its conventions, known traps, and the recipes for adding a component and cutting a release.

## License

[MIT](LICENSE)
