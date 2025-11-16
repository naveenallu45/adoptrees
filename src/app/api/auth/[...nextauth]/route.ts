import NextAuth from 'next-auth';
import type { NextAuthConfig, User as NextAuthUser } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import { env } from '@/lib/env';
import { loginSchema } from '@/lib/validations/auth';

interface ExtendedUser extends NextAuthUser {
  role: 'user' | 'admin' | 'wellwisher';
  userType: 'individual' | 'company';
  image?: string;
}

interface UserWithPassword {
  _id: unknown;
  email: string;
  passwordHash: string;
  role: 'user' | 'admin' | 'wellwisher';
  userType: 'individual' | 'company';
  name?: string;
  companyName?: string;
  image?: string;
}

export const authOptions = {
  basePath: '/api/auth',
  session: {
    strategy: 'jwt',
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
        sameSite: 'lax',
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

          await connectDB();
          
          // Find user (case-insensitive email) - explicitly select passwordHash
          const user = await User.findOne({ email: email.toLowerCase() })
            .select('+passwordHash')
            .lean() as UserWithPassword | null;
          
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
          } as ExtendedUser;
        } catch (_error) {
          if (process.env.NODE_ENV === 'development') {
          }
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session: sessionData }) {
      if (user) {
        const extendedUser = user as ExtendedUser;
        token.role = extendedUser.role;
        token.userType = extendedUser.userType;
        token.id = extendedUser.id;
        token.image = extendedUser.image;
      }
      
      // Update token when session is updated (e.g., after profile picture upload)
      if (trigger === 'update' && sessionData?.user) {
        // Update image if provided (can be string or null to clear)
        if ('image' in sessionData.user) {
          token.image = sessionData.user.image || undefined;
        }
        // Also update name and email if provided
        if (sessionData.user.name) {
          token.name = sessionData.user.name;
        }
        if (sessionData.user.email) {
          token.email = sessionData.user.email;
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
      return {
        ...session,
        user: {
          ...session.user,
          id: token.id as string,
          role: token.role as 'admin' | 'user' | 'wellwisher',
          userType: token.userType as 'individual' | 'company',
          image: token.image as string | undefined,
        },
      };
    },
  },
  pages: {
    signIn: '/login',
  },
} satisfies NextAuthConfig;

export const { handlers, auth, signIn, signOut } = NextAuth(authOptions);

export const { GET, POST } = handlers;


