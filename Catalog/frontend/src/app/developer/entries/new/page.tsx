import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import EntryForm from "../entry-form";
import { createClient } from "@/lib/supabase/server";

export default function NewEntryPage() {
  return (
    <Suspense fallback={<main className="p-8 text-zinc-600">Loading editor...</main>}>
      <NewEntryContent />
    </Suspense>
  );
}

async function NewEntryContent() {
  const supabase = await createClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (!userData.user) {
    redirect("/login");
  }
  if (userError) {
    throw new Error(`Unable to verify developer access: ${userError.message}`);
  }
  if (userData.user.app_metadata.catalog_role !== "developer") {
    redirect("/developer");
  }

  const targetsResult = await supabase
    .from("entries")
    .select("id, name, entry_type_id, status")
    .in("entry_type_id", ["realm", "species", "group"])
    .order("name");

  if (targetsResult.error) {
    throw new Error(
      `Unable to load related entries: ${targetsResult.error.message}`,
    );
  }
  return (
    <main className="mx-auto min-h-screen w-full max-w-3xl px-6 py-10">
      <Link className="text-sm text-zinc-600 hover:text-zinc-950" href="/developer">
        &larr; Developer entries
      </Link>
      <h1 className="mt-4 text-3xl font-semibold text-zinc-950">Create entry</h1>
      <p className="mt-2 text-zinc-600">
        Save a draft to keep it private, or publish it for visitors.
      </p>
      <EntryForm targets={targetsResult.data ?? []} />
    </main>
  );
}
