/** Iconos de linea, en SVG inline (sin dependencias, ~0 kB de JS). */
type P = { className?: string };

export const LockIcon = ({ className = 'h-4 w-4' }: P) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
    <rect x="4" y="10" width="16" height="11" rx="3" />
    <path d="M8 10V7a4 4 0 1 1 8 0v3" strokeLinecap="round" />
  </svg>
);

export const UnlockIcon = ({ className = 'h-4 w-4' }: P) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
    <rect x="4" y="10" width="16" height="11" rx="3" />
    <path d="M8 10V7a4 4 0 0 1 7.5-2" strokeLinecap="round" />
  </svg>
);

export const CheckIcon = ({ className = 'h-4 w-4' }: P) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="3" aria-hidden="true">
    <path d="M4 12.5l5.5 5.5L20 6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const ArrowLeftIcon = ({ className = 'h-4 w-4' }: P) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
    <path d="M19 12H5m0 0l6-6m-6 6l6 6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const SparkIcon = ({ className = 'h-4 w-4' }: P) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
    <path d="M12 1l2.2 6.3L20.5 9l-5.3 2.6L13 18l-2.4-6.4L5 9l6.1-1.7z" />
    <path d="M19 15l.9 2.4 2.4.9-2.4.9-.9 2.4-.9-2.4-2.4-.9 2.4-.9z" opacity=".7" />
  </svg>
);
