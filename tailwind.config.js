/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#0052D9',
          light: '#0C64EB',
          lighter: '#2D90FF',
        },
        background: {
          DEFAULT: '#F5F7FA',
          white: '#FFFFFF',
        },
        text: {
          DEFAULT: '#333333',
          secondary: '#666666',
          muted: '#999999',
        },
        functional: {
          success: '#00A870',
          warning: '#FF7043',
          error: '#FF3D00',
        }
      },
      fontFamily: {
        sans: ['PingFang-SC', 'Microsoft YaHei', 'sans-serif'],
      },
    },
  },
  plugins: [
    require('tailwindcss-animate'),
  ],
}
