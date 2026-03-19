import * as DropdownMenuPrimitive from '@radix-ui/react-dropdown-menu';
import { cn } from '../../lib/utils';

export const DropdownMenu = DropdownMenuPrimitive.Root;
export const DropdownMenuTrigger = DropdownMenuPrimitive.Trigger;

export function DropdownMenuContent({ className, sideOffset = 12, ...props }) {
  return (
    <DropdownMenuPrimitive.Portal>
      <DropdownMenuPrimitive.Content
        sideOffset={sideOffset}
        className={cn(
          'z-50 min-w-[220px] rounded-3xl border border-[color:var(--line-soft)] bg-[color:var(--surface)] p-2 shadow-[0_24px_80px_rgba(0,0,0,0.3)] data-[side=bottom]:animate-slide-down-fade',
          className
        )}
        {...props}
      />
    </DropdownMenuPrimitive.Portal>
  );
}

export function DropdownMenuItem({ className, ...props }) {
  return (
    <DropdownMenuPrimitive.Item
      className={cn(
        'flex cursor-default items-center gap-2 rounded-2xl px-3 py-2 text-sm text-[color:var(--text-soft)] outline-none transition hover:bg-[color:var(--surface-overlay)] hover:text-[color:var(--text-strong)] focus:bg-[color:var(--surface-overlay)] focus:text-[color:var(--text-strong)]',
        className
      )}
      {...props}
    />
  );
}
