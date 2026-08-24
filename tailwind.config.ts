/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      fontFamily: {
        serif: ['"Cormorant Garamond"', 'Georgia', 'serif'],
        sans: ['"Inter"', 'system-ui', 'sans-serif'],
      },
      colors: {
        moss: {
          50: '#f4f6f3',
          100: '#e6ebe3',
          200: '#cfd8c9',
          300: '#a8bb9d',
          400: '#7d976d',
          500: '#5e7a4d',
          600: '#48613c',
          700: '#394d31',
          800: '#2f3f29',
          900: '#283523',
        },
        sand: {
          50: '#faf7f2',
          100: '#f1ead9',
          200: '#e3d4b5',
          300: '#d2b988',
          400: '#bf9c5e',
          500: '#a98346',
          600: '#8c6a3a',
          700: '#705431',
          800: '#5b4529',
          900: '#4b3a24',
        },
      },
    },
  },
  plugins: [],
};