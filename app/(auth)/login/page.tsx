import { Card } from "@/components/ui/card";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <Card className="w-full max-w-sm">
        <h1 className="text-xl font-semibold">Lyrio Analytics</h1>
        <p className="mt-1 text-sm text-muted">
          Sign in with your email and password.
        </p>
        <LoginForm />
      </Card>
    </main>
  );
}
