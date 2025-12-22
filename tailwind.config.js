/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Custom trading dashboard palette
        midnight: {
          50: '#f0f4ff',
          100: '#e0e9ff',
          200: '#c2d3ff',
          300: '#93b0ff',
          400: '#5c82ff',
          500: '#3355ff',
          600: '#1a2dff',
          700: '#0f1aeb',
          800: '#1318be',
          900: '#161a94',
          950: '#0f172a',
        },
        profit: {
          light: '#86efac',
          DEFAULT: '#22c55e',
          dark: '#15803d',
        },
        loss: {
          light: '#fca5a5',
          DEFAULT: '#ef4444',
          dark: '#b91c1c',
        },
        warning: {
          light: '#fde047',
          DEFAULT: '#eab308',
          dark: '#a16207',
        },
        neutral: {
          light: '#94a3b8',
          DEFAULT: '#64748b',
          dark: '#475569',
        }
      },
      fontFamily: {
        sans: ['Outfit', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
        'slide-up': 'slideUp 0.5s ease-out',
        'fade-in': 'fadeIn 0.3s ease-out',
      },
      keyframes: {
        glow: {
          '0%': { boxShadow: '0 0 5px rgba(51, 85, 255, 0.5)' },
          '100%': { boxShadow: '0 0 20px rgba(51, 85, 255, 0.8)' }
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' }
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' }
        }
      }
    },
  },
  plugins: [],
}

