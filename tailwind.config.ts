import type { Config } from 'tailwindcss';

/**
 * Paleta MOA Education — extraída del logo y del key visual de marca.
 *   teal    #16808E   color madre (fondos, botones primarios)
 *   sun     #F9D05E   amarillo de acento
 *   coral   #E62864   rosa/magenta de energía
 *   plum    #501B49   morado profundo (contraste)
 */
const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        ink: '#0E262B',
        paper: '#FBF7F0',
        teal: {
          50: '#EDF7F8', 100: '#D2EBEE', 200: '#A2D6DC', 300: '#6BBCC6',
          400: '#329FAD', 500: '#16808E', 600: '#12707D', 700: '#0A6872',
          800: '#08525B', 900: '#063C43', 950: '#042A2F',
        },
        sun: {
          50: '#FEFAEC', 100: '#FDF1CD', 200: '#FCE6A3', 300: '#FADC7E',
          400: '#F9D05E', 500: '#F0BE33', 600: '#D9A31A', 700: '#AC7E12',
        },
        coral: {
          50: '#FDECF2', 100: '#FBD5E2', 200: '#F6A9C1', 300: '#F0759B',
          400: '#EC4A7B', 500: '#E62864', 600: '#C81A51', 700: '#9E1240',
        },
        plum: {
          50: '#F4EDF3', 100: '#E6D6E4', 200: '#C9A8C5', 300: '#A2749C',
          400: '#764270', 500: '#501B49', 600: '#41143B', 700: '#2E0E2A',
        },
        moss: { 50: '#EDF7F2', 100: '#D3EEE2', 500: '#1E8A63', 600: '#166B4C' },
        // Aliases legibles para estados
        brand: {
          50: '#EDF7F8', 100: '#D2EBEE', 200: '#A2D6DC', 300: '#6BBCC6',
          400: '#329FAD', 500: '#16808E', 600: '#12707D', 700: '#0A6872',
          800: '#08525B', 900: '#063C43',
        },
      },
      fontFamily: {
        sans: ['var(--font-body)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['var(--font-display)', 'var(--font-body)', 'ui-sans-serif', 'sans-serif'],
      },
      borderRadius: { '4xl': '2rem', '5xl': '2.75rem' },
      boxShadow: {
        moa: '0 1px 2px rgba(6,60,67,.05), 0 12px 32px -18px rgba(6,60,67,.35)',
        'moa-lg': '0 2px 4px rgba(6,60,67,.06), 0 28px 60px -28px rgba(6,60,67,.45)',
        pop: '0 6px 0 0 rgba(6,60,67,.16)',
      },
      keyframes: {
        'fade-up': { '0%': { opacity: '0', transform: 'translateY(10px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        'pop-in': { '0%': { opacity: '0', transform: 'scale(.94)' }, '100%': { opacity: '1', transform: 'scale(1)' } },
        float: { '0%,100%': { transform: 'translateY(0) rotate(0deg)' }, '50%': { transform: 'translateY(-9px) rotate(3deg)' } },
        'spin-slow': { to: { transform: 'rotate(360deg)' } },
        shimmer: { '100%': { transform: 'translateX(100%)' } },
      },
      animation: {
        'fade-up': 'fade-up .45s cubic-bezier(.21,1.02,.73,1) both',
        'pop-in': 'pop-in .35s cubic-bezier(.21,1.02,.73,1) both',
        float: 'float 7s ease-in-out infinite',
        'spin-slow': 'spin-slow 22s linear infinite',
        shimmer: 'shimmer 1.6s infinite',
      },
    },
  },
  plugins: [],
};
export default config;
