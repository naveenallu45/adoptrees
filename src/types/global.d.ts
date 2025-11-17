// Augment next-auth session types
import 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      role: 'user' | 'admin' | 'wellwisher';
      userType: 'individual' | 'company';
    };
  }
  
  interface User {
    id: string;
    email: string;
    name?: string;
    role: 'user' | 'admin' | 'wellwisher';
    userType: 'individual' | 'company';
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    name?: string;
    email?: string;
    role: 'user' | 'admin' | 'wellwisher';
    userType: 'individual' | 'company';
    image?: string;
  }
}
