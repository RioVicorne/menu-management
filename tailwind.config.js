/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
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
        // Food-themed colors
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
      },
      fontFamily: {
        sans: ['ui-sans-serif', 'system-ui', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', '"Helvetica Neue"', 'Arial', '"Noto Sans"', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', '"SF Mono"', 'Consolas', '"Liberation Mono"', 'Menlo', 'monospace'],
      },
    },
  },
  plugins: [],
}
