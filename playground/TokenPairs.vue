<script setup lang="ts">
// Every pair contrast.spec.ts measures, drawn in its own colors with the ratio the browser
// gives it in the scheme on screen, so a person sees what the test checks. A mixed pair (a
// hover) is drawn through the same color-mix() its component writes. A border pair draws a box
// in the border's color, with ordinary text inside.
import { onMounted, ref, useTemplateRef } from 'vue'
import {
  TOKEN_PAIRS,
  backgroundCss,
  contrastRatio,
  describePair,
  parseComputedColor,
  type TokenPair,
} from '../src/tokens/contrast'

const table = useTemplateRef<HTMLTableElement>('table')
const ratios = ref<string[]>([])

function measure(sample: Element, pair: TokenPair): string {
  const style = getComputedStyle(sample)
  const front = parseComputedColor(pair.kind === 'border' ? style.borderTopColor : style.color)
  const back = parseComputedColor(style.backgroundColor)
  return front && back ? `${contrastRatio(front.rgb, back.rgb).toFixed(2)}:1` : 'not measured'
}

onMounted(() => {
  const samples = Array.from(table.value?.querySelectorAll('.token-pairs__sample') ?? [])
  ratios.value = TOKEN_PAIRS.map((pair, index) => {
    const sample = samples[index]
    return sample ? measure(sample, pair) : 'not measured'
  })
})
</script>

<template>
  <table ref="table" class="token-pairs">
    <thead>
      <tr>
        <th scope="col">Sample</th>
        <th scope="col">Pair</th>
        <th scope="col">Ratio</th>
        <th scope="col">Needs</th>
      </tr>
    </thead>
    <tbody>
      <tr v-for="(pair, index) in TOKEN_PAIRS" :key="describePair(pair)">
        <td>
          <span
            class="token-pairs__sample"
            :class="{ 'token-pairs__sample--border': pair.kind === 'border' }"
            :style="{ '--pair-fg': `var(--kit-${pair.fg})`, '--pair-bg': backgroundCss(pair.bg) }"
            >Aa</span
          >
        </td>
        <td class="token-pairs__name">
          <code>{{ describePair(pair) }}</code>
        </td>
        <td>{{ ratios[index] ?? 'not measured' }}</td>
        <td>{{ pair.floor }}:1</td>
      </tr>
    </tbody>
  </table>
</template>

<style scoped>
.token-pairs {
  width: 100%;
  border-collapse: collapse;
}

.token-pairs th,
.token-pairs td {
  padding: var(--kit-space-xs);
  border-bottom: var(--kit-control-border-width) solid var(--kit-hairline);
  text-align: left;
  vertical-align: middle;
}

.token-pairs__sample {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: var(--kit-control-height);
  min-height: var(--kit-control-height);
  border-radius: var(--kit-radius-md);
  background: var(--pair-bg);
  color: var(--pair-fg);
  font-weight: var(--kit-font-weight-strong);
}

.token-pairs__sample--border {
  border: var(--kit-focus-ring-width) solid var(--pair-fg);
  color: var(--kit-text);
}

.token-pairs__name {
  overflow-wrap: anywhere;
}

.token-pairs__name code {
  font-family: var(--kit-font-code);
  font-size: var(--kit-text-size-sm);
}
</style>
