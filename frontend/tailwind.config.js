module.exports = {
  darkMode: 'class',
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: {
          50: "#eef2ff",
          100: "#e0e7ff",
          200: "#c7d2fe",
          300: "#a5b4fc",
          400: "#818cf8",
          500: "#6366f1", // Indigo 500 - Main Brand Color
          600: "#4f46e5", // Indigo 600 - Hover State
          700: "#4338ca",
          800: "#3730a3",
          900: "#312e81",
          950: "#1e1b4b",
        },
        secondary: {
          50: "#ecfdf5",
          100: "#d1fae5",
          200: "#a7f3d0",
          300: "#6ee7b7",
          400: "#34d399",
          500: "#10b981", // Emerald 500 - Success/Wellness
          600: "#059669",
          700: "#047857",
          800: "#065f46",
          900: "#064e3b",
          950: "#022c22",
        },
        accent: {
          50: "#fdf4ff",
          100: "#fae8ff",
          200: "#f5d0fe",
          300: "#f0abfc",
          400: "#e879f9",
          500: "#d946ef", // Fuchsia 500 - Premium Accent
          600: "#c026d3",
          700: "#a21caf",
          800: "#86198f",
          900: "#701a75",
          950: "#4a044e",
        },
        neutral: {
          50: "#f8fafc",
          100: "#f1f5f9",
          200: "#e2e8f0",
          300: "#cbd5e1",
          400: "#94a3b8",
          500: "#64748b",
          600: "#475569",
          700: "#334155",
          800: "#1e293b",
          900: "#0f172a",
          950: "#020617",
        },
        surface: {
          light: "#ffffff",
          dark: "#0f172a",
          "glass-light": "rgba(255, 255, 255, 0.7)",
          "glass-dark": "rgba(15, 23, 42, 0.7)",
        },
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        display: ["Outfit", "Inter", "sans-serif"],
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
