/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: '#0F1F3D',
        cream: '#F8F6F1',
        accessible: '#2ECC71',
        moderate: '#F39C12',
        difficult: '#E74C3C',
      },
      fontFamily: {
        display: ['Syne', 'sans-serif'],
        body: ['DM Sans', 'sans-serif'],
      },
      boxShadow: {
        card: '0 8px 32px -8px rgba(15,31,61,0.18)',
        soft: '0 2px 12px rgba(15,31,61,0.08)',
      },
    },
  },
  plugins: [],
};
