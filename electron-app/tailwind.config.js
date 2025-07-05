// tailwind.config.js
/** @type {import('tailwindcss').Config} */
module.exports = {
  // The 'content' array tells Tailwind CSS which files to scan for utility classes.
  // It's crucial for Tailwind to generate the correct CSS.
  content: [
    // Look for Tailwind classes in all HTML files in the root directory
    './index.html',
    // Look for Tailwind classes in all JavaScript, JSX, TypeScript, and TSX files
    // within the 'src' directory and its subdirectories.
    // This covers your React components (App.jsx, main.jsx, etc.).
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {
      // You can extend Tailwind's default theme here, e.g.,
      // colors: {
      //   'custom-blue': '#243c5a',
      // },
      fontFamily: {
        // Define your custom font family here, matching the @import in index.css
        inter: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [
    // Add any Tailwind CSS plugins here, e.g.,
    // require('@tailwindcss/forms'),
  ],
};
