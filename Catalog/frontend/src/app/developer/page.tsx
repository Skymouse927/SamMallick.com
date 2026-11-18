import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import SignOutButton from "./sign-out-button";
import { createClient } from "@/lib/supabase/server";

export default function DeveloperPage({
  searchParams,
}: PageProps<"/developer">) {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-zinc-50 px-6">
          <p className="text-zinc-600">Checking developer access...</p>
        </main>
      }
    >
      <DeveloperContent searchParams={searchParams} />
    </Suspense>
  );
}

async function DeveloperContent({
  searchParams,
}: {
  searchParams: Promise<{ deleted?: string }>;
}) {
  const { deleted } = await searchParams;
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
    <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col gap-8 px-6 py-12">
      <header className="flex items-start justify-between gap-4">
        <div>
          <Link className="text-sm text-zinc-500 hover:text-zinc-900" href="/">
            &larr; Catalog
          </Link>
          <h1 className="mt-4 text-3xl font-semibold text-zinc-950">
            Catalog entries
          </h1>
          <p className="mt-2 text-zinc-600">
            Signed in as {userData.user.email}
          </p>
        </div>
        <SignOutButton />
      </header>
      <section>
        {deleted === "success" && (
          <p
            className="mb-4 rounded-md bg-emerald-50 p-3 text-sm text-emerald-800"
            role="status"
          >
            Entry deleted.
          </p>
        )}
        {deleted === "image-cleanup-failed" && (
          <p
            className="mb-4 rounded-md bg-amber-50 p-3 text-sm text-amber-900"
            role="alert"
          >
            Entry deleted, but its image could not be removed from storage.
          </p>
        )}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h2 className="text-xl font-medium text-zinc-900">Manage entries</h2>
          <Link
            className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700"
            href="/developer/entries/new"
          >
            Create entry
          </Link>
        </div>
        {entries.length === 0 ? (
          <p className="mt-3 text-zinc-600">No catalog entries yet.</p>
        ) : (
          <ul className="mt-4 divide-y divide-zinc-200 rounded-lg border border-zinc-200 bg-white">
            {entries.map((entry) => (
              <li
                className="flex items-center justify-between gap-4 px-4 py-3"
                key={entry.id}
              >
                <div>
                  <p className="font-medium text-zinc-900">{entry.name}</p>
                  <p className="mt-1 text-sm text-zinc-600">
                    {entry.entry_type_id} · {entry.status}
                  </p>
                </div>
                <Link
                  className="text-sm font-medium text-zinc-700 hover:text-zinc-950"
                  href={`/developer/entries/${entry.id}/edit`}
                >
                  Edit
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
