/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.tsx', './components/**/*.tsx'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        'hub-dark':   '#0B1D13',
        'hub-green':  '#1A3622',
        'hub-gold':   '#C8962A',
        'cream':      '#F5EFE4',
        'cream-dark': '#EDE5D0',
        'hub-mid':    '#4A5E4F',
        'hub-light':  '#8E9E90',
        'hub-border': '#D9D0BC',
      },
      fontFamily: {
        'playfair':       ['PlayfairDisplay_800ExtraBold'],
        'playfair-black': ['PlayfairDisplay_900Black'],
        'sans':           ['DMSans_400Regular'],
        'sans-med':       ['DMSans_500Medium'],
        'sans-semi':      ['DMSans_600SemiBold'],
      },
    },
  },
  plugins: [],
};
