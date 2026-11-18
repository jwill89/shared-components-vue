// Stylelint checks the styles for mistakes and holds the palette rule; it doesn't format
// them (Prettier does). The shared CSS rules (@jwill89/lint-web) apply to the .vue files'
// style blocks as well. A rule is turned off here with its reason, or at the one line it
// doesn't fit with the reason beside it.
import { paletteRules } from '@jwill89/lint-web/stylelint'

// A color is defined once, as a token in src/tokens/tokens.css, and used through var(). Neutral
// black and white at any alpha (shadows, scrims) are not palette colors and may be written
// inline.
const PALETTE =
  'Use a src/tokens/tokens.css token: var(--kit-x), or color-mix(in srgb, var(--kit-x) N%, transparent) for a tint; only neutral black/white (rgb(0 0 0 / a), rgb(255 255 255 / a)) may be written inline'

export default {
  extends: ['@jwill89/lint-web/stylelint'],
  rules: {
    ...paletteRules(PALETTE),
    // The shared rule leaves a typeface's name as the foundry writes it inside a --font-*
    // token; the kit's font tokens carry its prefix, so the same exception names them.
    'value-keyword-case': ['lower', { ignoreProperties: ['/^--kit-font-/'] }],
  },
  overrides: [
    {
      // The token file is where the palette is defined.
      files: ['src/tokens/tokens.css'],
      rules: { 'color-no-hex': null },
    },
  ],
}
