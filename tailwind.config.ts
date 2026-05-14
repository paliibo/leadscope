import type { Config } from 'tailwindcss'
import animate from 'tailwindcss-animate'

const config: Config = {
  darkMode: ['class', '[data-theme="dark"]'],
  content: [
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        canvas: 'rgb(var(--ls-canvas) / <alpha-value>)',
        surface: 'rgb(var(--ls-surface) / <alpha-value>)',
        'surface-muted': 'rgb(var(--ls-surface-muted) / <alpha-value>)',
        line: 'rgb(var(--ls-line) / <alpha-value>)',
        ink: 'rgb(var(--ls-ink) / <alpha-value>)',
        'ink-muted': 'rgb(var(--ls-ink-muted) / <alpha-value>)',
        'ink-subtle': 'rgb(var(--ls-ink-subtle) / <alpha-value>)',
        brand: {
          DEFAULT: 'rgb(var(--ls-brand) / <alpha-value>)',
          soft: 'rgb(var(--ls-brand-soft) / <alpha-value>)',
          ink: 'rgb(var(--ls-brand-ink) / <alpha-value>)',
        },
        violet: 'rgb(var(--ls-violet) / <alpha-value>)',
        positive: 'rgb(var(--ls-positive) / <alpha-value>)',
        negative: 'rgb(var(--ls-negative) / <alpha-value>)',
        warning: 'rgb(var(--ls-warning) / <alpha-value>)',
      },
      backgroundImage: {
        'gradient-brand': 'linear-gradient(119deg, #C29AFF 6.42%, #4062FF 89.8%)',
        'gradient-brand-soft':
          'linear-gradient(145deg, rgba(117,87,227,0.16) 6%, rgba(64,98,255,0.08) 90%)',
        'gradient-sunset':
          'linear-gradient(145deg, rgba(117,87,227,1) 6.42%, rgba(161,108,174,1) 52%, rgba(240,139,96,1) 90%)',
        'gradient-mesh':
          'radial-gradient(at 12% 8%, rgba(194,154,255,0.30) 0px, transparent 55%), radial-gradient(at 88% 4%, rgba(64,98,255,0.22) 0px, transparent 50%), radial-gradient(at 60% 92%, rgba(240,139,96,0.14) 0px, transparent 45%)',
      },
      fontFamily: {
        sans: ['Graphik', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      fontSize: {
        '2xs': ['0.6875rem', { lineHeight: '1.1', letterSpacing: '0.02em' }],
        xs: ['0.75rem', { lineHeight: '1.15' }],
        sm: ['0.875rem', { lineHeight: '1.2' }],
        base: ['1rem', { lineHeight: '1.35' }],
        lg: ['1.125rem', { lineHeight: '1.25' }],
        xl: ['1.25rem', { lineHeight: '1.2' }],
      },
      borderRadius: {
        card: '1rem',
        pill: '999px',
      },
      boxShadow: {
        card: '0 1px 2px rgb(16 18 40 / 0.04), 0 8px 24px -12px rgb(16 18 40 / 0.12)',
        lifted: '0 24px 48px -24px rgb(16 18 40 / 0.28)',
        glow: '0 0 0 1px rgb(var(--ls-brand) / 0.25), 0 8px 32px -8px rgb(var(--ls-brand) / 0.35)',
      },
      screens: {
        '2xs': { max: '510px' },
        xs: { max: '639px' },
        md: '840px',
        '4xl': '1800px',
      },
      keyframes: {
        'fade-up': {
          from: { opacity: '0', transform: 'translateY(6px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'pulse-ring': {
          '0%': { boxShadow: '0 0 0 0 rgb(var(--ls-brand) / 0.45)' },
          '70%': { boxShadow: '0 0 0 10px rgb(var(--ls-brand) / 0)' },
          '100%': { boxShadow: '0 0 0 0 rgb(var(--ls-brand) / 0)' },
        },
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
      },
      animation: {
        'fade-up': 'fade-up 260ms cubic-bezier(0.22, 1, 0.36, 1) both',
        'pulse-ring': 'pulse-ring 1.8s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        shimmer: 'shimmer 1.6s infinite',
      },
    },
  },
  plugins: [animate],
}

export default config
