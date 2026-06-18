/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        black: '#0A0A0A',
        deep: '#141414',
        charcoal: '#1E1E1E',
        panel: '#1A1A1A',
        'warm-white': '#F7F4EF',
        'off-white': '#EDE9E3',
        paper: '#FBF9F5',
        gold: '#C9A84C',
        'gold-light': '#E4C97B',
        'warm-gray': '#8B8680',
        'mid-gray': '#4A4744',
        line: '#E3DED5',
        success: '#5C7A52',
        'success-bg': '#EAF0E6',
        danger: '#A8453E',
        'danger-bg': '#F8E9E7',
        warn: '#B9852E',
        'warn-bg': '#F6EEDD',
        info: '#3E647D',
        'info-bg': '#E8EEF2',
      },
      fontFamily: {
        display: ['Playfair Display', 'serif'],
        sans: ['Inter', 'sans-serif'],
        script: ['Cormorant Garamond', 'serif'],
      },
    },
  },
  plugins: [],
};
