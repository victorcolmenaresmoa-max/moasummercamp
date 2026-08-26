import { cn } from '@/lib/utils';

const tones = {
  neutral: 'bg-brand-50 text-brand-700',
  success: 'bg-moss-100 text-moss-500',
  warn: 'bg-amber-100 text-amber-800',
  danger: 'bg-clay-100 text-clay-500',
  accent: 'bg-accent-400/20 text-accent-600',
} as const;

export function Badge({
  children,
  tone = 'neutral',
  className,
}: {
  children: React.ReactNode;
  tone?: keyof typeof tones;
  className?: string;
}) {
  return <span className={cn('chip', tones[tone], className)}>{children}</span>;
}
