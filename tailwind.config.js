/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        hris: {
          ink: "#14213d",
          panel: "#1b2a4a",
          accent: "#2a9d8f",
          accentDark: "#1f7a6f",
          soft: "#e8f4f2",
          warn: "#e76f51",
          line: "#d7dde8",
          canvas: "#eef1f6",
        },
        flow: {
          ink: "#0f172a",
          panel: "#111827",
          accent: "#2563eb",
          accentSoft: "#dbeafe",
          success: "#059669",
          danger: "#dc2626",
          warn: "#d97706",
          line: "#e2e8f0",
          canvas: "#f8fafc",
        },
      },
      fontFamily: {
        hris: ["var(--font-hris)", "sans-serif"],
        flow: ["var(--font-flow)", "sans-serif"],
        display: ["var(--font-display)", "serif"],
      },
    },
  },
  plugins: [],
};
