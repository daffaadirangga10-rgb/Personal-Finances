/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Each token resolves through a CSS variable so the palette can be
        // swapped at runtime (see index.css `:root` vs `html.light`).
        paper: 'rgb(var(--color-paper) / <alpha-value>)',     // page background
        surface: 'rgb(var(--color-surface) / <alpha-value>)', // card surface
        line: 'rgb(var(--color-line) / <alpha-value>)',       // hairline borders
        ink: 'rgb(var(--color-ink) / <alpha-value>)',         // primary text
        ledger: 'rgb(var(--color-ledger) / <alpha-value>)',   // heading tone
        gold: 'rgb(var(--color-gold) / <alpha-value>)',       // brass accent
        sage: 'rgb(var(--color-sage) / <alpha-value>)',       // income / positive
        rust: 'rgb(var(--color-rust) / <alpha-value>)',       // expense / negative
        teal: 'rgb(var(--color-teal) / <alpha-value>)',       // savings / goal
      },
      fontFamily: {
        display: ['"Fraunces"', 'serif'],
        body: ['"Inter"', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'monospace'],
      },
      boxShadow: {
        elegant: 'var(--shadow-elegant)',
        soft: 'var(--shadow-soft)',
      },
      keyframes: {
        'modal-fade-in': {
          '0%': { opacity: 0 },
          '100%': { opacity: 1 },
        },
        'modal-pop-in': {
          '0%': { opacity: 0, transform: 'scale(0.96) translateY(8px)' },
          '100%': { opacity: 1, transform: 'scale(1) translateY(0)' },
        },
        'rise-in': {
          '0%': { opacity: 0, transform: 'translateY(10px)' },
          '100%': { opacity: 1, transform: 'translateY(0)' },
        },
      },
      animation: {
        'fade-in': 'modal-fade-in 0.15s ease-out',
        'modal-in': 'modal-pop-in 0.18s ease-out',
        'rise-in': 'rise-in 0.45s cubic-bezier(0.16, 1, 0.3, 1) both',
      },
    },
  },
  plugins: [],
}
