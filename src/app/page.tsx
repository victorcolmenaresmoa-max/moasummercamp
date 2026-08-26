import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { MoaLogo, MoaPattern, Squiggle, Burst, Arc, Quote } from '@/components/brand/Moa';

export const dynamic = 'force-dynamic';

const DAYS = [
  { n: 1, theme: 'IDENTITY', q: '¿Quién soy como docente MOA?', tone: 'bg-sun-400 text-plum-500' },
  { n: 2, theme: 'CLARITY', q: 'Explicar, modelar, verificar.', tone: 'bg-coral-500 text-white' },
  { n: 3, theme: 'DECISION', q: 'Decidir con evidencia, no con intuición.', tone: 'bg-plum-500 text-white' },
  { n: 4, theme: 'GROWTH', q: 'Mi próximo paso profesional.', tone: 'bg-teal-700 text-white' },
];

export default async function Home() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
    redirect(!profile || profile.role === 'participant' ? '/lab' : '/moderator');
  }

  return (
    <main className="min-h-screen">
      {/* ------------------------------------------------------------- HERO */}
      <section className="relative isolate overflow-hidden bg-teal-500 text-white">
        <MoaPattern />
        <div className="relative mx-auto max-w-5xl px-6 py-16 sm:py-24">
          <MoaLogo tone="light" />

          <p className="eyebrow mt-12 text-sun-400">Immersive Summer Camp 2026</p>
          <h1 className="h-display mt-3 text-balance text-4xl leading-[1.05] sm:text-6xl">
            Reading&nbsp;Lab
          </h1>
          <p className="mt-4 max-w-xl text-lg font-semibold text-white/85">
            Route 1 · Teachers A2/B1 · Cuatro laboratorios de lectura.
          </p>

          <p className="mt-6 max-w-xl text-white/75">
            Identity, Clarity, Decision y Growth. Tú eres el protagonista de la sesión;
            el moderador acompaña y firma tus checkpoints.
          </p>

          <div className="mt-9 inline-flex flex-wrap items-center gap-3 rounded-full bg-plum-500 px-6 py-3">
            <Quote className="h-4 w-5 text-sun-400" />
            <span className="h-display text-sm sm:text-base">Read first. Think second. Ask AI third.</span>
          </div>

          <div className="mt-10 flex flex-wrap gap-3">
            <Link href="/signup" className="btn-accent px-7 py-3 text-base shadow-pop">
              Registrarme
            </Link>
            <Link href="/login" className="btn-onDark px-7 py-3 text-base">
              Ya tengo cuenta
            </Link>
          </div>
        </div>

        {/* corte ondulado hacia el contenido */}
        <svg viewBox="0 0 1440 60" preserveAspectRatio="none" className="block h-10 w-full text-paper" aria-hidden="true">
          <path d="M0 60V22c180 34 360 34 540 0s360-34 540 0 360 34 360 0v38z" fill="currentColor" />
        </svg>
      </section>

      {/* -------------------------------------------------------- LOS 4 DÍAS */}
      <section className="mx-auto max-w-5xl px-6 py-14">
        <div className="flex items-center gap-4">
          <Squiggle className="h-7 w-24 shrink-0 text-coral-500" />
          <h2 className="h-display text-2xl text-teal-900">Tu ruta de 4 días</h2>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {DAYS.map((d, i) => (
            <article
              key={d.n}
              className={`card relative overflow-hidden p-5 animate-fade-up`}
              style={{ animationDelay: `${i * 70}ms` }}
            >
              <span className={`chip ${d.tone}`}>Day {d.n}</span>
              <h3 className="h-display mt-3 text-lg text-teal-900">{d.theme}</h3>
              <p className="mt-1 text-sm leading-relaxed text-ink/65">{d.q}</p>
              <Arc className="pointer-events-none absolute -bottom-3 -right-3 h-10 w-20 text-teal-100" />
            </article>
          ))}
        </div>

        <div className="mt-10 flex items-start gap-4 rounded-3xl border-2 border-dashed border-teal-200 bg-white/60 p-5">
          <Burst className="mt-0.5 h-7 w-7 shrink-0 text-sun-500" />
          <p className="text-sm leading-relaxed text-ink/70">
            <strong className="text-teal-800">Cada día se abre en su sesión.</strong> Tu moderador activa
            el laboratorio del día cuando empieza la clase. No podrás adelantar días desde casa:
            el camp se vive aquí, con tu grupo.
          </p>
        </div>
      </section>

      <footer className="border-t border-teal-900/5 py-8 text-center">
        <p className="text-xs font-semibold text-ink/45">
          MOA Education · Immersive Summer Camp 2026 · Mérida &amp; El Vigía
        </p>
      </footer>
    </main>
  );
}
