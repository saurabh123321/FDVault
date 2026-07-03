import NextAuth from 'next-auth';
import { authConfig } from './auth.config';

export default NextAuth(authConfig).auth;

export const config = {
  // Protect routes except authentication paths, static files, and images
  matcher: ['/((?!api/auth|_next/static|_next/image|.*\\.png$|favicon.ico).*)'],
};
