import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getVerifiedUserId } from '@/lib/supabase/auth';

const COOKIE_NAME = 'moa_google_signup';
const VALID_CAMPUSES = new Set(['merida', 'el_vigia']);
const VALID_ROUTES = new Set(['a2_b1', 'b2_c1']);

function configuredCampCode() {
  // Keep compatibility with the current Vercel variable. CAMP_CODE is the
  // preferred server-only name for future deployments.
  return process.env.CAMP_CODE ?? process.env.NEXT_PUBLIC_CAMP_CODE ?? 'MOA2026';
}

export async function POST(request: Request) {
  let body: { campus?: string; workbookRoute?: string; code?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid registration data.' }, { status: 400 });
  }

  const campus = body.campus?.trim() ?? '';
  const workbookRoute = body.workbookRoute?.trim() ?? '';
  const code = body.code?.trim() ?? '';

  if (!VALID_CAMPUSES.has(campus) || !VALID_ROUTES.has(workbookRoute)) {
    return NextResponse.json({ ok: false, error: 'Choose a valid campus and workbook route.' }, { status: 400 });
  }

  if (code.toUpperCase() !== configuredCampCode().trim().toUpperCase()) {
    return NextResponse.json(
      { ok: false, error: 'The camp code is incorrect. Ask your moderator for the correct code.' },
      { status: 403 },
    );
  }

  const supabase = createClient();
  const userId = await getVerifiedUserId(supabase);

  if (userId) {
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ ok: false, error: 'Your account profile could not be loaded.' }, { status: 500 });
    }

    if (profile.role === 'participant') {
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          campus: campus as 'merida' | 'el_vigia',
          workbook_route: workbookRoute as 'a2_b1' | 'b2_c1',
        })
        .eq('id', userId);

      if (updateError) {
        return NextResponse.json({ ok: false, error: 'We could not finish your profile. Please try again.' }, { status: 500 });
      }
    }

    const response = NextResponse.json({ ok: true, completed: true });
    response.cookies.set(COOKIE_NAME, '', { path: '/', maxAge: 0 });
    return response;
  }

  // The values are written by the server only after validating the camp code.
  // They survive the Google redirect and are consumed by /auth/callback.
  const response = NextResponse.json({ ok: true, completed: false });
  response.cookies.set(
    COOKIE_NAME,
    `${campus}:${workbookRoute}`,
    {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 10 * 60,
    },
  );
  return response;
}
