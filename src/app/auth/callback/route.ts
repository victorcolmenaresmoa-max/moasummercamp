import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const COOKIE_NAME = 'moa_google_signup';

type PendingSignup = {
  campus: 'merida' | 'el_vigia';
  workbookRoute: 'a2_b1' | 'b2_c1';
};

function readPendingSignup(raw: string | undefined): PendingSignup | null {
  if (!raw) return null;
  const [campus, workbookRoute] = raw.split(':');
  if (
    (campus === 'merida' || campus === 'el_vigia') &&
    (workbookRoute === 'a2_b1' || workbookRoute === 'b2_c1')
  ) {
    return { campus, workbookRoute };
  }
  return null;
}

function safeNext(value: string | null) {
  return value && value.startsWith('/') && !value.startsWith('//') ? value : null;
}

function redirectResponse(request: Request, path: string) {
  const { origin } = new URL(request.url);
  const forwardedHost = request.headers.get('x-forwarded-host');
  const forwardedProto = request.headers.get('x-forwarded-proto') ?? 'https';
  const base = process.env.NODE_ENV === 'development' || !forwardedHost
    ? origin
    : `${forwardedProto}://${forwardedHost}`;
  return NextResponse.redirect(`${base}${path}`);
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const mode = url.searchParams.get('mode') === 'signup' ? 'signup' : 'login';
  const next = safeNext(url.searchParams.get('next'));

  if (!code) {
    return redirectResponse(request, '/login?error=google-callback');
  }

  const supabase = createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.user) {
    return redirectResponse(request, '/login?error=google-session');
  }

  if (mode === 'signup') {
    const pending = readPendingSignup(cookies().get(COOKIE_NAME)?.value);

    if (pending) {
      await supabase
        .from('profiles')
        .update({ campus: pending.campus, workbook_route: pending.workbookRoute })
        .eq('id', data.user.id)
        .eq('role', 'participant');
    }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, campus')
    .eq('id', data.user.id)
    .single();

  if (!profile) {
    return redirectResponse(request, '/login?error=no-profile');
  }

  // A participant who entered through /login before registering is required to
  // enter the camp code and select the correct route before accessing the lab.
  if (profile.role === 'participant' && !profile.campus) {
    const response = redirectResponse(request, '/signup?complete=1');
    response.cookies.set(COOKIE_NAME, '', { path: '/', maxAge: 0 });
    return response;
  }

  const destination = next ?? (profile.role === 'participant' ? '/lab' : '/moderator');
  const response = redirectResponse(request, destination);
  response.cookies.set(COOKIE_NAME, '', { path: '/', maxAge: 0 });
  return response;
}
