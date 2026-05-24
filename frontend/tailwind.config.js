/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg:       '#0a0b0e',
        surface:  '#111318',
        border:   '#1e2029',
        'border-hi': '#2a2d3a',
        muted:    '#5a5f72',
        accent:   '#4f8ef7',
        green:    '#22d3a0',
        yellow:   '#f5c542',
        red:      '#f05252',
        purple:   '#9b6dff',
      },
      fontFamily: {
        ui:   ['Syne', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [],
};
