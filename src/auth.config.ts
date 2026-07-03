import type { NextAuthConfig } from 'next-auth';

export const authConfig = {
  trustHost: true,
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isApiRoute = nextUrl.pathname.startsWith('/api');
      const isAuthRoute = nextUrl.pathname.startsWith('/api/auth') || nextUrl.pathname === '/login';
      const isPublicRoute = nextUrl.pathname === '/'; // landing page or root

      // API routes protection
      if (isApiRoute && !isAuthRoute) {
        return isLoggedIn; // True if logged in, false (unauthorized) if not
      }

      // Page routes protection
      const isOnDashboard = 
        nextUrl.pathname.startsWith('/dashboard') || 
        nextUrl.pathname.startsWith('/fds') || 
        nextUrl.pathname.startsWith('/settings');

      if (isOnDashboard) {
        if (isLoggedIn) return true;
        return false; // Redirect to /login
      } else if (isLoggedIn && nextUrl.pathname === '/login') {
        return Response.redirect(new URL('/dashboard', nextUrl));
      }

      return true;
    },
    jwt({ token, user }) {
      if (user) {
        token.role = (user as any).role;
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
        token.familyId = (user as any).familyId;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        (session.user as any).role = token.role;
        (session.user as any).id = token.id as string;
        session.user.email = token.email as string;
        session.user.name = token.name as string;
        (session.user as any).familyId = token.familyId as string;
      }
      return session;
    },
  },
  providers: [], // Configure providers in auth.ts
} satisfies NextAuthConfig;
