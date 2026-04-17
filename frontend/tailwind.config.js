/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        obsidian: {
          DEFAULT: '#020617',
          900: '#020617',
          800: '#0f172a',
          700: '#1e293b',
        },
        accent: {
          indigo: '#6366f1',
          cyan: '#06b6d4',
          rose: '#f43f5e',
          violet: '#8b5cf6',
          gold: '#b8960c',
        },
        light: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
        }
      },
      fontFamily: {
        sans: ['"Outfit"', 'ui-sans-serif', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['"Montserrat"', 'sans-serif'],
      },
      borderRadius: {
        'xl':  '0.75rem',   /* 12px */
        '2xl': '1rem',      /* 16px — matches --radius-card */
        '3xl': '1.25rem',   /* 20px — matches --radius-panel */
        '4xl': '1.5rem',    /* 24px */
      },
      boxShadow: {
        'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
        'glow-indigo': '0 0 20px rgba(99, 102, 241, 0.3)',
        'glow-cyan': '0 0 20px rgba(6, 182, 212, 0.3)',
      },
      backdropBlur: {
        'xs': '2px',
      }
    },
  },
  plugins: [],
}
