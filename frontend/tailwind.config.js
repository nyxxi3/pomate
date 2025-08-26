import daisyui from "daisyui";

/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
       fontFamily: {
        fredoka: ['Fredoka', 'sans-serif'],
      },
    },
  },
  plugins: [daisyui],
  
  daisyui: {
    themes: [ 
      "dark",
      "cupcake",
      "emerald",//green
      "synthwave",
      "cyberpunk",
      "valentine",
      "forest",
      "pastel",
      "fantasy",
      "black",
      "cmyk",
      "business",
      "lemonade",//green
      "dim",//green
      "sunset",
      "frutiger"
    ],
  },
};
