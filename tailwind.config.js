/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    './pages/**/*.{js,jsx}',
    './components/**/*.{js,jsx}',
    './app/**/*.{js,jsx}',
    './src/**/*.{js,jsx}',
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },

        // --- PALETA ESMERALD ---
        emerald: {
          100: '#cdd090', 
          300: '#82c6ba', 
          500: '#17a277', 
          700: '#055b4f', 
        },

        yellow: {
          DEFAULT: '#C59B27',
          100: '#FEF1A7',
          200: '#FEF1A7',
          300: '#C59B27',
          400: '#C59B27',
          500: '#C59B27', 
          600: '#8F6B19', 
          700: '#8F6B19',
          800: '#5B3B04',
          900: '#5B3B04',
        },
        amber: {
          DEFAULT: '#C59B27',
          100: '#FEF1A7',
          200: '#FEF1A7',
          300: '#C59B27',
          400: '#C59B27',
          500: '#C59B27', 
          600: '#8F6B19',
          700: '#8F6B19',
          800: '#5B3B04',
          900: '#5B3B04',
        },

        // Reforestal Custom Palette
        white: '#FFFFFF',
        light: '#EDEDED',
        olive: '#4E614E',
        forest: '#243524',
        gold: {
          DEFAULT: '#C59B27',
          500: '#C59B27',
          600: '#8F6B19',
          700: '#5B3B04',
          200: '#FEF1A7',
        },
        darkBg: '#022402',
        darkBgDeep: '#011101',

        reforestal: {
          light: '#EDEDED',
          dark: '#243524',
          darkDeep: '#011101',
          textPrimaryLight: '#022402',
          textPrimaryDark: '#EDEDED',
          textSecondary: '#4E614E',
          accentPrimary: '#C59B27',
          accentSecondary: '#8F6B19',
          border: '#4E614E',
        }
      },
      backgroundImage: {
        'gradient-gold': 'linear-gradient(to bottom, #734b07 0%, #cf9c2a 25%, #fef1a7 50%, #cf9c2a 75%, #734b07 100%)',
        'gradient-gold-radial': 'radial-gradient(circle at center, #fef1a7 0%, #cf9c2a 40%, #734b07 100%)',
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        xl: '0.75rem',
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
      boxShadow: {
        'soft': '0 2px 8px rgba(0, 0, 0, 0.08)',
        'premium': '0 8px 24px rgba(0, 0, 0, 0.12)',
        'glow': '0 0 20px rgba(197, 155, 39, 0.25)', 
        'glow-lg': '0 0 40px rgba(197, 155, 39, 0.4)',
      },
      transitionDuration: {
        'fast': '200ms',
        'normal': '300ms',
        'slow': '450ms',
      },
      keyframes: {
        "accordion-down": {
          from: { height: 0 },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: 0 },
        },
        "fade-in": {
          "0%": { opacity: 0 },
          "100%": { opacity: 1 },
        },
        "slide-up": {
          "0%": { transform: 'translateY(20px)', opacity: 0 },
          "100%": { transform: 'translateY(0)', opacity: 1 },
        },
        "pulse-glow": {
          "0%, 100%": { boxShadow: '0 0 20px rgba(197, 155, 39, 0.2)' },
          "50%": { boxShadow: '0 0 40px rgba(197, 155, 39, 0.5)' },
        },
        "float": {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-10px)" },
        },
        "shimmer": {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        }
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.4s ease-out",
        "slide-up": "slide-up 0.4s ease-out",
        "pulse-glow": "pulse-glow 2s infinite",
        "float": "float 3s ease-in-out infinite",
        "shimmer": "shimmer 2s linear infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}