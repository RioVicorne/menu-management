/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Modern culinary theme colors
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        muted: {
          DEFAULT: 'var(--muted)',
          foreground: 'var(--muted-foreground)',
        },
        border: 'var(--border)',
        input: 'var(--input)',
        primary: {
          DEFAULT: 'var(--primary)',
          foreground: 'var(--primary-foreground)',
        },
        secondary: {
          DEFAULT: 'var(--secondary)',
          foreground: 'var(--secondary-foreground)',
        },
        accent: {
          DEFAULT: 'var(--accent)',
          foreground: 'var(--accent-foreground)',
        },
        destructive: {
          DEFAULT: 'var(--destructive)',
          foreground: 'var(--destructive-foreground)',
        },
        ring: 'var(--ring)',
        // Modern culinary color palette
        sage: {
          50: '#f6f7f6',
          100: '#e3e7e3',
          200: '#c7d2c7',
          300: '#a3b4a3',
          400: '#7d947d',
          500: '#617861',
          600: '#4c5f4c',
          700: '#3e4d3e',
          800: '#343f34',
          900: '#2d352d',
          950: '#171c17',
        },
        cream: {
          50: '#fefdfb',
          100: '#fdf9f2',
          200: '#faf1e0',
          300: '#f5e5c7',
          400: '#eed5a6',
          500: '#e4c284',
          600: '#d6ac5f',
          700: '#c8954b',
          800: '#a37a3e',
          900: '#846338',
          950: '#47311d',
        },
        wood: {
          50: '#faf8f6',
          100: '#f2ede8',
          200: '#e3d8ce',
          300: '#d1c0b0',
          400: '#bca48d',
          500: '#a8896f',
          600: '#96745c',
          700: '#7e614e',
          800: '#695043',
          900: '#57423a',
          950: '#2f231e',
        },
        mint: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
          950: '#052e16',
        },
        // Legacy food colors for compatibility
        'food-orange': {
          DEFAULT: 'var(--food-orange)',
          light: 'var(--food-orange-light)',
          dark: 'var(--food-orange-dark)',
        },
        'food-green': {
          DEFAULT: 'var(--food-green)',
          light: 'var(--food-green-light)',
          dark: 'var(--food-green-dark)',
        },
        'food-red': {
          DEFAULT: 'var(--food-red)',
          light: 'var(--food-red-light)',
          dark: 'var(--food-red-dark)',
        },
        'food-blue': {
          DEFAULT: 'var(--food-blue)',
          light: 'var(--food-blue-light)',
          dark: 'var(--food-blue-dark)',
        },
        'food-purple': {
          DEFAULT: 'var(--food-purple)',
          light: 'var(--food-purple-light)',
          dark: 'var(--food-purple-dark)',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
        xl: '1.5rem',
        '2xl': '2rem',
        '3xl': '3rem',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', '"Helvetica Neue"', 'Arial', '"Noto Sans"', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', '"SF Mono"', 'Consolas', '"Liberation Mono"', 'Menlo', 'monospace'],
      },
      boxShadow: {
        'soft': '0 2px 15px -3px rgba(0, 0, 0, 0.07), 0 10px 20px -2px rgba(0, 0, 0, 0.04)',
        'soft-lg': '0 10px 40px -10px rgba(0, 0, 0, 0.1), 0 2px 10px -2px rgba(0, 0, 0, 0.04)',
        'glass': '0 8px 32px 0 rgba(31, 38, 135, 0.37)',
        'glass-inset': 'inset 0 1px 0 rgba(255, 255, 255, 0.1)',
      },
      backdropBlur: {
        xs: '2px',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
        'float': 'float 6s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
      },
    },
  },
  plugins: [],
}
