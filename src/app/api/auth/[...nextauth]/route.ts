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
}

interface UserWithPassword {
  _id: unknown;
  email: string;
  passwordHash: string;
  role: 'user' | 'admin' | 'wellwisher';
  userType: 'individual' | 'company';
  name?: string;
  companyName?: string;
}

export const authOptions = {
  basePath: '/api/auth',
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  secret: env.NEXTAUTH_SECRET,
  trustHost: true,
  debug: false, // Disable debug mode to avoid _log endpoint errors
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
          } as ExtendedUser;
        } catch (error) {
          console.error('Auth error:', error);
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        const extendedUser = user as ExtendedUser;
        token.role = extendedUser.role;
        token.userType = extendedUser.userType;
        token.id = extendedUser.id;
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


