"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function ForgotPasswordPage() {
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setErrorMessage("");
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "").trim();
    const { error } = await createClient().auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin,
    });

    setIsSubmitting(false);
    if (error) {
      setErrorMessage(`Unable to send a password setup link: ${error.message}`);
      return;
    }

    setMessage(
      "If an account exists for that email, a password setup link was sent. Check the local Mailpit inbox.",
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-50 px-6">
      <section className="w-full max-w-sm rounded-xl border border-zinc-200 bg-white p-8 shadow-sm">
        <Link className="text-sm text-zinc-500 hover:text-zinc-900" href="/login">
          &larr; Developer sign in
        </Link>
        <h1 className="mt-6 text-2xl font-semibold text-zinc-950">
          Set or reset password
        </h1>
        <p className="mt-2 text-sm text-zinc-600">
          Enter your invited developer email. The local link will appear in
          Mailpit.
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
          {errorMessage && (
            <p className="text-sm text-red-700" role="alert">
              {errorMessage}
            </p>
          )}
          {message && (
            <p className="text-sm text-emerald-800" role="status">
              {message}
            </p>
          )}
          <button
            className="w-full rounded-md bg-zinc-900 px-4 py-2 font-medium text-white hover:bg-zinc-700 disabled:opacity-60"
            disabled={isSubmitting}
            type="submit"
          >
            {isSubmitting ? "Sending..." : "Send password setup link"}
          </button>
        </form>
      </section>
    </main>
  );
}
