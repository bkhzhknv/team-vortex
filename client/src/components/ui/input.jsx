import * as React from 'react';
import { cn } from '../../lib/utils';

const Input = React.forwardRef(({ className, ...props }, ref) => (
  <input
    ref={ref}
    className={cn(
      'flex h-11 w-full rounded-2xl border border-[color:var(--line-soft)] bg-[color:var(--surface-raised)] px-4 py-2 text-sm text-[color:var(--text-strong)] outline-none transition-all placeholder:text-[color:var(--text-faint)] focus:border-[color:var(--line-strong)] focus:ring-2 focus:ring-[color:var(--ring)]',
      className
    )}
    {...props}
  />
));

Input.displayName = 'Input';

export { Input };
