"use client";

import { use, useActionState, useState } from "react";
import { login } from "@/lib/actions";

const DEMO_PERSONAS = [
  { role: "Requester", email: "requester@example.com" },
  { role: "Dept Head", email: "depthead@example.com" },
  { role: "Finance", email: "finance@example.com" },
  { role: "Admin", email: "admin@example.com" },
];

export function LoginForm({ next }: { next: Promise<string> }) {
  const nextPath = use(next);
  const [state, action, pending] = useActionState(login, undefined);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const fillPersona = (pEmail: string) => {
    setEmail(pEmail);
    setPassword("password123");
  };

  return (
    <div className="mt-6 space-y-5">
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Quick demo personas</p>
        <div className="flex flex-wrap gap-1.5">
          {DEMO_PERSONAS.map((p) => (
            <button
              key={p.role}
              type="button"
              onClick={() => fillPersona(p.email)}
              className="rounded-full border border-border bg-card/80 px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/50 hover:bg-card hover:text-foreground active:scale-95"
            >
              {p.role}
            </button>
          ))}
        </div>
      </div>

      <form action={action} className="space-y-4">
        <input type="hidden" name="next" value={nextPath} />
        <label className="block text-sm">
          <span className="mb-1 block font-medium">Email</span>
          <input
            name="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="username"
            required
            placeholder="name@example.com"
            className="w-full rounded-xl border border-input bg-card/90 px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium">Password</span>
          <input
            name="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
            className="w-full rounded-xl border border-input bg-card/90 px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </label>
        {state?.error && (
          <p role="alert" className="text-sm font-medium text-destructive">
            {state.error}
          </p>
        )}
        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-95 disabled:opacity-60"
        >
          {pending ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </div>
  );
}
