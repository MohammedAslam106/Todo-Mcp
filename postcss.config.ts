// Tailwind v4 already handles vendor prefixes and modern-CSS lowering (via Lightning CSS).
// Don't add postcss-preset-env here: it rewrites Tailwind's `color-mix()`/`var()` output into
// static light-theme colors (breaking opacity modifiers like `bg-primary/20` and dark mode) and
// polyfills cascade layers with `:not(#\#)` specificity hacks.
export default {
  plugins: {
    '@tailwindcss/postcss': {},
  },
}
