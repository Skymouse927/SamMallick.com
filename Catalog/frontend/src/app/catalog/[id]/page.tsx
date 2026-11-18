import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import SiteHeader from "../site-header";
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
    <section className="mt-8 border-t border-[#474350] pt-5">
      <h2 className="text-xl font-semibold text-[#f2eff6]">{heading}</h2>
      <ul className="mt-3 flex flex-wrap gap-2">
        {entries.map((entry) => (
          <li key={entry.id}>
            <Link
              className="inline-flex items-center gap-2 rounded-full border border-[#625c6c] bg-[#27252e] px-4 py-2 text-sm font-medium text-[#e2d9f1] transition hover:border-[#b59bea] hover:bg-[#393642]"
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
      <main className="min-h-screen bg-[#24232b] px-6 py-16 text-center text-[#c1bbc9]">
          Loading catalog entry...
        </main>
      }
    >
      <CatalogEntryContent params={params} />
    </Suspense>
  );
}

async function CatalogEntryContent({ params }: CatalogEntryPageProps) {
  await connection();
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
    <main className="dark-theme min-h-screen bg-[#24232b] text-[#f2eff6]">
      <SiteHeader />
      <div className="mx-auto max-w-5xl px-5 py-8 sm:px-8 sm:py-12">
        <Link
          className="text-sm font-semibold text-[#d0cbd5] hover:text-[#f2eff6]"
          href="/catalog"
        >
          &larr; Back to catalog
        </Link>
        <article className="mt-6 overflow-hidden rounded-2xl border border-[#4b4654] bg-[#302e38] shadow-[0_8px_24px_rgba(0,0,0,0.2)]">
          {imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              alt={entry.image_alt ?? ""}
              className="max-h-[34rem] w-full bg-[#292831] object-contain"
              src={imageUrl}
            />
          ) : (
            <div
              aria-hidden="true"
              className="flex h-48 items-center justify-center bg-gradient-to-br from-[#393245] via-[#35323f] to-[#343741]"
            >
              <span className="text-6xl font-semibold text-[#b49ae8]">
                {entry.name.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
          <div className="p-6 sm:p-10">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#b59bea]">
              {ENTRY_TYPE_LABELS[entry.entry_type_id]}
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[#f2eff6] sm:text-4xl">
              {entry.name}
            </h1>
            {entry.description && (
              <p className="mt-5 max-w-3xl whitespace-pre-line text-base leading-7 text-[#d2cddd]">
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
                  <p className="mt-8 text-sm text-[#aaa4b2]">
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
