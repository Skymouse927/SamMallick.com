import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ENTRY_TYPE_LABELS,
  getPublicImageUrl,
  getRelationshipsByEntry,
  loadPublishedCatalog,
  RELATIONSHIP_LABELS,
  type CatalogEntry,
  type RelationshipType,
} from "../catalog-data";

type CatalogEntryPageProps = {
  params: Promise<{ id: string }>;
};

function RelatedEntryLinks({
  entries,
  heading,
}: {
  entries: CatalogEntry[];
  heading: string;
}) {
  if (entries.length === 0) {
    return null;
  }

  return (
    <section className="mt-8">
      <h2 className="text-lg font-semibold text-zinc-950">{heading}</h2>
      <ul className="mt-3 flex flex-wrap gap-2">
        {entries.map((entry) => (
          <li key={entry.id}>
            <Link
              className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-indigo-800 hover:border-indigo-300 hover:bg-indigo-50"
              href={`/catalog/${entry.id}`}
            >
              {entry.name}
              <span aria-hidden="true">&rarr;</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default function CatalogEntryPage({ params }: CatalogEntryPageProps) {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-zinc-50 px-6 py-16 text-center text-zinc-600">
          Loading catalog entry...
        </main>
      }
    >
      <CatalogEntryContent params={params} />
    </Suspense>
  );
}

async function CatalogEntryContent({ params }: CatalogEntryPageProps) {
  const { id } = await params;
  const { supabase, entries, relationships } = await loadPublishedCatalog();
  const entry = entries.find((item) => item.id === id);
  if (!entry) {
    notFound();
  }

  const relationshipsByEntry = getRelationshipsByEntry(relationships);
  const entryById = new Map(entries.map((item) => [item.id, item]));
  const outgoingRelationships = relationshipsByEntry.get(entry.id) ?? [];
  const incomingRelationships = relationships.filter(
    (relationship) => relationship.target_entry_id === entry.id,
  );
  const imageUrl = await getPublicImageUrl(supabase, entry.image_path);

  const relatedByType = (type: RelationshipType) =>
    outgoingRelationships
      .filter((relationship) => relationship.relationship_type === type)
      .map((relationship) => entryById.get(relationship.target_entry_id))
      .filter((related): related is CatalogEntry => related !== undefined);
  const relatedBeings = incomingRelationships
    .map((relationship) => entryById.get(relationship.source_entry_id))
    .filter((related): related is CatalogEntry => related !== undefined);
  return (
    <main className="min-h-screen bg-zinc-50">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <Link className="text-lg font-bold tracking-tight text-zinc-950" href="/">
            Sam Mallick
          </Link>
          <Link
            className="text-sm font-medium text-indigo-700 hover:text-indigo-950"
            href="/catalog"
          >
            Browse catalog
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-6 py-8 sm:py-12">
        <Link
          className="text-sm font-medium text-zinc-600 hover:text-zinc-950"
          href="/catalog"
        >
          &larr; Back to catalog
        </Link>
        <article className="mt-6 overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
          {imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              alt={entry.image_alt ?? ""}
              className="max-h-[34rem] w-full bg-zinc-100 object-contain"
              src={imageUrl}
            />
          ) : (
            <div
              aria-hidden="true"
              className="flex h-48 items-center justify-center bg-gradient-to-br from-amber-50 via-rose-50 to-indigo-100"
            >
              <span className="text-6xl font-semibold text-zinc-400">
                {entry.name.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
          <div className="p-6 sm:p-10">
            <p className="text-sm font-semibold uppercase tracking-wide text-indigo-700">
              {ENTRY_TYPE_LABELS[entry.entry_type_id]}
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-zinc-950 sm:text-4xl">
              {entry.name}
            </h1>
            {entry.description && (
              <p className="mt-5 max-w-3xl whitespace-pre-line text-base leading-7 text-zinc-700">
                {entry.description}
              </p>
            )}

            {entry.entry_type_id === "being" ? (
              <div>
                {(["realm", "species", "group"] as const).map((type) => (
                  <RelatedEntryLinks
                    entries={relatedByType(type)}
                    heading={RELATIONSHIP_LABELS[type]}
                    key={type}
                  />
                ))}
              </div>
            ) : (
              <div>
                <RelatedEntryLinks
                  entries={relatedBeings}
                  heading={`Beings linked to ${entry.name}`}
                />
                {relatedBeings.length === 0 && (
                  <p className="mt-8 text-sm text-zinc-500">
                    No published Beings are linked to this entry yet.
                  </p>
                )}
              </div>
            )}
          </div>
        </article>
      </div>
    </main>
  );
}
