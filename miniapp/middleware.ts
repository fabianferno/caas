export { auth as middleware } from '@/auth';

export const config = {
  matcher: [
    '/((?!api/agent-apps|_next/static|_next/image|favicon.ico).*)',
  ],
};
