import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginForm } from "./LoginForm";
import { panel } from "@/components/ledger";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage({ searchParams }: PageProps<"/login">) {
  return (
    <main className="grid min-h-screen place-items-center px-4 py-10">
      <section className={`${panel} w-full max-w-sm p-6 sm:p-8`} aria-labelledby="login-h">
        <p className="text-sm font-semibold text-primary">Procura</p>
        <h1 id="login-h" className="mt-1 text-2xl font-semibold tracking-tight">Sign in</h1>
        <p className="mt-1 text-sm text-muted-foreground">Use your work email.</p>
        <Suspense>
          <LoginForm next={searchParams.then((p) => (typeof p.next === "string" ? p.next : ""))} />
        </Suspense>
      </section>
    </main>
  );
}
