"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function SignOutButton() {
  const router = useRouter();
  const [errorMessage, setErrorMessage] = useState("");

  async function signOut() {
    setErrorMessage("");
    const { error } = await createClient().auth.signOut();
    if (error) {
      setErrorMessage(error.message);
      return;
    }
    router.replace("/login");
    router.refresh();
  }

  return (
    <div>
      <button
        className="rounded-md border border-zinc-300 px-3 py-2 text-sm font-medium hover:bg-zinc-100"
        onClick={signOut}
        type="button"
      >
        Sign out
      </button>
      {errorMessage && (
        <p className="mt-2 text-sm text-red-700" role="alert">
          {errorMessage}
        </p>
      )}
    </div>
  );
}
