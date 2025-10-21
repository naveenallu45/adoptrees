// Augment next-auth session types
import 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      role: 'user' | 'admin';
      userType: 'individual' | 'company';
    };
  }
  
  interface User {
    id: string;
    email: string;
    name?: string;
    role: 'user' | 'admin';
    userType: 'individual' | 'company';
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    role: 'user' | 'admin';
    userType: 'individual' | 'company';
  }
}
