import * as AvatarPrimitive from '@radix-ui/react-avatar';
import { cn } from '../../lib/utils';

export function Avatar({ className, ...props }) {
  return (
    <AvatarPrimitive.Root
      className={cn('inline-flex h-10 w-10 shrink-0 overflow-hidden rounded-full border border-white/10', className)}
      {...props}
    />
  );
}

export function AvatarImage(props) {
  return <AvatarPrimitive.Image className="aspect-square h-full w-full object-cover" {...props} />;
}

export function AvatarFallback({ className, ...props }) {
  return (
    <AvatarPrimitive.Fallback
      className={cn('flex h-full w-full items-center justify-center bg-[color:var(--surface-overlay)] text-sm font-semibold text-[color:var(--text-strong)]', className)}
      {...props}
    />
  );
}
