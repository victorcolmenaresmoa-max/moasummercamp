import { cn } from '@/lib/utils';

export function ProgressBar({ value, className }: { value: number; className?: string }) {
  const v = Math.max(0, Math.min(100, value));
  return (
    <div className={cn('h-2 w-full overflow-hidden rounded-full bg-brand-100', className)}>
      <div
        className={cn(
          'h-full rounded-full transition-all duration-500',
          v >= 80 ? 'bg-moss-500' : v >= 40 ? 'bg-brand-500' : 'bg-accent-500',
        )}
        style={{ width: `${v}%` }}
      />
    </div>
  );
}
