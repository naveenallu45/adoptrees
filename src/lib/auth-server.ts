import NextAuth from 'next-auth';
import { authConfig } from './auth';

// Server-side auth instance (Node.js runtime, supports mongoose)
// This can be used in API routes that run in Node.js runtime
export const { auth, signIn, signOut } = NextAuth(authConfig);
