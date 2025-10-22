import LoginForm from "@/components/Auth/LoginForm";
import AuthRedirect from "@/components/Auth/AuthRedirect";

export default function LoginPage() {
  return (
    <AuthRedirect>
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-white to-green-50 px-4 pt-32">
        <LoginForm />
      </div>
    </AuthRedirect>
  );
}


