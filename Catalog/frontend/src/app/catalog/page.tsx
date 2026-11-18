import { Suspense } from "react";
import Link from "next/link";
import CatalogEntryCard from "./catalog-entry-card";
import {
  ENTRY_TYPE_LABELS,
  ENTRY_TYPES,
  getPublicImageUrl,
  getRelationshipsByEntry,
  loadPublishedCatalog,
  type EntryType,
  type RelationshipType,
} from "./catalog-data";

type CatalogSearchParams = {
  q?: string | string[];
  type?: string | string[];
  realm?: string | string[];
  species?: string | string[];
  group?: string | string[];
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

function getTargetIds(
  entryId: string,
  relationshipType: RelationshipType,
  relationshipsByEntry: ReturnType<typeof getRelationshipsByEntry>,
): string[] {
  return (relationshipsByEntry.get(entryId) ?? [])
    .filter((relationship) => relationship.relationship_type === relationshipType)
    .map((relationship) => relationship.target_entry_id);
}

export default function CatalogPage({ searchParams }: CatalogPageProps) {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-zinc-50 px-6 py-16 text-center text-zinc-600">
          Loading catalog...
        </main>
      }
    >
      <CatalogContent searchParams={searchParams} />
    </Suspense>
  );
}

async function CatalogContent({ searchParams }: CatalogPageProps) {
  const params = await searchParams;
  const query = firstValue(params.q).trim().slice(0, 100);
  const requestedType = firstValue(params.type);
  const requestedRealm = firstValue(params.realm);
  const requestedSpecies = firstValue(params.species);
  const requestedGroup = firstValue(params.group);

  const { supabase, entries, relationships } = await loadPublishedCatalog();
  const relationshipsByEntry = getRelationshipsByEntry(relationships);
  const realms = entries.filter((entry) => entry.entry_type_id === "realm");
  const species = entries.filter((entry) => entry.entry_type_id === "species");
  const groups = entries.filter((entry) => entry.entry_type_id === "group");
  const selectedType = isEntryType(requestedType) ? requestedType : "";
  const selectedRealm = realms.some((entry) => entry.id === requestedRealm)
    ? requestedRealm
    : "";
  const selectedSpecies = species.some((entry) => entry.id === requestedSpecies)
    ? requestedSpecies
    : "";
  const selectedGroup = groups.some((entry) => entry.id === requestedGroup)
    ? requestedGroup
    : "";
  const normalizedQuery = query.toLocaleLowerCase();

  const filteredEntries = entries.filter((entry) => {
    if (selectedType && entry.entry_type_id !== selectedType) {
      return false;
    }
    if (
      normalizedQuery &&
      !entry.name.toLocaleLowerCase().includes(normalizedQuery)
    ) {
      return false;
    }
    if (
      selectedRealm &&
      !getTargetIds(entry.id, "realm", relationshipsByEntry).includes(
        selectedRealm,
      )
    ) {
      return false;
    }
    if (
      selectedSpecies &&
      !getTargetIds(entry.id, "species", relationshipsByEntry).includes(
        selectedSpecies,
      )
    ) {
      return false;
    }
    if (
      selectedGroup &&
      !getTargetIds(entry.id, "group", relationshipsByEntry).includes(
        selectedGroup,
      )
    ) {
      return false;
    }
    return true;
  });

  const entriesWithImages = await Promise.all(
    filteredEntries.map(async (entry) => ({
      entry,
      imageUrl: await getPublicImageUrl(supabase, entry.image_path),
    })),
  );

  return (
    <main className="min-h-screen bg-zinc-50">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <Link className="text-lg font-bold tracking-tight text-zinc-950" href="/">
            Sam Mallick
          </Link>
          <nav aria-label="Main navigation" className="flex items-center gap-5">
            <Link
              className="text-sm font-medium text-zinc-700 hover:text-zinc-950"
              href="/catalog"
            >
              Catalog
            </Link>
            <Link
              className="text-sm text-zinc-600 hover:text-zinc-950"
              href="/login"
            >
              Developer sign in
            </Link>
          </nav>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-6 py-10 sm:py-14">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-wider text-indigo-700">
            Explore the world
          </p>
          <h1 className="mt-3 text-4xl font-bold tracking-tight text-zinc-950 sm:text-5xl">
            The Catalog
          </h1>
          <p className="mt-4 text-lg leading-7 text-zinc-600">
            Discover its beings, realms, species, and groups.
          </p>
        </div>

        <form
          action="/catalog"
          className="mt-9 grid gap-4 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm sm:grid-cols-2 lg:grid-cols-6"
          method="get"
        >
          <div className="sm:col-span-2 lg:col-span-2">
            <label
              className="block text-sm font-medium text-zinc-800"
              htmlFor="catalog-search"
            >
              Search by name
            </label>
            <input
              className="mt-1.5 w-full rounded-md border border-zinc-300 px-3 py-2 text-zinc-950 placeholder:text-zinc-400"
              defaultValue={query}
              id="catalog-search"
              maxLength={100}
              name="q"
              placeholder="Search the catalog..."
              type="search"
            />
          </div>
          <div>
            <label
              className="block text-sm font-medium text-zinc-800"
              htmlFor="catalog-type"
            >
              Type
            </label>
            <select
              className="mt-1.5 w-full rounded-md border border-zinc-300 px-3 py-2 text-zinc-950"
              defaultValue={selectedType}
              id="catalog-type"
              name="type"
            >
              <option value="">All types</option>
              {ENTRY_TYPES.map((entryType) => (
                <option key={entryType} value={entryType}>
                  {ENTRY_TYPE_LABELS[entryType]}
                </option>
              ))}
            </select>
          </div>
          <FilterSelect
            id="catalog-realm"
            label="Realm"
            options={realms}
            value={selectedRealm}
            name="realm"
          />
          <FilterSelect
            id="catalog-species"
            label="Species"
            options={species}
            value={selectedSpecies}
            name="species"
          />
          <div className="sm:col-span-2 lg:col-span-2">
            <FilterSelect
              id="catalog-group"
              label="Group"
              options={groups}
              value={selectedGroup}
              name="group"
            />
          </div>
          <div className="flex items-end gap-3 sm:col-span-2 lg:col-span-6">
            <button
              className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700"
              type="submit"
            >
              Apply filters
            </button>
            <Link
              className="rounded-md px-3 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-100 hover:text-zinc-950"
              href="/catalog"
            >
              Clear
            </Link>
            <p className="ml-auto text-sm text-zinc-500" aria-live="polite">
              {filteredEntries.length}{" "}
              {filteredEntries.length === 1 ? "entry" : "entries"}
            </p>
          </div>
        </form>

        {entriesWithImages.length === 0 ? (
          <div className="mt-10 rounded-xl border border-dashed border-zinc-300 bg-white px-6 py-16 text-center">
            <h2 className="text-xl font-semibold text-zinc-900">
              No entries found
            </h2>
            <p className="mt-2 text-zinc-600">
              Try a different name or clear one or more filters.
            </p>
          </div>
        ) : (
          <section aria-label="Catalog entries" className="mt-8">
            <ul className="grid list-none gap-5 p-0 sm:grid-cols-2 lg:grid-cols-3">
              {entriesWithImages.map(({ entry, imageUrl }) => (
                <li key={entry.id}>
                  <CatalogEntryCard entry={entry} imageUrl={imageUrl} />
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </main>
  );
}

function FilterSelect({
  id,
  label,
  name,
  options,
  value,
}: {
  id: string;
  label: string;
  name: string;
  options: { id: string; name: string }[];
  value: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-zinc-800" htmlFor={id}>
        {label}
      </label>
      <select
        className="mt-1.5 w-full rounded-md border border-zinc-300 px-3 py-2 text-zinc-950"
        defaultValue={value}
        id={id}
        name={name}
      >
        <option value="">
          All {label === "Species" ? "species" : `${label.toLowerCase()}s`}
        </option>
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.name}
          </option>
        ))}
      </select>
    </div>
  );
}
