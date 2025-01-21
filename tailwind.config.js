/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{html,js}"],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#007aff',
          dark: '#0056b3'
        }
      }
    },
  },
  plugins: [],
}

