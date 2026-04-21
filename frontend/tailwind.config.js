/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        maven: ['"Maven Pro"', 'sans-serif'],
      },
      colors: {
        gold: '#ffc63a',
        'gold-dark': '#e6a800',
        'brand-gold': '#D7B467',
      },
      keyframes: {
        fadeInDown: {
          from: { opacity: '0', transform: 'translateY(-8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        fadeInDown: 'fadeInDown 0.25s ease',
        fadeInDownFast: 'fadeInDown 0.18s ease',
      },
    },
  },
  plugins: [],
};
