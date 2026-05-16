/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'system-ui', 'sans-serif'],
        display: ['"Plus Jakarta Sans"', 'Inter', '-apple-system', 'sans-serif'],
      },
      colors: {
        brand: {
          50:  '#eef2ff',
          100: '#e0e7ff',
          200: '#c7d2fe',
          300: '#a5b4fc',
          400: '#818cf8',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
          800: '#3730a3',
          900: '#312e81',
        },
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
      boxShadow: {
        card: '0 1px 2px 0 rgb(15 23 42 / 0.04), 0 1px 3px 0 rgb(15 23 42 / 0.06)',
        'card-hover': '0 4px 12px -2px rgb(15 23 42 / 0.08), 0 2px 4px -1px rgb(15 23 42 / 0.04)',
        elevated: '0 10px 25px -5px rgb(15 23 42 / 0.12), 0 8px 10px -6px rgb(15 23 42 / 0.08)',
        popover: '0 20px 40px -8px rgb(15 23 42 / 0.18), 0 8px 16px -4px rgb(15 23 42 / 0.08)',
        brand: '0 8px 20px -4px rgb(79 70 229 / 0.35)',
        'brand-sm': '0 4px 12px -2px rgb(79 70 229 / 0.25)',
        emerald: '0 8px 20px -4px rgb(16 185 129 / 0.35)',
      },
      backgroundImage: {
        'brand-gradient': 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
        'brand-gradient-soft': 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
        'surface-gradient': 'linear-gradient(180deg, #f8fafc 0%, #eef2ff 100%)',
      },
    },
  },
  plugins: [],
};
