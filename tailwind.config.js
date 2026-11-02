const c = (name) => `rgb(var(--${name}) / <alpha-value>)`;

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        base: c('base'),
        card: c('card'),
        main: c('main'),
        muted: c('muted'),
        line: c('line'),
        accent: c('accent'),
        accent2: c('accent2'),
        onaccent: c('onaccent'),
        ok: c('ok'),
        bad: c('bad'),
      },
    },
  },
  plugins: [],
};
