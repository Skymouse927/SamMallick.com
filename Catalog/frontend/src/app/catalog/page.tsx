import { Suspense } from "react";
import { connection } from "next/server";
import CatalogBrowser from "./catalog-browser";
import SiteHeader from "./site-header";
import {
  ENTRY_TYPES,
  getPublicImageUrl,
  loadPublishedCatalog,
  type EntryType,
} from "./catalog-data";

type CatalogSearchParams = {
  q?: string | string[];
  type?: string | string[];
  realm?: string | string[];
  species?: string | string[];
  group?: string | string[];
  entry?: string | string[];
};

type CatalogPageProps = {
  searchParams: Promise<CatalogSearchParams>;
};

function firstValue(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

function isEntryType(value: string): value is EntryType {
  return (ENTRY_TYPES as readonly string[]).includes(value);
}

export default function CatalogPage({ searchParams }: CatalogPageProps) {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-[#24232b] px-6 text-[#c1bbc9]">
          Loading catalog...
        </main>
      }
    >
      <CatalogContent searchParams={searchParams} />
    </Suspense>
  );
}

async function CatalogContent({ searchParams }: CatalogPageProps) {
  await connection();
  const params = await searchParams;
  const initialQuery = firstValue(params.q).trim().slice(0, 100);
  const requestedType = firstValue(params.type);
  const requestedRealm = firstValue(params.realm);
  const requestedSpecies = firstValue(params.species);
  const requestedGroup = firstValue(params.group);
  const requestedEntry = firstValue(params.entry);
  const { supabase, entries, relationships } = await loadPublishedCatalog();
  const validIdsByType = {
    realm: new Set(
      entries
        .filter((entry) => entry.entry_type_id === "realm")
        .map((entry) => entry.id),
    ),
    species: new Set(
      entries
        .filter((entry) => entry.entry_type_id === "species")
        .map((entry) => entry.id),
    ),
    group: new Set(
      entries
        .filter((entry) => entry.entry_type_id === "group")
        .map((entry) => entry.id),
    ),
  };
  const publishedIds = new Set(entries.map((entry) => entry.id));
  const publishedRelationships = relationships.filter(
    (relationship) =>
    publishedIds.has(relationship.source_entry_id) &&
    publishedIds.has(relationship.target_entry_id),
  );
  const entriesWithImages = await Promise.all(
    entries.map(async (entry) => ({
      ...entry,
      imageUrl: await getPublicImageUrl(supabase, entry.image_path),
    })),
  );

  return (
    <>
      <SiteHeader />
      <CatalogBrowser
        entries={entriesWithImages}
        initialEntryId={
          entries.some((entry) => entry.id === requestedEntry)
            ? requestedEntry
            : ""
        }
        initialFilters={{
          realm: validIdsByType.realm.has(requestedRealm) ? requestedRealm : "",
          species: validIdsByType.species.has(requestedSpecies)
            ? requestedSpecies
            : "",
          group: validIdsByType.group.has(requestedGroup) ? requestedGroup : "",
        }}
        initialQuery={initialQuery}
        initialSection={isEntryType(requestedType) ? requestedType : "all"}
        relationships={publishedRelationships}
      />
    </>
  );
}
