import { Suspense } from "react";
import RegisterForm from "@/components/Auth/RegisterForm";
import AuthRedirect from "@/components/Auth/AuthRedirect";

export default function RegisterPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <AuthRedirect>
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-white to-green-50 px-4 pt-32 pb-8">
          <RegisterForm />
        </div>
      </AuthRedirect>
    </Suspense>
  );
}


