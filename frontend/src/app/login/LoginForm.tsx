"use client";

import { use, useActionState } from "react";
import { login } from "@/lib/actions";

export function LoginForm({ next }: { next: Promise<string> }) {
  const nextPath = use(next);
  const [state, action, pending] = useActionState(login, undefined);
  return (
    <form action={action} className="mt-6 space-y-4">
      <input type="hidden" name="next" value={nextPath} />
      <label className="block text-sm">
        <span className="mb-1 block font-medium">Email</span>
        <input name="email" type="email" autoComplete="username" required className="w-full rounded-xl border border-input bg-card/90 px-3 py-2" />
      </label>
      <label className="block text-sm">
        <span className="mb-1 block font-medium">Password</span>
        <input name="password" type="password" autoComplete="current-password" required className="w-full rounded-xl border border-input bg-card/90 px-3 py-2" />
      </label>
      {state?.error && (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      )}
      <button type="submit" disabled={pending} className="w-full rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity disabled:opacity-60">
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
