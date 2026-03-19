import { cva } from 'class-variance-authority';
import { cn } from '../../lib/utils';

const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]',
  {
    variants: {
      variant: {
        neutral: 'border-[color:var(--line-soft)] bg-white/[0.03] text-[color:var(--text-soft)]',
        critical: 'border-red-400/20 bg-red-500/10 text-red-200',
        warning: 'border-amber-400/20 bg-amber-500/10 text-amber-200',
        success: 'border-emerald-400/20 bg-emerald-500/10 text-emerald-200',
      },
    },
    defaultVariants: {
      variant: 'neutral',
    },
  }
);

export function Badge({ className, variant, ...props }) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
