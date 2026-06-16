import { Card } from "@/components/ui/card";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex items-center gap-2.5">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary/15 text-lg font-bold text-primary">
            L
          </span>
          <div>
            <h1 className="text-lg font-semibold tracking-tight">Lyrio Analytics</h1>
            <p className="text-xs text-muted">PostHog × RevenueCat</p>
          </div>
        </div>
        <Card>
          <h2 className="text-base font-semibold">Sign in</h2>
          <p className="mt-1 text-sm text-muted">Use your email and password.</p>
          <LoginForm />
        </Card>
      </div>
    </main>
  );
}
