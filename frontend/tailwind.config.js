/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#c3f832',
          50: '#f2fde0',
          100: '#e5fbc2',
          200: '#d4f88a',
          300: '#c3f454',
          400: '#c3f832',
          500: '#a8e028',
          600: '#8cc81e',
          700: '#70b014',
          800: '#54980a',
          900: '#388000',
        },
        bg: '#f8f8f8',
        text: '#292928',
        success: '#70b014',
        warning: '#c3f832',
        border: '#e5e7eb',
      },
      fontFamily: {
        sans: ['DM Sans', 'system-ui', '-apple-system', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
