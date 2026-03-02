import NextAuth from 'next-auth';
import { authConfig } from '@/lib/auth';

const authInstance = NextAuth(authConfig);
export const { auth, signIn, signOut } = authInstance;
export const { GET, POST } = authInstance.handlers;
