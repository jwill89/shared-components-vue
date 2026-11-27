<script setup lang="ts">
// A list of terms, each beside what it names: a record's details, as `<dl>` marks them up.
// Each row is a KitDescriptionItem, so a row an app leaves out with `v-if` leaves nothing
// behind:
//
//   <KitDescriptionList>
//     <KitDescriptionItem term="Author">Jane Austen</KitDescriptionItem>
//     <KitDescriptionItem v-if="book.callNumber" term="Call number">…</KitDescriptionItem>
//   </KitDescriptionList>
//
// The terms line up in one column, as wide as the longest, and every value starts in the next.
// Where the list is narrower than 28rem, as on a phone or zoomed in, each term sits over its
// value instead, so a long term never squeezes its value to a sliver. (A container query can't
// read a token, so the width is written here.)
defineSlots<{
  /** Its rows, each a KitDescriptionItem. */
  default?: () => unknown
}>()
</script>

<template>
  <div class="kit-description-list">
    <dl class="kit-description-list__list">
      <slot />
    </dl>
  </div>
</template>

<style>
/* Unscoped, since each row is a KitDescriptionItem the app's template draws, which a scoped
   style here wouldn't reach. */
@layer kit {
  .kit-description-list {
    container: kit-description-list / inline-size;
  }

  .kit-description-list__list {
    display: grid;
    grid-template-columns: max-content minmax(0, 1fr);
    gap: var(--kit-space-xs) var(--kit-space-lg);
    margin: 0;
  }

  .kit-description-list__item {
    display: grid;
    grid-column: 1 / -1;
    grid-template-columns: subgrid;
  }

  .kit-description-list__term {
    color: var(--kit-text-muted);
    font-weight: var(--kit-font-weight-strong);
  }

  .kit-description-list__detail {
    min-width: 0;
    margin: 0;
    overflow-wrap: anywhere;
  }

  /* A link that is the whole of a value is a target of its own, not a word in a sentence, so it
     is given a touch target's height without moving the rows apart. */
  .kit-description-list__detail > a:only-child {
    display: inline-block;
    margin-block: calc((1lh - var(--kit-control-height)) / 2);
    padding-block: calc((var(--kit-control-height) - 1lh) / 2);
  }

  @container kit-description-list (width < 28rem) {
    .kit-description-list__item {
      display: block;
    }
  }
}
</style>
