/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          indigo:  '#6366f1',
          cyan:    '#06b6d4',
          rose:    '#f43f5e',
          gold:    '#f59e0b',
          emerald: '#10b981',
          violet:  '#8b5cf6',
        },
        surface: {
          base:    'var(--bg-base)',
          surface: 'var(--bg-surface)',
          elevated:'var(--bg-elevated)',
          glass:   'var(--bg-glass)',
        },
      },
      fontFamily: {
        sans:    ['"Outfit"', 'ui-sans-serif', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['"Montserrat"', 'sans-serif'],
      },
      borderRadius: {
        'sm': 'var(--radius-sm)',
        'md': 'var(--radius-md)',
        'lg': 'var(--radius-lg)',
        'xl': 'var(--radius-xl)',
      },
      animation: {
        'fade-in':    'fade-in 0.3s ease both',
        'slide-up':   'slide-up 0.4s cubic-bezier(0.2,0.8,0.2,1) both',
        'slide-down': 'slide-down 0.35s cubic-bezier(0.2,0.8,0.2,1) both',
        'slide-left': 'slide-left 0.3s ease both',
        'scale-in':   'scale-in 0.35s cubic-bezier(0.2,0.8,0.2,1) both',
        'float':      'float 4s ease-in-out infinite',
        'spin-slow':  'spin-slow 12s linear infinite',
        'shimmer':    'shimmer 1.6s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
