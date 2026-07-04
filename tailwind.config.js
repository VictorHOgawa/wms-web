/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Marinho institucional Integra — sidebar (texto), títulos e superfícies escuras
        brand: {
          DEFAULT: '#21274e',
          50: '#eef0f6',
          100: '#d7dbe9',
          600: '#21274e',
          900: '#161a36',
        },
        // Primária = marinho Integra (#21274e)
        primary: {
          DEFAULT: '#21274e',
          50: '#eef0f6',
          100: '#d7dbe9',
          600: '#21274e',
          700: '#161a36',
          dark: '#161a36',
        },
        // Accent = teal da logomarca Integra (#00a88e)
        accent: {
          DEFAULT: '#00a88e',
          50: '#e6f7f3',
          100: '#c2ece4',
          600: '#00937c',
          700: '#007d69',
        },
        ink: { DEFAULT: '#21274e', soft: '#334155', muted: '#64748b' },
        line: '#e2e8f0',
        surface: { DEFAULT: '#ffffff', sub: '#f8fafc' },
        ok: { DEFAULT: '#059669', 50: '#ecfdf5' },
        warn: { DEFAULT: '#d97706', 50: '#fffbeb' },
        bad: { DEFAULT: '#dc2626', 50: '#fef2f2' },
        info: { DEFAULT: '#2563eb', 50: '#eff6ff' },
      },
      fontFamily: {
        sans: ['Poppins', 'system-ui', 'sans-serif'],
        mono: ['"Fira Code"', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(33,39,78,0.04), 0 1px 3px rgba(33,39,78,0.06)',
        pop: '0 10px 30px -10px rgba(33,39,78,0.22)',
        phone: '0 30px 60px -15px rgba(33,39,78,0.32)',
      },
      borderRadius: { xl: '0.875rem', '2xl': '1.125rem' },
      keyframes: {
        'fade-in': { '0%': { opacity: 0, transform: 'translateY(4px)' }, '100%': { opacity: 1, transform: 'translateY(0)' } },
        'scale-in': { '0%': { opacity: 0, transform: 'scale(.97)' }, '100%': { opacity: 1, transform: 'scale(1)' } },
        'pulse-ok': { '0%,100%': { boxShadow: '0 0 0 0 rgba(22,163,74,.4)' }, '50%': { boxShadow: '0 0 0 8px rgba(22,163,74,0)' } },
      },
      animation: {
        'fade-in': 'fade-in .25s ease-out',
        'scale-in': 'scale-in .18s ease-out',
        'pulse-ok': 'pulse-ok 1s ease-out',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
}
