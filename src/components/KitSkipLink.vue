<script setup lang="ts">
// The first thing in an app's shell, for someone who moves by key: a link past the header and
// the menus to the page's own content, out of sight until it takes focus, when it shows at the
// top of the screen: `<KitSkipLink />`, then `<main id="main-content">` further down.
//
// A press moves focus to the element whose id is `target`, making it focusable from script
// (`tabindex="-1"`) where it isn't, and puts no `#main-content` in the address, where a router
// would read it as a page of its own. Its `href` is still that address, so the link works with
// no script, and opened in a new tab.
const props = withDefaults(
  defineProps<{
    /** The id of the element that holds the page's own content. */
    target?: string
  }>(),
  { target: 'main-content' },
)

defineSlots<{
  /** Its words, in place of "Skip to main content". */
  default?: () => unknown
}>()

function skip(event: MouseEvent): void {
  const main = document.getElementById(props.target)
  if (!main) {
    return
  }
  event.preventDefault()
  if (!main.hasAttribute('tabindex')) {
    main.setAttribute('tabindex', '-1')
  }
  main.focus()
}
</script>

<template>
  <a :href="`#${target}`" class="kit-skip-link" @click="skip">
    <slot>Skip to main content</slot>
  </a>
</template>

<style scoped>
/* Out of sight but read and focusable; focused, it is drawn as a primary button over everything,
   at the top of the screen. */
@layer kit {
  .kit-skip-link {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
  }

  .kit-skip-link:focus {
    position: fixed;
    z-index: var(--kit-layer-popup);
    inset-block-start: var(--kit-space-xs);
    inset-inline-start: var(--kit-space-xs);
    box-sizing: border-box;
    display: inline-flex;
    align-items: center;
    width: auto;
    height: auto;
    min-height: var(--kit-control-height);
    padding: var(--kit-space-xs) var(--kit-space-md);
    overflow: visible;
    clip-path: none;
    border: var(--kit-control-border-width) solid var(--kit-accent);
    border-radius: var(--kit-radius-md);
    background: var(--kit-accent);
    color: var(--kit-on-accent);
    font-weight: var(--kit-font-weight-strong);
    text-decoration: none;
    white-space: normal;
  }

  .kit-skip-link:focus-visible {
    outline: var(--kit-focus-ring-width) solid var(--kit-focus-ring);
    outline-offset: var(--kit-focus-ring-offset);
  }
}
</style>
