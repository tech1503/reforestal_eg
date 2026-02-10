import { cn } from '@/lib/utils';
import { Slot } from '@radix-ui/react-slot';
import { cva } from 'class-variance-authority';
import React from 'react';

const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-xl text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 ring-offset-background whitespace-normal text-center',
  {
    variants: {
      variant: {
        default: 'bg-gradient-to-r from-[#055b4f] to-[#17a277] text-white shadow-md hover:shadow-lg hover:scale-[1.02] border border-transparent',
        destructive:
          'bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-md',
        outline:
          'border-2 border-[#17a277]/50 text-[#055b4f] hover:bg-[#17a277]/10 dark:text-white dark:border-white/50 dark:hover:bg-white/10',
        secondary:
          'bg-white border-2 border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300 shadow-sm',
        ghost: 'hover:bg-[#17a277]/10 hover:text-[#055b4f] dark:hover:text-white',
        link: 'text-[#17a277] underline-offset-4 hover:underline',
        gold: 'bg-gold text-[#011101] hover:bg-gold-600 shadow-md hover:shadow-glow font-bold',
        primary: 'bg-gradient-to-r from-[#055b4f] to-[#17a277] text-white shadow-md hover:shadow-lg hover:scale-[1.02]',
      },
      size: {
        default: 'h-auto min-h-[2.75rem] px-6 py-3', 
        sm: 'h-auto min-h-[2.25rem] rounded-lg px-4 py-2', 
        lg: 'h-auto min-h-[3rem] rounded-xl px-8 py-4 text-base', 
        icon: 'h-10 w-10 shrink-0', 
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

const Button = React.forwardRef(({ className, variant, size, asChild = false, ...props }, ref) => {
  const Comp = asChild ? Slot : 'button';
  return (
    <Comp
      className={cn(buttonVariants({ variant, size, className }))}
      ref={ref}
      {...props}
    />
  );
});
Button.displayName = 'Button';

export { Button, buttonVariants };
