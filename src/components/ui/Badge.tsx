import { cn } from '@/lib/utils';

const tones = {
  neutral: 'bg-teal-50 text-teal-700',
  success: 'bg-moss-100 text-moss-600',
  warn: 'bg-sun-100 text-sun-700',
  danger: 'bg-coral-100 text-coral-700',
  accent: 'bg-sun-400 text-plum-500',
  coral: 'bg-coral-500 text-white',
  plum: 'bg-plum-500 text-white',
  teal: 'bg-teal-500 text-white',
  locked: 'bg-plum-50 text-plum-400',
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
