/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}',
    './lib/**/*.{js,jsx,ts,tsx}',
    // Include workspace UI package so NativeWind processes className props in shared components
    '../../packages/ui/src/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        primary:       '#007aff',
        'primary-dark':'#0055cc',
        success:       '#22c55e',
        warning:       '#f59e0b',
        danger:        '#ef4444',
      },
    },
  },
  plugins: [],
}
