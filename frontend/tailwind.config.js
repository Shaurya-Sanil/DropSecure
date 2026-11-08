/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        canvas: {
          base: '#0E1116',
          surface: '#151A21',
          raised: '#1B222B',
          overlay: '#222A36',
        },
        border: {
          subtle: '#1E252E',
          DEFAULT: '#262E38',
          muted: '#313B47',
        },
        fg: {
          DEFAULT: '#E6EAF0',
          muted: '#9AA6B2',
          subtle: '#6E7A8A',
        },
        accent: {
          DEFAULT: '#2F6FEB',
          hover: '#3878F5',
          subtle: '#1C2E4A',
          muted: '#182436',
        },
        status: {
          success: '#238636',
          'success-tint': 'rgba(35, 134, 54, 0.12)',
          warning: '#D29922',
          'warning-tint': 'rgba(210, 153, 34, 0.12)',
          danger: '#F85149',
          'danger-tint': 'rgba(248, 81, 73, 0.12)',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
      },
      borderRadius: {
        sm: '4px',
        DEFAULT: '6px',
        md: '6px',
        lg: '8px',
        xl: '10px',
      },
      boxShadow: {
        popover: '0 4px 14px 0 rgba(0, 0, 0, 0.45)',
      },
    },
  },
  plugins: [],
};
