/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
      },
      animation: {
        'music-bar-1': 'music-bar 1s ease-out infinite',
        'music-bar-2': 'music-bar 1s ease-out infinite 0.25s',
        'music-bar-3': 'music-bar 1s ease-out infinite 0.5s',
      },
      keyframes: {
        'music-bar': {
          '0%, 100%': { height: '0.5rem' },
          '50%': { height: '1rem' },
        },
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
      },
    },
  },
  plugins: [],
};
