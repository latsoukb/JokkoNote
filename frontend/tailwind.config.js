/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ['class'],
  content: ['./src/**/*.{js,jsx}', './public/index.html'],
  theme: {
    extend: {
      colors: {
        jokko: {
          DEFAULT: '#FF7700',
          50: '#FFF7ED',
          100: '#FFEDD5',
          200: '#FED7AA',
          300: '#FDBA74',
          400: '#FB923C',
          500: '#FF7700',
          600: '#FF7700',
          700: '#E86A00',
          800: '#C25800',
          900: '#9A4600',
          950: '#331A00',
        },
      },
    },
  },
  plugins: [],
};
