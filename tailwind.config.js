/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        coffee: {
          50: '#FDFBF7',
          100: '#F5F0E8',
          200: '#E8DFD2',
          300: '#D4A373',
          400: '#C68B59',
          500: '#8C5A32',
          600: '#6F4E37',
          700: '#4A3525',
          800: '#30231D',
          900: '#1A120E',
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        display: ['Poppins', 'sans-serif']
      }
    },
  },
  plugins: [],
};

