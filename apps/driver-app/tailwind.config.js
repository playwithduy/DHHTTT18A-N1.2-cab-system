/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0fbfa',
          100: '#d1f4f1',
          200: '#a7e8e1',
          300: '#72d6cc',
          400: '#46bcaf',
          500: '#00b2a9', // Xanh SM Cyan
          600: '#009a93',
          700: '#007d79',
          800: '#006260',
          900: '#005150',
          950: '#003031',
        },
        accent: {
          500: '#ffe600', // Xanh SM Yellow
        }
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
      },
    },
  },
  plugins: [],
}
