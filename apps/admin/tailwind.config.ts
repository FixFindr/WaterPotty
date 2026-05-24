import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: ['class'],
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        wp: {
          void:    '#070D17',
          abyss:   '#0A1220',
          depth:   '#0F1C2E',
          surface: '#152236',
          rim:     '#1E3248',
          muted:   '#2A4560',
          mist:    '#C8DCF0',
          fog:     '#7A9BB8',
          smoke:   '#3D5A73',
          ice:     '#4FC3F7',
          iceDim:  '#1A5F82',
          green:   '#34A853',
          amber:   '#E8A020',
          red:     '#D93025',
          gold:    '#F4B400',
        },
        border:     'var(--wp-rim)',
        background: 'var(--wp-void)',
        foreground: 'var(--wp-mist)',
        card:       { DEFAULT: 'var(--wp-depth)', foreground: 'var(--wp-mist)' },
        primary:    { DEFAULT: 'var(--wp-ice)',   foreground: 'var(--wp-void)' },
        muted:      { DEFAULT: 'var(--wp-surface)', foreground: 'var(--wp-fog)' },
        destructive:{ DEFAULT: 'var(--wp-red)',   foreground: '#ffffff' },
      },
      fontFamily: {
        mono: ['var(--font-geist-mono)', 'Courier New', 'monospace'],
        sans: ['var(--font-geist-mono)', 'Courier New', 'monospace'], // mono-first
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
}

export default config
