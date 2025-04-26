// @ts-ignore: DaisyUI has no TypeScript definitions
const daisyui = require('daisyui');

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './index.html',
    './src/**/*.{js,jsx,ts,tsx}'
  ],
  theme: {
    extend: {},
  },
  plugins: [
    daisyui
  ],
  daisyui: {
    themes: ["light", "dark"],   // light first
    defaultTheme: "light",       // ensure “light” is the default
  },
};
