import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import SignOutButton from "./sign-out-button";
import { createClient } from "@/lib/supabase/server";

export default function DeveloperPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-zinc-50 px-6">
          <p className="text-zinc-600">Checking developer access...</p>
        </main>
      }
    >
      <DeveloperContent />
    </Suspense>
  );
}

async function DeveloperContent() {
  const supabase = await createClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError || !userData.user) {
    redirect("/login");
  }

  if (userData.user.app_metadata.catalog_role !== "developer") {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-6 px-6 py-12">
        <h1 className="text-3xl font-semibold text-zinc-950">No developer access</h1>
        <p className="text-zinc-600">
          This account is signed in, but an administrator has not granted
          Catalog developer access.
        </p>
        <SignOutButton />
      </main>
    );
  }

  const { data: entries, error: entriesError } = await supabase
    .from("entries")
    .select("id, name, entry_type_id, status")
    .order("name");

  if (entriesError) {
    throw new Error(`Unable to load catalog entries: ${entriesError.message}`);
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-8 px-6 py-12">
      <header className="flex items-start justify-between gap-4">
        <div>
          <Link className="text-sm text-zinc-500 hover:text-zinc-900" href="/">
            &larr; Catalog
          </Link>
          <h1 className="mt-4 text-3xl font-semibold text-zinc-950">
            Developer access
          </h1>
          <p className="mt-2 text-zinc-600">
            Signed in as {userData.user.email}
          </p>
        </div>
        <SignOutButton />
      </header>
      <section>
        <h2 className="text-xl font-medium text-zinc-900">
          Entries visible to developers
        </h2>
        {entries.length === 0 ? (
          <p className="mt-3 text-zinc-600">
            No entries yet. The editor will be added in Phase 3.
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-zinc-200 rounded-lg border border-zinc-200 bg-white">
            {entries.map((entry) => (
              <li
                className="flex items-center justify-between gap-4 px-4 py-3"
                key={entry.id}
              >
                <span className="font-medium text-zinc-900">{entry.name}</span>
                <span className="text-sm text-zinc-600">
                  {entry.entry_type_id} · {entry.status}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
