import * as DialogPrimitive from '@radix-ui/react-dialog';
import { IconX } from '@tabler/icons-react';
import { cn } from '../../lib/utils';

export const Sheet = DialogPrimitive.Root;
export const SheetTrigger = DialogPrimitive.Trigger;
export const SheetClose = DialogPrimitive.Close;

export function SheetPortal(props) {
  return <DialogPrimitive.Portal {...props} />;
}

export function SheetOverlay({ className, ...props }) {
  return (
    <DialogPrimitive.Overlay
      className={cn(
        'fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm data-[state=closed]:animate-fade-out data-[state=open]:animate-fade-in',
        className
      )}
      {...props}
    />
  );
}

export function SheetContent({ className, children, side = 'right', ...props }) {
  return (
    <SheetPortal>
      <SheetOverlay />
      <DialogPrimitive.Content
        className={cn(
          'fixed z-50 flex h-full flex-col gap-4 border border-white/8 bg-[color:var(--surface)] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.32)] outline-none',
          side === 'right' && 'inset-y-0 right-0 w-full max-w-[540px] data-[state=closed]:animate-slide-out-right data-[state=open]:animate-slide-in-right',
          className
        )}
        {...props}
      >
        {children}
        <DialogPrimitive.Close className="absolute right-4 top-4 inline-flex h-9 w-9 items-center justify-center rounded-full border border-[color:var(--line-soft)] text-[color:var(--text-soft)] transition hover:text-[color:var(--text-strong)]">
          <IconX size={18} />
          <span className="sr-only">Close</span>
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </SheetPortal>
  );
}

export const SheetHeader = ({ className, ...props }) => (
  <div className={cn('flex flex-col gap-2 pr-10', className)} {...props} />
);

export const SheetTitle = ({ className, ...props }) => (
  <DialogPrimitive.Title className={cn('text-xl font-semibold tracking-[-0.03em] text-[color:var(--text-strong)]', className)} {...props} />
);

export const SheetDescription = ({ className, ...props }) => (
  <DialogPrimitive.Description className={cn('text-sm text-[color:var(--text-muted)]', className)} {...props} />
);
