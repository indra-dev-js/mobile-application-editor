import typography from "@tailwindcss/typography"
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{html,js}', // sesuaikan path ke file kamu
  ],
  theme: {
    extend: {
      fontFamily: {
        opensans: ['"Open Sans"', 'sans-serif'],
      },
    },
  },
 plugins: [typography],
};
