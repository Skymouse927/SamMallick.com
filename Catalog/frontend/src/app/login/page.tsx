"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "");
    const password = String(formData.get("password") ?? "");
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    setIsSubmitting(false);
    if (error) {
      setErrorMessage(error.message);
      return;
    }

    router.replace("/developer");
    router.refresh();
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-50 px-6">
      <section className="w-full max-w-sm rounded-xl border border-zinc-200 bg-white p-8 shadow-sm">
        <Link className="text-sm text-zinc-500 hover:text-zinc-900" href="/">
          &larr; Catalog
        </Link>
        <h1 className="mt-6 text-2xl font-semibold text-zinc-950">
          Developer sign in
        </h1>
        <p className="mt-2 text-sm text-zinc-600">
          Access is available by invitation only.
        </p>
        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <label className="block text-sm font-medium text-zinc-700">
            Email
            <input
              autoComplete="email"
              className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2"
              name="email"
              required
              type="email"
            />
          </label>
          <label className="block text-sm font-medium text-zinc-700">
            Password
            <input
              autoComplete="current-password"
              className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2"
              name="password"
              required
              type="password"
            />
          </label>
          {errorMessage && (
            <p className="text-sm text-red-700" role="alert">
              {errorMessage}
            </p>
          )}
          <button
            className="w-full rounded-md bg-zinc-900 px-4 py-2 font-medium text-white hover:bg-zinc-700 disabled:opacity-60"
            disabled={isSubmitting}
            type="submit"
          >
            {isSubmitting ? "Signing in..." : "Sign in"}
          </button>
        </form>
      </section>
    </main>
  );
}
