import { Suspense } from "react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import EntryForm from "../../entry-form";
import { createClient } from "@/lib/supabase/server";

const uuidPattern =
  /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;
const entryTypes = ["being", "realm", "species", "group"] as const;
type EntryType = (typeof entryTypes)[number];

function isEntryType(value: string): value is EntryType {
  return entryTypes.some((entryType) => entryType === value);
}

export default function EditEntryPage({
  params,
}: PageProps<"/developer/entries/[id]/edit">) {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-[#24232b] px-6 text-[#b8a4d8]">
          Loading editor...
        </main>
      }
    >
      <EditEntryContent params={params} />
    </Suspense>
  );
}

async function EditEntryContent({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!uuidPattern.test(id)) {
    notFound();
  }

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

  const [entryResult, targetsResult] = await Promise.all([
    supabase
      .from("entries")
      .select("id, name, description, entry_type_id, image_path, image_alt")
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("entries")
      .select("id, name, entry_type_id, status")
      .in("entry_type_id", ["realm", "species", "group"])
      .order("name"),
  ]);

  if (entryResult.error) {
    throw new Error(`Unable to load the entry: ${entryResult.error.message}`);
  }
  if (targetsResult.error) {
    throw new Error(
      `Unable to load related entries: ${targetsResult.error.message}`,
    );
  }
  if (!entryResult.data) {
    notFound();
  }
  if (!isEntryType(entryResult.data.entry_type_id)) {
    throw new Error("The entry has an unsupported type.");
  }

  const relationshipsResult = await supabase
    .from("entry_relationships")
    .select("relationship_type, target_entry_id")
    .eq("source_entry_id", id);

  if (relationshipsResult.error) {
    throw new Error(
      `Unable to load entry relationships: ${relationshipsResult.error.message}`,
    );
  }
  let imageUrl: string | null = null;
  if (entryResult.data.image_path) {
    const { data: signedImage, error: imageError } = await supabase.storage
      .from("catalog-images")
      .createSignedUrl(entryResult.data.image_path, 3600);
    if (imageError) {
      throw new Error(`Unable to load entry image: ${imageError.message}`);
    }
    imageUrl = signedImage.signedUrl;
  }

  const entry = entryResult.data;
  const relationships = relationshipsResult.data;

  return (
    <main className="mx-auto min-h-screen w-full max-w-3xl px-6 py-10">
      <Link
        className="text-sm text-[#b8a4d8] hover:text-[#d2c1ff]"
        href="/developer"
      >
        &larr; Developer entries
      </Link>
      <h1 className="mt-4 text-3xl font-semibold text-[#d2c1ff]">
        Edit entry
      </h1>
      <p className="mt-2 text-[#b8a4d8]">
        Update its details, relationships, image, or publishing status.
      </p>
      <EntryForm
        entry={{
          id: entry.id,
          name: entry.name,
          description: entry.description,
          entry_type_id: entry.entry_type_id,
          image_alt: entry.image_alt,
          imageUrl,
          realmIds: relationships
            .filter((link) => link.relationship_type === "realm")
            .map((link) => link.target_entry_id),
          speciesId:
            relationships.find((link) => link.relationship_type === "species")
              ?.target_entry_id ?? null,
          groupIds: relationships
            .filter((link) => link.relationship_type === "group")
            .map((link) => link.target_entry_id),
        }}
        targets={targetsResult.data ?? []}
      />
    </main>
  );
}
