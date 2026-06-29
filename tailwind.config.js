/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      screens: {
        'xs': '480px',
      },
      colors: {
        brand: {
          primary:        'var(--brand-primary)',
          'primary-dark': 'var(--brand-primary-dark)',
          secondary:      'var(--brand-secondary)',
          accent:         'var(--brand-accent)',
          bg:             'var(--brand-bg)',
          'card-bg':      'var(--brand-card-bg)',
          'text-primary': 'var(--brand-text-primary)',
          'text-secondary':'var(--brand-text-secondary)',
          success:        'var(--brand-success)',
          warning:        'var(--brand-warning)',
          error:          'var(--brand-error)',
          info:           'var(--brand-info)',
          'sidebar-bg':   'var(--brand-sidebar-bg)',
          'sidebar-text': 'var(--brand-sidebar-text)',
          'sidebar-active':'var(--brand-sidebar-active)',
        },
      },
    },
  },
  plugins: [],
};
