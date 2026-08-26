import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        ink: '#12212E',
        paper: '#F7F5F0',
        brand: {
          50: '#EEF4FA', 100: '#D6E5F3', 200: '#AFCAE6', 300: '#7FA9D4',
          400: '#4F86BF', 500: '#2E67A5', 600: '#1F4E84', 700: '#183D68',
          800: '#122E4F', 900: '#0D2138',
        },
        accent: { 400: '#F2B441', 500: '#E09A1C', 600: '#B87A11' },
        moss: { 500: '#2F7D62', 100: '#DCEFE7' },
        clay: { 500: '#C0553B', 100: '#F7E3DE' },
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        serif: ['Georgia', 'Cambria', 'serif'],
      },
      boxShadow: { card: '0 1px 2px rgba(18,33,46,.06), 0 8px 24px -12px rgba(18,33,46,.18)' },
    },
  },
  plugins: [],
};
export default config;
