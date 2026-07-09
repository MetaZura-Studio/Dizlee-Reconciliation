import { Suspense } from "react";

import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-4">
      <div className="w-full max-w-md space-y-6 rounded-lg border border-border bg-surface p-8 shadow-sm">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold">Sign in</h1>
          <p className="text-sm text-foreground-muted">
            OpCo, Dizlee, and Partner sign-in. You will be redirected to your
            portal after login.
          </p>
        </div>

        <Suspense fallback={<p className="text-sm text-foreground-subtle">Loading...</p>}>
          <LoginForm />
        </Suspense>

        <p className="text-xs text-foreground-subtle">
          Local dev seed users are documented in{" "}
          <code className="rounded bg-surface-muted px-1">docs/AUTH_SESSION.md</code>.
        </p>
      </div>
    </div>
  );
}
