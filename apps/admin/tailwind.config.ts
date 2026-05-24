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
        // ── Water Potty admin control-room palette ────────────────────────
        wp: {
          void:    '#050D18',  // page background
          abyss:   '#080F1E',  // sidebar / secondary bg
          surface: '#0D1B2E',  // card / selected item bg
          rim:     '#1A2F45',  // border
          ice:     '#4FC3F7',  // ice-blue accent text
          iceDim:  'rgba(79,195,247,0.15)',  // dim ice background
          mist:    '#B0CAD9',  // lighter body text
          fog:     '#7BA7C2',  // medium body text
          smoke:   '#4A6880',  // dim / placeholder text
          red:     '#C62828',  // danger / badge
          green:   '#4ade80',  // success / open action
          amber:   '#fbbf24',  // warning / pending action
          depth:   '#0A1628',  // panel / table background
          muted:   '#142236',  // subtle hover background
        },
        border:      'hsl(var(--border))',
        input:       'hsl(var(--input))',
        ring:        'hsl(var(--ring))',
        background:  'hsl(var(--background))',
        foreground:  'hsl(var(--foreground))',
        primary: {
          DEFAULT:    'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT:    'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT:    'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT:    'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT:    'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        card: {
          DEFAULT:    'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
    },
  },
  plugins: [],
}

export default config
