export const theme = {
  // Now referencing CSS Variables defined in index.css
  colors: {
    primary: {
      DEFAULT: "var(--primary)",
      foreground: "var(--primary-foreground)",
    },
    secondary: {
      DEFAULT: "var(--secondary)",
      foreground: "var(--secondary-foreground)",
    },
    background: {
      DEFAULT: "var(--background)",
      card: "var(--card)",
      popover: "var(--popover)",
    },
    text: {
      main: "var(--foreground)",
      muted: "var(--muted-foreground)",
    },
    border: "var(--border)",
  },
  typography: {
    h1: "text-3xl md:text-4xl font-bold tracking-tight text-foreground",
    h2: "text-2xl font-bold tracking-tight text-foreground",
    h3: "text-lg font-bold text-foreground",
    body: "text-base text-muted-foreground leading-relaxed",
    small: "text-sm text-muted-foreground",
  },
  spacing: {
    card: "p-6 md:p-8",
    section: "py-12 md:py-16",
    gap: "gap-6",
  },
  effects: {
    glass: "backdrop-blur-md bg-card/80 border border-border shadow-sm",
    hoverCard: "transition-all duration-300 hover:shadow-lg hover:-translate-y-1 hover:border-primary/50",
    gradient: "bg-gradient-to-br from-background via-card to-accent",
  }
};

export const animations = {
  container: {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2
      }
    }
  },
  item: {
    hidden: { opacity: 0, y: 20 },
    show: { 
      opacity: 1, 
      y: 0,
      transition: {
        type: "spring",
        stiffness: 50,
        damping: 15
      }
    }
  },
  fadeIn: {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { duration: 0.5 } }
  },
  scaleUp: {
    hidden: { scale: 0.9, opacity: 0 },
    show: { 
      scale: 1, 
      opacity: 1,
      transition: {
        type: "spring",
        bounce: 0.4
      }
    }
  }
};