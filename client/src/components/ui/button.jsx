import * as React from 'react';
import { cva } from 'class-variance-authority';
import { cn } from '../../lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--bg)] disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-[color:var(--accent-strong)] text-white shadow-[0_12px_30px_rgba(17,24,39,0.18)] hover:-translate-y-0.5 hover:bg-[color:var(--accent)]',
        secondary: 'border border-[color:var(--line-soft)] bg-[color:var(--surface-raised)] text-[color:var(--text-strong)] hover:border-[color:var(--line-strong)] hover:bg-[color:var(--surface-overlay)]',
        ghost: 'text-[color:var(--text-soft)] hover:bg-white/5 hover:text-[color:var(--text-strong)]',
        destructive: 'bg-[color:var(--critical-strong)] text-white shadow-[0_10px_24px_rgba(225,77,77,0.18)] hover:bg-[color:var(--critical)]',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-8 px-3 text-xs',
        lg: 'h-11 px-5',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

const Button = React.forwardRef(({ className, variant, size, ...props }, ref) => (
  <button
    className={cn(buttonVariants({ variant, size }), className)}
    ref={ref}
    {...props}
  />
));

Button.displayName = 'Button';

export { Button, buttonVariants };
