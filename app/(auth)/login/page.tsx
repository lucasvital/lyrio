import { signIn } from "@/lib/auth";
import { Card } from "@/components/ui/card";

export default function LoginPage() {
  const googleConfigured =
    !!process.env.AUTH_GOOGLE_ID && !!process.env.AUTH_GOOGLE_SECRET;

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <Card className="w-full max-w-sm">
        <h1 className="text-xl font-semibold">Lyrio Analytics</h1>
        <p className="mt-1 text-sm text-muted">
          Sign in to access the unified dashboard.
        </p>

        {googleConfigured ? (
          <form
            action={async () => {
              "use server";
              await signIn("google", { redirectTo: "/overview" });
            }}
            className="mt-6"
          >
            <button
              type="submit"
              className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
            >
              Continue with Google
            </button>
          </form>
        ) : (
          <div className="mt-6 rounded-lg border border-border bg-background/50 p-3 text-xs text-muted">
            Google sign-in is not configured. Set <code>AUTH_GOOGLE_ID</code> and{" "}
            <code>AUTH_GOOGLE_SECRET</code> in your environment.
          </div>
        )}
      </Card>
    </main>
  );
}
