"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function ConfirmInvitePage() {
  const router = useRouter();
  const [message, setMessage] = useState("Verifying your invitation...");

  useEffect(() => {
    let active = true;

    async function verifyInvitation() {
      const supabase = createClient();
      const searchParams = new URLSearchParams(window.location.search);
      const tokenHash = searchParams.get("token_hash");
      const type = searchParams.get("type");

      if (tokenHash) {
        if (type !== "invite" && type !== "recovery") {
          setMessage("This account link is invalid.");
          return;
        }

        const { error } =
          type === "invite"
            ? await supabase.auth.verifyOtp({
                token_hash: tokenHash,
                type: "invite",
              })
            : await supabase.auth.verifyOtp({
                token_hash: tokenHash,
                type: "recovery",
              });
        if (error) {
          setMessage(`Account link verification failed: ${error.message}`);
          return;
        }
      }

      const { data, error } = await supabase.auth.getSession();
      if (!active) {
        return;
      }
      if (error || !data.session) {
        setMessage(
          error
            ? `Unable to complete invitation verification: ${error.message}`
            : "No signed-in session was created. Reopen the invitation link from this computer.",
        );
        return;
      }

      router.replace("/set-password");
      router.refresh();
    }

    void verifyInvitation();
    return () => {
      active = false;
    };
  }, [router]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-50 px-6">
      <p className="text-zinc-600" role="status">
        {message}
      </p>
    </main>
  );
}
