import { NextRequest, NextResponse } from 'next/server';
import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

const PUBLIC_PATHS = ['/login'];
const intlMiddleware = createMiddleware(routing);

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  const pathnameIsMissingLocale = routing.locales.every(
    (locale) => !pathname.startsWith(`/${locale}/`) && pathname !== `/${locale}`
  );

  const pathWithoutLocale = pathnameIsMissingLocale
    ? pathname
    : pathname.replace(new RegExp(`^/(${routing.locales.join('|')})/?`), '/');

  const pathToCheck = pathWithoutLocale || '/';
  const isPublic = PUBLIC_PATHS.some((p) => pathToCheck.startsWith(p));

  // Only use tms_role cookie (JS-settable) to decide authentication state.
  // We deliberately ignore the httpOnly access_token cookie here because
  // when the API is unreachable, the client clears tms_role but cannot clear
  // the httpOnly cookie — using access_token would cause an infinite loop.
  const hasSession = request.cookies.has('tms_role');

  // Redirect unauthenticated users away from protected routes
  if (!hasSession && !isPublic && pathToCheck !== '/') {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }

  // Do NOT redirect authenticated users away from /login here.
  // Let the client (providers.tsx + layout.tsx) do that after /auth/me succeeds.
  // This avoids the loop: middleware → /dashboard → API fails → /login → middleware → /dashboard...

  if (pathToCheck.startsWith('/users')) {
    const role = request.cookies.get('tms_role')?.value;
    if (role !== 'ADMIN') {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  // Guard /moderator routes for MODERATOR and ADMIN only
  if (pathToCheck.startsWith('/moderator')) {
    const role = request.cookies.get('tms_role')?.value;
    if (role !== 'MODERATOR' && role !== 'ADMIN') {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  return intlMiddleware(request);
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)'],
};
