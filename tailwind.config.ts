import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      fontFamily: {
        playfair: ['var(--font-playfair)', 'Georgia', 'serif'],
        inter: ['var(--font-inter)', 'system-ui', 'sans-serif'],
      },
      colors: {
        amber: {
          '400': '#f59e0b',
          '500': '#d97706',
          '600': '#b45309',
          '900': '#78350f',
        },
      },
    },
  },
  plugins: [],
}

export default config
