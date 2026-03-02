import type { NextAuthConfig } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { env } from './env';
import { loginSchema } from './validations/auth';

// This file contains the auth configuration without mongoose imports
// Mongoose will be imported dynamically in the authorize callback

export const authConfig = {
  basePath: '/api/auth',
  session: {
    strategy: 'jwt' as const,
    maxAge: 24 * 60 * 60, // 1 day instead of 30 days
    updateAge: 60 * 60, // Update session every hour
  },
  secret: env.NEXTAUTH_SECRET,
  trustHost: true,
  debug: false,
  cookies: {
    sessionToken: {
      name: `next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax' as const,
        path: '/',
        secure: process.env.NODE_ENV === 'production',
        maxAge: 24 * 60 * 60, // 1 day
      },
    },
  },
  providers: [
    Credentials({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        try {
          // Validate credentials format
          const validationResult = loginSchema.safeParse(credentials);
          
          if (!validationResult.success) {
            return null;
          }

          const { email, password } = validationResult.data;

          // Dynamically import mongoose only when needed (not during build/Edge Runtime)
          const { default: connectDB } = await import('./mongodb');
          const User = (await import('@/models/User')).default;
          const bcrypt = await import('bcryptjs');
          
          await connectDB();
          
          // Find user (case-insensitive email) - explicitly select passwordHash
          const user = await User.findOne({ email: email.toLowerCase() })
            .select('+passwordHash')
            .lean();
          
          if (!user) {
            // Use same timing for invalid user to prevent email enumeration
            await bcrypt.hash(password, 12);
            return null;
          }
          
          const isValid = await bcrypt.compare(password, user.passwordHash);
          
          if (!isValid) {
            return null;
          }
          
          return {
            id: String(user._id),
            email: user.email,
            name: user.name || user.companyName || undefined,
            role: user.role,
            userType: user.userType,
            image: user.image || undefined,
          };
        } catch (_error) {
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session: sessionData }) {
      if (user) {
        token.role = user.role;
        token.userType = user.userType;
        token.id = user.id;
        token.name = user.name;
        token.email = user.email;
        token.image = user.image;
      }
      
      // Update token when session is updated (e.g., after profile picture upload)
      if (trigger === 'update' && sessionData?.user) {
        // Update image if provided (can be string or null to clear)
        if ('image' in sessionData.user) {
          token.image = sessionData.user.image || undefined;
        }
        // Also update name and email if provided
        if ('name' in sessionData.user && sessionData.user.name !== undefined) {
          token.name = sessionData.user.name || undefined;
        }
        if ('email' in sessionData.user && sessionData.user.email !== undefined) {
          token.email = sessionData.user.email || undefined;
        }
      }
      
      return token;
    },
    async session({ session, token }) {
      // Ensure session and user objects exist
      if (!session) {
        return session;
      }
      
      // In NextAuth v5, we need to explicitly set user properties
      // Include name and email from token to ensure they're up-to-date
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
} satisfies NextAuthConfig;
