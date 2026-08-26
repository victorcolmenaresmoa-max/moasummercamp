import { cn } from '@/lib/utils';

export function ProgressBar({
  value,
  className,
  tone,
}: {
  value: number;
  className?: string;
  /** Fuerza un color; por defecto se degrada segun el avance. */
  tone?: 'teal' | 'sun' | 'coral' | 'moss';
}) {
  const v = Math.max(0, Math.min(100, Math.round(value)));
  const auto = v >= 100 ? 'bg-moss-500' : v >= 50 ? 'bg-teal-500' : v > 0 ? 'bg-sun-400' : 'bg-teal-200';
  const fill = tone ? { teal: 'bg-teal-500', sun: 'bg-sun-400', coral: 'bg-coral-500', moss: 'bg-moss-500' }[tone] : auto;

  return (
    <div
      role="progressbar"
      aria-valuenow={v}
      aria-valuemin={0}
      aria-valuemax={100}
      className={cn('h-2.5 w-full overflow-hidden rounded-full bg-teal-100', className)}
    >
      <div className={cn('h-full rounded-full transition-[width] duration-500 ease-out', fill)} style={{ width: `${v}%` }} />
    </div>
  );
}
