import { Suspense } from "react";
import LoginForm from "@/components/Auth/LoginForm";
import AuthRedirect from "@/components/Auth/AuthRedirect";

export default function LoginPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <AuthRedirect>
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-white to-green-50 px-4 sm:px-6 lg:px-8 pt-20 sm:pt-24 md:pt-28 lg:pt-32 pb-8">
          <LoginForm />
        </div>
      </AuthRedirect>
    </Suspense>
  );
}


