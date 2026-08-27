import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    },
  );

  const path = request.nextUrl.pathname;
  const isProtected = path.startsWith('/lab') || path.startsWith('/moderator');

  // getClaims() verifies the existing JWT without forcing a full Auth-server
  // user lookup on every navigation.
  const { data } = await supabase.auth.getClaims();
  const userId = typeof data?.claims?.sub === 'string' ? data.claims.sub : null;

  if (isProtected && !userId) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('next', path);
    return NextResponse.redirect(url);
  }

  if (userId && path === '/login') {
    const url = request.nextUrl.clone();
    url.pathname = '/lab';
    url.search = '';
    return NextResponse.redirect(url);
  }

  // /signup?complete=1 is intentionally available to an authenticated Google
  // user whose profile still needs campus/route + camp-code validation.
  if (userId && path === '/signup' && request.nextUrl.searchParams.get('complete') !== '1') {
    const url = request.nextUrl.clone();
    url.pathname = '/lab';
    url.search = '';
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: ['/lab/:path*', '/moderator/:path*', '/login', '/signup'],
};
