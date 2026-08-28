import Image from 'next/image';
import moaLogo from '../../../public/moa-logo.webp';
import moaWordmark from '../../../public/moa-wordmark.png';

/**
 * Piezas gráficas de marca MOA Education.
 *
 * El logotipo es el archivo oficial de marca (public/moa-logo.webp).
 * Las figuras decorativas siguen siendo SVG inline: cero peticiones de red,
 * escalan perfecto y heredan el color con clases de Tailwind.
 */

/* -------------------------------------------------------------- LOGOTIPO */
/**
 * El isotipo oficial de MOA Education.
 *
 * Antes esta marca era una "m" dibujada a mano en SVG que solo se PARECIA a la
 * del logo. Ahora se usa el archivo real de marca (public/moa-logo.webp), asi
 * que las proporciones, la curva de la onda y el grosor de los trazos son
 * exactamente los del manual, no una aproximacion.
 *
 * El asset ya esta reducido a WebP (128 px) y se sirve directamente, sin pagar
 * una transformacion dinamica para un logo de apenas 36 px en pantalla.
 */
export function MoaMark({ className = 'h-9 w-9' }: { className?: string }) {
  return (
    <Image
      src={moaLogo}
      alt="MOA Education"
      priority
      unoptimized
      sizes="64px"
      className={`rounded-[22%] object-contain ${className}`}
    />
  );
}

export function MoaWordmark({
  className = '',
  tone = 'dark',
}: {
  className?: string;
  tone?: 'dark' | 'light';
}) {
  return (
    <Image
      src={moaWordmark}
      alt="MOA Education"
      priority
      unoptimized
      sizes="120px"
      className={`h-9 w-auto object-contain ${tone === 'light' ? 'brightness-0 invert' : ''} ${className}`}
    />
  );
}

export function MoaLogo({ className = '', tone = 'dark' }: { className?: string; tone?: 'dark' | 'light' }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${tone === 'light' ? 'text-white' : 'text-teal-900'} ${className}`}>
      <MoaMark className="h-9 w-9 shrink-0" />
      <MoaWordmark tone={tone} />
    </span>
  );
}

/* ---------------------------------------------------- FIGURAS DECORATIVAS */
type ShapeProps = { className?: string };

export const Squiggle = ({ className = '' }: ShapeProps) => (
  <svg viewBox="0 0 120 40" className={className} fill="none" aria-hidden="true">
    <path
      d="M4 20c0-9 7-16 16-16s16 7 16 16 7 16 16 16 16-7 16-16 7-16 16-16 16 7 16 16"
      stroke="currentColor"
      strokeWidth="9"
      strokeLinecap="round"
    />
  </svg>
);

export const Burst = ({ className = '' }: ShapeProps) => (
  <svg viewBox="0 0 100 100" className={className} aria-hidden="true">
    <path
      d="M50 0l9 26 22-16-10 25 27-3-22 16 22 16-27-3 10 25-22-16-9 26-9-26-22 16 10-25-27 3 22-16-22-16 27 3-10-25 22 16z"
      fill="currentColor"
    />
  </svg>
);

export const Arc = ({ className = '' }: ShapeProps) => (
  <svg viewBox="0 0 100 52" className={className} fill="none" aria-hidden="true">
    <path d="M6 50a44 44 0 0 1 88 0" stroke="currentColor" strokeWidth="14" strokeLinecap="round" />
  </svg>
);

export const Blob = ({ className = '' }: ShapeProps) => (
  <svg viewBox="0 0 120 120" className={className} aria-hidden="true">
    <path
      d="M96 22c11 12 8 36 1 53s-19 27-36 29-38-4-48-19S6 47 17 32 40 6 59 5s26 5 37 17z"
      fill="currentColor"
    />
  </svg>
);

export const Quote = ({ className = '' }: ShapeProps) => (
  <svg viewBox="0 0 100 70" className={className} aria-hidden="true">
    <path
      d="M0 70V38C0 17 12 3 33 0l5 13c-11 3-17 9-18 18h16v39H0zm56 0V38C56 17 68 3 89 0l5 13c-11 3-17 9-18 18h16v39H56z"
      fill="currentColor"
    />
  </svg>
);

export const Pill = ({ className = '' }: ShapeProps) => (
  <svg viewBox="0 0 140 60" className={className} fill="none" aria-hidden="true">
    <rect x="7" y="7" width="126" height="46" rx="23" stroke="currentColor" strokeWidth="10" />
  </svg>
);

export const Gear = ({ className = '' }: ShapeProps) => (
  <svg viewBox="0 0 100 100" className={className} aria-hidden="true">
    <path
      d="M50 2l7 10 12-6 2 13 13 1-4 13 11 7-9 10 7 11-13 4 2 13-13-2-5 12-10-8-10 8-5-12-13 2 2-13-13-4 7-11-9-10 11-7-4-13 13-1 2-13 12 6z"
      fill="currentColor"
    />
    <circle cx="50" cy="50" r="15" className="fill-paper" />
  </svg>
);

/* --------------------------------------------------- FONDO DE MARCA (hero) */
/**
 * Lienzo decorativo con las figuras del key visual de MOA.
 * `variant` cambia la densidad para no competir con el contenido.
 */
export function MoaPattern({
  variant = 'full',
  className = '',
}: {
  variant?: 'full' | 'soft';
  className?: string;
}) {
  const soft = variant === 'soft';
  return (
    <div
      className={`pointer-events-none absolute inset-0 overflow-hidden ${soft ? 'opacity-[.32]' : ''} ${className}`}
      aria-hidden="true"
    >
      {/* onda madre del logo */}
      <svg
        viewBox="0 0 400 400"
        preserveAspectRatio="xMidYMid slice"
        className="absolute inset-0 h-full w-full text-white/[.07]"
      >
        <path d="M330 -40C330 90 70 70 70 200s260 110 260 240" stroke="currentColor" strokeWidth="90" fill="none" />
      </svg>

      <Burst className={`absolute -left-6 top-6 h-24 w-24 text-teal-700/60 ${soft ? 'opacity-40' : ''}`} />
      <Squiggle className="absolute left-[22%] top-4 h-10 w-32 text-coral-500 opacity-90" />
      <Arc className="absolute bottom-6 left-8 h-14 w-28 text-sun-400" />
      <Pill className="absolute bottom-4 left-[38%] h-12 w-28 text-coral-400/80" />
      <Quote className="absolute right-[28%] top-2 h-16 w-20 text-teal-700/50" />
      <Gear className={`absolute -right-6 bottom-2 h-28 w-28 text-plum-500 ${soft ? 'opacity-50' : 'opacity-90'}`} />
      <svg viewBox="0 0 100 200" className="absolute right-6 top-0 h-full w-16 text-sun-400/90" aria-hidden="true">
        <path d="M50 0c40 25 40 45 0 70s-40 45 0 70 40 45 0 60" stroke="currentColor" strokeWidth="26" fill="none" />
      </svg>
    </div>
  );
}
