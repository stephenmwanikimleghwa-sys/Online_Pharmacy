module.exports = {
  darkMode: 'class',
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: {
          50: "#e0f0fa",
          100: "#c8e8f5",
          200: "#96ccde",
          300: "#5a7f98", // Steel blue
          400: "#2a597a",
          500: "#0a2e4a", // Deep Navy - Main Brand Color
          600: "#0d3f60", // Deep Navy - Hover State
          700: "#082338",
          800: "#051624",
          900: "#030d15",
          950: "#01060a",
        },
        secondary: {
          50: "#fdf8e6",
          100: "#faefc2",
          200: "#f5dda3",
          300: "#edc16b",
          400: "#e3a842",
          500: "#c8a84b", // Warm Gold
          600: "#a68a35",
          700: "#806622",
          800: "#5a4515",
          900: "#36270b",
          950: "#170f03",
        },
        accent: {
          50: "#e0f0fa",
          100: "#c8e8f5",
          200: "#a1d7eb",
          300: "#75beda",
          400: "#4ea1c5",
          500: "#5a7f98", // Steel Blue Accent
          600: "#446479",
          700: "#324959",
          800: "#22323e",
          900: "#131d24",
          950: "#080b0f",
        },
        neutral: {
          50: "#f5f8fa", // Near-white cool blue
          100: "#e5ecf0",
          200: "#cbd6de",
          300: "#abb8c3",
          400: "#8996a1",
          500: "#606b74",
          600: "#464f56",
          700: "#1a1a1a", // Body text on light
          800: "#121212",
          900: "#0d0d0d",
          950: "#000000",
        },
        surface: {
          light: "#f5f8fa",
          dark: "#0a2e4a",
          "glass-light": "rgba(255, 255, 255, 0.7)",
          "glass-dark": "rgba(15, 23, 42, 0.7)",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        display: ["Inter", "system-ui", "sans-serif"],
      },
      backgroundImage: {
        "page-gradient":
          "linear-gradient(135deg, #f0f4ff 0%, #faf5ff 40%, #f0fdf4 100%)",
        "hero-gradient":
          "linear-gradient(135deg, #4f46e5 0%, #7c3aed 50%, #c026d3 100%)",
        "card-gradient":
          "linear-gradient(135deg, rgba(99,102,241,0.08) 0%, rgba(168,85,247,0.05) 100%)",
      },
      boxShadow: {
        soft: "0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -1px rgba(0,0,0,0.03)",
        glow: "0 0 20px rgba(99, 102, 241, 0.35)",
        "glow-sm": "0 0 10px rgba(99, 102, 241, 0.2)",
        card: "0 10px 15px -3px rgba(0,0,0,0.06), 0 4px 6px -2px rgba(0,0,0,0.03)",
        glass: "0 8px 32px 0 rgba(99, 102, 241, 0.08)",
        premium: "0 20px 60px -10px rgba(79, 70, 229, 0.25), 0 4px 20px -4px rgba(0,0,0,0.08)",
      },
      animation: {
        "fade-in": "fadeIn 0.5s ease-out",
        "slide-up": "slideUp 0.5s ease-out",
        "float": "float 3s ease-in-out infinite",
        "pulse-subtle": "pulseSubtle 2s ease-in-out infinite",
        "shimmer": "shimmer 2s linear infinite",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { transform: "translateY(20px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-10px)" },
        },
        pulseSubtle: {
          "0%, 100%": { opacity: "1", transform: "scale(1)" },
          "50%": { opacity: "0.8", transform: "scale(0.98)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
    },
  },
  plugins: [],
};
