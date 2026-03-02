import NextAuth from 'next-auth';
import type { NextAuthConfig } from 'next-auth';
import { env } from './env';

// Edge Runtime compatible auth config (no mongoose imports)
// This is used by middleware which runs in Edge Runtime
export const authConfigEdge: NextAuthConfig = {
  basePath: '/api/auth',
  session: {
    strategy: 'jwt',
    maxAge: 24 * 60 * 60,
    updateAge: 60 * 60,
  },
  secret: env.NEXTAUTH_SECRET,
  trustHost: true,
  debug: false,
  cookies: {
    sessionToken: {
      name: `next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
        maxAge: 24 * 60 * 60,
      },
    },
  },
  providers: [], // Providers are handled in the Node.js route handler
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as { role?: string }).role;
        token.userType = (user as { userType?: string }).userType;
        token.id = user.id;
        token.name = user.name;
        token.email = user.email;
        token.image = (user as { image?: string }).image;
      }
      return token;
    },
    async session({ session, token }) {
      if (!session) return session;
      return {
        ...session,
        user: {
          ...session.user,
          id: token.id as string,
          name: (token.name as string | undefined) || session.user.name,
          email: (token.email as string | undefined) || session.user.email,
          role: token.role as 'admin' | 'user' | 'wellwisher',
          userType: token.userType as 'individual' | 'company' | 'dealer',
          image: token.image as string | undefined,
        },
      };
    },
  },
  pages: {
    signIn: '/login',
  },
};

// Create auth instance for middleware (Edge Runtime compatible)
export const { auth } = NextAuth(authConfigEdge);
