/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        parchment: {
          50:  '#fdf8f0',
          100: '#faf0dc',
          200: '#f5e0b8',
          300: '#edcc8e',
          400: '#e3b464',
          500: '#d49840',
          600: '#b87d2e',
          700: '#8f5e22',
          800: '#6b4319',
          900: '#4a2d10',
        },
        stone: {
          850: '#1c1917',
        },
      },
      fontFamily: {
        display: ['Georgia', 'serif'],
        body:    ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
