/** @type {import('tailwindcss').Config} */
module.exports = {
  corePlugins: {
    preflight: false, // *************** Disables Tailwind's default base styles
  },
  content: ['./src/**/*.{html,ts}'], // *************** Specifies where Tailwind should look for classes
  prefix: 'tw-', // *************** Sets a prefix (tw-) for all Tailwind classes. This helps avoid conflicts with other CSS frameworks or custom styles.
  theme: {
    extend: {
      colors: {
        // *************** Define custom colors using CSS variables and alpha transparency
        'app-primary': 'rgb(var(--app-theme-color-primary) / <alpha-value>)',
        'app-secondary': 'rgb(var(--app-theme-color-secondary) / <alpha-value>)',
        'app-tertiary': 'rgb(var(--app-theme-color-tertiary) / <alpha-value>)',
      },
    },
  },
  plugins: [], // *************** No additional plugins at the moment
};
