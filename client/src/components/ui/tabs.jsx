import * as TabsPrimitive from '@radix-ui/react-tabs';
import { cn } from '../../lib/utils';

export const Tabs = TabsPrimitive.Root;

export function TabsList({ className, ...props }) {
  return (
    <TabsPrimitive.List
      className={cn('inline-flex rounded-full border border-[color:var(--line-soft)] bg-[color:var(--surface-raised)] p-1', className)}
      {...props}
    />
  );
}

export function TabsTrigger({ className, ...props }) {
  return (
    <TabsPrimitive.Trigger
      className={cn(
        'inline-flex items-center justify-center rounded-full px-4 py-2 text-sm font-medium text-[color:var(--text-soft)] transition-all data-[state=active]:bg-[color:var(--surface-overlay)] data-[state=active]:text-[color:var(--text-strong)]',
        className
      )}
      {...props}
    />
  );
}

export function TabsContent({ className, ...props }) {
  return (
    <TabsPrimitive.Content
      className={cn('mt-4 outline-none', className)}
      {...props}
    />
  );
}
