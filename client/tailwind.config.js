/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        midnight: '#11112B',
        navy: '#191938',
        violet: { DEFAULT: '#7657FF', 600: '#5F3FEA', 700: '#4B2FCC' },
        lavender: '#EEE9FF',
        gold: '#E8C77B',
        canvas: '#F7F7FC',
        ink: '#22223A',
        muted: '#6B6B85',
        success: '#25A56A',
        danger: '#E05260',
      },
      fontFamily: { sans: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', 'sans-serif'] },
      boxShadow: {
        card: '0 1px 2px rgba(17,17,43,.04), 0 8px 24px -8px rgba(17,17,43,.10)',
        glow: '0 10px 40px -10px rgba(118,87,255,.55)',
      },
      keyframes: {
        shimmer: { '100%': { transform: 'translateX(100%)' } },
        float: { '0%,100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-12px)' } },
      },
      animation: { float: 'float 7s ease-in-out infinite' },
    },
  },
  plugins: [],
};
