// @refresh reset
import { cn } from '@/lib/utils';
import { Slot } from '@radix-ui/react-slot';
import { cva } from 'class-variance-authority';
import React from 'react';

const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-xl text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 ring-offset-background whitespace-normal text-center overflow-hidden',
  {
    variants: {
      variant: {
        default: 'bg-gradient-to-r from-[#063127] to-[#5b8370] text-[#c4d1c0] shadow-md hover:shadow-lg hover:shadow-[#063127]/30 hover:scale-[1.02] border-none',
        destructive:
          'bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-md',
        outline:
          'border-2 border-[#5b8370]/50 text-[#063127] hover:bg-[#5b8370]/10 dark:text-[#c4d1c0] dark:border-[#5b8370]/50 dark:hover:bg-[#5b8370]/20',
        secondary:
          'bg-white border-2 border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300 shadow-sm',
        ghost: 'hover:bg-[#5b8370]/10 hover:text-[#063127] dark:hover:bg-[#5b8370]/20 dark:hover:text-[#c4d1c0]',
        link: 'text-[#5b8370] hover:text-[#063127] dark:hover:text-[#c4d1c0] underline-offset-4 hover:underline',
        gold: 'bg-gold text-[#011101] hover:bg-gold-600 shadow-md hover:shadow-glow font-bold',
        primary: 'bg-gradient-to-r from-[#063127] to-[#5b8370] text-[#c4d1c0] shadow-md hover:shadow-lg hover:shadow-[#063127]/30 hover:scale-[1.02] border-none',
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