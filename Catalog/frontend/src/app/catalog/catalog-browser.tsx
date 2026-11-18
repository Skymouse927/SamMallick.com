"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ENTRY_TYPE_LABELS,
  RELATIONSHIP_LABELS,
  type CatalogEntry,
  type CatalogRelationship,
  type EntryType,
  type RelationshipType,
} from "./catalog-types";

type CatalogSection = EntryType | "all";

type CatalogBrowserEntry = CatalogEntry & {
  imageUrl: string | null;
};

type CatalogBrowserProps = {
  entries: CatalogBrowserEntry[];
  relationships: CatalogRelationship[];
  initialSection: CatalogSection;
  initialQuery: string;
  initialFilters: {
    realm: string;
    species: string;
    group: string;
  };
  initialEntryId: string;
};

type ConnectionGroup = {
  heading: string;
  entries: CatalogBrowserEntry[];
};

const SECTION_TABS: { value: CatalogSection; label: string }[] = [
  { value: "realm", label: "Realms" },
  { value: "species", label: "Species" },
  { value: "group", label: "Groups" },
  { value: "being", label: "Beings" },
  { value: "all", label: "All" },
];

const EMPTY_FILTERS = { realm: "", species: "", group: "" };

export default function CatalogBrowser({
  entries,
  relationships,
  initialSection,
  initialQuery,
  initialFilters,
  initialEntryId,
}: CatalogBrowserProps) {
  const [section, setSection] = useState<CatalogSection>(initialSection);
  const [query, setQuery] = useState(initialQuery);
  const [filters, setFilters] = useState(initialFilters);
  const [selectedEntryId, setSelectedEntryId] = useState(initialEntryId);
  const [expandedGroupId, setExpandedGroupId] = useState(() => {
    if (initialSection !== "group") {
      return "";
    }
    const initialEntry = entries.find((entry) => entry.id === initialEntryId);
    if (initialEntry?.entry_type_id === "group") {
      return initialEntry.id;
    }
    return (
      relationships.find(
        (relationship) =>
          relationship.relationship_type === "group" &&
          relationship.source_entry_id === initialEntryId,
      )?.target_entry_id ?? ""
    );
  });
  const [connectionDialog, setConnectionDialog] =
    useState<ConnectionGroup | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const triggerButtonRef = useRef<HTMLButtonElement>(null);

  const entryById = useMemo(
    () => new Map(entries.map((entry) => [entry.id, entry])),
    [entries],
  );
  const groupMembersById = useMemo(() => {
    const grouped = new Map<string, CatalogBrowserEntry[]>();
    for (const relationship of relationships) {
      if (relationship.relationship_type !== "group") {
        continue;
      }
      const group = entryById.get(relationship.target_entry_id);
      const member = entryById.get(relationship.source_entry_id);
      if (group?.entry_type_id !== "group" || member?.entry_type_id !== "being") {
        continue;
      }
      const members = grouped.get(group.id) ?? [];
      members.push(member);
      grouped.set(group.id, members);
    }
    for (const members of grouped.values()) {
      members.sort((left, right) =>
        left.name.localeCompare(right.name, undefined, { sensitivity: "base" }),
      );
    }
    return grouped;
  }, [entryById, relationships]);
  const relationshipsByEntry = useMemo(() => {
    const grouped = new Map<string, CatalogRelationship[]>();
    for (const relationship of relationships) {
      const current = grouped.get(relationship.source_entry_id) ?? [];
      current.push(relationship);
      grouped.set(relationship.source_entry_id, current);
    }
    return grouped;
  }, [relationships]);

  const matchingEntries = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    return entries
      .filter((entry) => {
        if (
          !normalizedQuery &&
          section !== "all" &&
          entry.entry_type_id !== section
        ) {
          return false;
        }
        if (
          normalizedQuery &&
          !entry.name.toLocaleLowerCase().includes(normalizedQuery)
        ) {
          return false;
        }
        const linkedIds = new Map<RelationshipType, Set<string>>();
        for (const relationship of relationshipsByEntry.get(entry.id) ?? []) {
          const ids = linkedIds.get(relationship.relationship_type) ?? new Set();
          ids.add(relationship.target_entry_id);
          linkedIds.set(relationship.relationship_type, ids);
        }
        return (
          (!filters.realm ||
            (linkedIds.get("realm")?.has(filters.realm) ?? false)) &&
          (!filters.species ||
            (linkedIds.get("species")?.has(filters.species) ?? false)) &&
          (!filters.group ||
            (linkedIds.get("group")?.has(filters.group) ?? false))
        );
      })
      .sort((left, right) =>
        left.name.localeCompare(right.name, undefined, { sensitivity: "base" }),
      );
  }, [entries, filters, query, relationshipsByEntry, section]);

  const expandedGroup =
    section === "group"
      ? matchingEntries.find(
          (entry) =>
            entry.id === expandedGroupId && entry.entry_type_id === "group",
        )
      : undefined;
  const expandedGroupMembers = expandedGroup
    ? (groupMembersById.get(expandedGroup.id) ?? [])
    : [];
  const selectedEntry =
    matchingEntries.find((entry) => entry.id === selectedEntryId) ??
    expandedGroupMembers.find((entry) => entry.id === selectedEntryId) ??
    matchingEntries[0] ??
    null;
  const selectedIndexInMatches = selectedEntry
    ? matchingEntries.findIndex((entry) => entry.id === selectedEntry.id)
    : -1;
  const navigationEntries =
    selectedIndexInMatches === -1 &&
    expandedGroupMembers.some((entry) => entry.id === selectedEntry?.id)
      ? expandedGroupMembers
      : matchingEntries;
  const selectedIndex = selectedEntry
    ? navigationEntries.findIndex((entry) => entry.id === selectedEntry.id)
    : -1;
  const previousEntry =
    selectedIndex > 0 ? navigationEntries[selectedIndex - 1] : null;
  const nextEntry =
    selectedIndex >= 0 && selectedIndex < navigationEntries.length - 1
      ? navigationEntries[selectedIndex + 1]
      : null;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) {
      return;
    }
    if (connectionDialog && !dialog.open) {
      dialog.showModal();
    } else if (!connectionDialog && dialog.open) {
      dialog.close();
    }
  }, [connectionDialog]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      const params = new URLSearchParams();
      if (query.trim()) {
        params.set("q", query.trim());
      }
      if (section !== "all") {
        params.set("type", section);
      }
      if (filters.realm) {
        params.set("realm", filters.realm);
      }
      if (filters.species) {
        params.set("species", filters.species);
      }
      if (filters.group) {
        params.set("group", filters.group);
      }
      if (selectedEntry) {
        params.set("entry", selectedEntry.id);
      }
      const search = params.toString();
      window.history.replaceState(
        null,
        "",
        search ? `/catalog?${search}` : "/catalog",
      );
    }, 250);
    return () => window.clearTimeout(timeoutId);
  }, [filters, query, section, selectedEntry]);

  function getConnections(entry: CatalogBrowserEntry): ConnectionGroup[] {
    if (entry.entry_type_id === "being") {
      return (["realm", "species", "group"] as const).map((type) => ({
        heading: RELATIONSHIP_LABELS[type],
        entries: (relationshipsByEntry.get(entry.id) ?? [])
          .filter((relationship) => relationship.relationship_type === type)
          .map((relationship) => entryById.get(relationship.target_entry_id))
          .filter((related): related is CatalogBrowserEntry => Boolean(related))
          .sort((left, right) =>
            left.name.localeCompare(right.name, undefined, {
              sensitivity: "base",
            }),
          ),
      }));
    }

    const linkedBeings = relationships
      .filter((relationship) => relationship.target_entry_id === entry.id)
      .map((relationship) => entryById.get(relationship.source_entry_id))
      .filter(
        (related): related is CatalogBrowserEntry =>
          related?.entry_type_id === "being",
      )
      .sort((left, right) =>
        left.name.localeCompare(right.name, undefined, {
          sensitivity: "base",
        }),
      );
    return [{ heading: "Beings", entries: linkedBeings }];
  }

  function selectConnectedEntry(entry: CatalogBrowserEntry) {
    setSection(entry.entry_type_id);
    setQuery("");
    setFilters(EMPTY_FILTERS);
    setSelectedEntryId(entry.id);
    setExpandedGroupId("");
    setConnectionDialog(null);
  }

  function selectNavigationEntry(entry: CatalogBrowserEntry) {
    setSelectedEntryId(entry.id);
    if (section === "group" && entry.entry_type_id === "group") {
      setExpandedGroupId(entry.id);
    }
  }

  const activeFilterCount = Object.values(filters).filter(Boolean).length;

  return (
    <main className="dark-theme flex flex-1 flex-col bg-[#24232b] text-[#f2eff6] lg:min-h-0">
      <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-4 pb-10 sm:px-8 sm:pb-14 lg:min-h-0 lg:pb-4">
        <div className="border-b border-[#4b4654] pt-3">
          <div className="mb-2 flex items-end justify-between gap-4">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                Catalog
              </h1>
            </div>
            <p className="hidden pb-1 text-sm text-[#aaa4b2] sm:block">
              {entries.length} published{" "}
              {entries.length === 1 ? "entry" : "entries"}
            </p>
          </div>
          <nav
            aria-label="Catalog categories"
            className="-mb-px flex gap-1 overflow-x-auto"
          >
            {SECTION_TABS.map((tab) => (
              <button
                aria-pressed={section === tab.value}
                className={`shrink-0 border-b-2 px-4 py-2 text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#b59bea] ${
                  section === tab.value
                    ? "border-[#b59bea] text-[#c2aaf5]"
                    : "border-transparent text-[#b8b2c2] hover:border-[#756b86] hover:text-[#f2eff6]"
                }`}
                key={tab.value}
                onClick={() => {
                  setSection(tab.value);
                  setExpandedGroupId("");
                }}
                type="button"
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="grid gap-x-3 gap-y-5 pt-4 lg:min-h-0 lg:flex-1 lg:grid-cols-[18rem_2.5rem_minmax(0,1fr)_2.5rem] lg:grid-rows-[minmax(0,1fr)]">
          {navigationEntries.length > 1 && (
            <nav
              aria-label="Entry navigation"
              className="flex items-center justify-between lg:hidden"
            >
              <EntryNavigationButton
                direction="previous"
                entry={previousEntry}
                onSelect={() => previousEntry && selectNavigationEntry(previousEntry)}
              />
              <EntryNavigationButton
                direction="next"
                entry={nextEntry}
                onSelect={() => {
                  if (nextEntry) {
                    setSelectedEntryId(nextEntry.id);
                  }
                }}
              />
            </nav>
          )}

          <aside
            aria-labelledby="entry-list-heading"
            className="flex min-w-0 flex-col overflow-x-hidden overflow-y-auto lg:col-start-1 lg:row-start-1 lg:h-full lg:min-h-0 lg:border-r lg:border-[#4b4654] lg:pr-3"
          >
            <div className="border-b border-[#474350] pb-4">
              <label
                className="block text-xs font-semibold uppercase tracking-[0.14em] text-[#c1bbc9]"
                htmlFor="catalog-search"
              >
                Search all entries
              </label>
              <input
                autoComplete="off"
                className="mt-2 w-full rounded-xl border border-[#514b5d] bg-[#27252e] px-3.5 py-3 text-sm text-[#f2eff6] placeholder:text-[#aaa4b2] focus:border-[#b59bea] focus:outline-none focus:ring-2 focus:ring-[#b59bea]/25"
                id="catalog-search"
                maxLength={100}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search by name..."
                type="search"
                value={query}
              />
              <details className="group mt-3">
                <summary className="flex cursor-pointer list-none items-center justify-between rounded-lg py-2 text-sm font-medium text-[#d0cbd5] hover:text-[#f2eff6] focus-visible:outline-2 focus-visible:outline-[#b59bea]">
                  <span>
                    Refine results
                    {activeFilterCount > 0 && (
                      <span className="ml-2 rounded-full bg-[#493e5d] px-2 py-0.5 text-xs text-[#e4daf6]">
                        {activeFilterCount}
                      </span>
                    )}
                  </span>
                  <span
                    aria-hidden="true"
                    className="transition-transform group-open:rotate-180"
                  >
                    &#8964;
                  </span>
                </summary>
                <div className="space-y-3 pb-2 pt-1">
                  <FilterSelect
                    label="Realm"
                    options={entries.filter(
                      (entry) => entry.entry_type_id === "realm",
                    )}
                    value={filters.realm}
                    onChange={(value) =>
                      setFilters((current) => ({ ...current, realm: value }))
                    }
                  />
                  <FilterSelect
                    label="Species"
                    options={entries.filter(
                      (entry) => entry.entry_type_id === "species",
                    )}
                    value={filters.species}
                    onChange={(value) =>
                      setFilters((current) => ({ ...current, species: value }))
                    }
                  />
                  <FilterSelect
                    label="Group"
                    options={entries.filter(
                      (entry) => entry.entry_type_id === "group",
                    )}
                    value={filters.group}
                    onChange={(value) =>
                      setFilters((current) => ({ ...current, group: value }))
                    }
                  />
                  {activeFilterCount > 0 && (
                    <button
                      className="text-xs font-semibold text-[#c2aaf5] underline underline-offset-2"
                      onClick={() => setFilters(EMPTY_FILTERS)}
                      type="button"
                    >
                      Clear refinements
                    </button>
                  )}
                </div>
              </details>
            </div>

            <div
              aria-live="polite"
              className="flex items-center justify-between pb-2 pt-4"
            >
              <h2
                className="text-xs font-semibold uppercase tracking-[0.14em] text-[#c1bbc9]"
                id="entry-list-heading"
              >
                {query.trim() ? "Search results" : "Entries"}
              </h2>
              <span className="text-xs text-[#aaa4b2]">
                {matchingEntries.length}
              </span>
            </div>

            {matchingEntries.length === 0 ? (
              <p className="pb-6 pt-2 text-sm leading-6 text-[#aaa4b2]">
                No entries match. Try another name or clear a refinement.
              </p>
            ) : (
              <ul
                aria-labelledby="entry-list-heading"
                className="list-none space-y-1 px-1 pb-3 pt-1"
                id="catalog-entry-list"
                tabIndex={0}
              >
                {matchingEntries.map((entry) => {
                  const isExpandableGroup =
                    section === "group" && entry.entry_type_id === "group";
                  const isExpanded =
                    isExpandableGroup && expandedGroupId === entry.id;
                  const memberListId = `group-members-${entry.id}`;
                  const members = groupMembersById.get(entry.id) ?? [];
                  return (
                    <li key={entry.id}>
                      <button
                        aria-controls={isExpanded ? memberListId : undefined}
                        aria-expanded={
                          isExpandableGroup ? isExpanded : undefined
                        }
                        aria-pressed={selectedEntry?.id === entry.id}
                        className={`w-full rounded-xl px-3.5 py-3 text-left transition focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#b59bea] ${
                          selectedEntry?.id === entry.id
                            ? "bg-[#453b57] text-[#f2eff6]"
                            : "text-[#d2cddd] hover:bg-[#393642]"
                        }`}
                        onClick={() => {
                          setSelectedEntryId(entry.id);
                          if (isExpandableGroup) {
                            setExpandedGroupId((current) =>
                              current === entry.id ? "" : entry.id,
                            );
                          } else {
                            setExpandedGroupId("");
                          }
                        }}
                        type="button"
                      >
                        <span className="flex items-center justify-between gap-2">
                          <span className="block truncate text-sm font-semibold">
                            {entry.name}
                          </span>
                          {isExpandableGroup && (
                            <span
                              aria-hidden="true"
                              className="shrink-0 text-[#c2aaf5]"
                            >
                              {isExpanded ? "−" : "+"}
                            </span>
                          )}
                        </span>
                        <span className="mt-1 block text-xs text-[#aaa4b2]">
                          {ENTRY_TYPE_LABELS[entry.entry_type_id]}
                        </span>
                      </button>
                      {isExpanded && (
                        <ul
                          aria-label={`Items in ${entry.name}`}
                          className="ml-3 list-none space-y-1 border-l border-[#625c6c] py-1 pl-2"
                          id={memberListId}
                        >
                          {members.length === 0 ? (
                            <li>
                              <p className="px-3 py-2 text-xs text-[#aaa4b2]">
                                No items in this group.
                              </p>
                            </li>
                          ) : (
                            members.map((member) => (
                              <li key={member.id}>
                                <button
                                  aria-pressed={
                                    selectedEntry?.id === member.id
                                  }
                                  className={`w-full rounded-lg px-3 py-2 text-left transition focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#b59bea] ${
                                    selectedEntry?.id === member.id
                                      ? "bg-[#453b57] text-[#f2eff6]"
                                      : "text-[#d2cddd] hover:bg-[#393642]"
                                  }`}
                                  onClick={() =>
                                    setSelectedEntryId(member.id)
                                  }
                                  type="button"
                                >
                                  <span className="block truncate text-sm font-semibold">
                                    {member.name}
                                  </span>
                                  <span className="mt-1 block text-xs text-[#aaa4b2]">
                                    {ENTRY_TYPE_LABELS[member.entry_type_id]}
                                  </span>
                                </button>
                              </li>
                            ))
                          )}
                        </ul>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </aside>

          <section
            aria-label="Selected catalog entry"
            aria-live="polite"
            className="min-w-0 lg:col-start-3 lg:row-start-1 lg:flex lg:min-h-0 lg:flex-col"
          >
            <div className="lg:flex lg:min-h-0 lg:flex-1 lg:flex-col">
              {selectedEntry ? (
                <article
                  className="overflow-hidden rounded-2xl border border-[#4b4654] bg-[#302e38] shadow-[0_4px_18px_rgba(0,0,0,0.2)] lg:grid lg:min-h-0 lg:flex-1 lg:grid-cols-2"
                >
                  <div
                    className={`relative flex min-h-52 items-center justify-center sm:min-h-72 lg:min-h-0 ${
                      selectedEntry.imageUrl
                        ? "bg-[#292831]"
                        : "bg-gradient-to-br from-[#393245] via-[#35323f] to-[#343741]"
                    }`}
                  >
                    {selectedEntry.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        alt={selectedEntry.image_alt ?? ""}
                        className="max-h-[28rem] min-h-52 w-full object-contain sm:min-h-72 lg:absolute lg:inset-0 lg:h-full lg:max-h-none"
                        src={selectedEntry.imageUrl}
                      />
                    ) : (
                      <span
                        aria-hidden="true"
                        className="text-7xl font-semibold text-[#b49ae8]"
                      >
                        {selectedEntry.name.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="p-5 sm:p-8 lg:min-h-0 lg:overflow-y-auto">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#b59bea]">
                      {ENTRY_TYPE_LABELS[selectedEntry.entry_type_id]}
                    </p>
                    <h2 className="mt-2 text-3xl font-semibold tracking-tight text-[#f2eff6] sm:text-4xl">
                      {selectedEntry.name}
                    </h2>
                    {selectedEntry.description ? (
                      <p className="mt-4 whitespace-pre-line text-sm leading-7 text-[#d2cddd] sm:text-base">
                        {selectedEntry.description}
                      </p>
                    ) : (
                      <p className="mt-4 text-sm text-[#aaa4b2]">
                        No description has been added yet.
                      </p>
                    )}

                    <div className="mt-8 border-t border-[#474350] pt-5">
                      <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-[#c1bbc9]">
                        Connections
                      </h3>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {getConnections(selectedEntry).map((connection) => (
                          <button
                            className="rounded-full border border-[#625c6c] bg-[#27252e] px-4 py-2 text-sm font-medium text-[#e2d9f1] transition hover:border-[#b59bea] hover:bg-[#393642] disabled:cursor-default disabled:border-[#4b4654] disabled:text-[#817b89]"
                            disabled={connection.entries.length === 0}
                            key={connection.heading}
                            onClick={(event) => {
                              triggerButtonRef.current = event.currentTarget;
                              setConnectionDialog(connection);
                            }}
                            type="button"
                          >
                            {connection.heading}
                            <span className="ml-1.5 text-xs">
                              {connection.entries.length}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </article>
              ) : (
                <div className="flex min-h-80 flex-col items-center justify-center rounded-2xl border border-dashed border-[#4b4654] bg-[#302e38] px-6 text-center lg:flex-1">
                  <span
                    aria-hidden="true"
                    className="flex h-14 w-14 items-center justify-center rounded-full bg-[#493e5d] text-2xl font-semibold text-[#d2c1ff]"
                  >
                    ?
                  </span>
                  <h2 className="mt-4 text-2xl font-semibold text-[#f2eff6]">
                    Choose an entry to explore
                  </h2>
                  <p className="mt-2 max-w-sm text-sm leading-6 text-[#aaa4b2]">
                    Select a name from the list, or search for a realm, species,
                    group, or being.
                  </p>
                </div>
              )}
            </div>
          </section>

          <div className="hidden items-center justify-center lg:col-start-2 lg:row-start-1 lg:flex">
            <EntryNavigationButton
              direction="previous"
              entry={previousEntry}
              onSelect={() =>
                previousEntry && selectNavigationEntry(previousEntry)
              }
            />
          </div>
          <div className="hidden items-center justify-center lg:col-start-4 lg:row-start-1 lg:flex">
            <EntryNavigationButton
              direction="next"
              entry={nextEntry}
              onSelect={() => nextEntry && selectNavigationEntry(nextEntry)}
            />
          </div>
        </div>
      </div>

      <dialog
        aria-labelledby="connections-dialog-title"
        className="m-auto max-h-[min(80vh,42rem)] w-[calc(100%-2rem)] max-w-lg overflow-hidden rounded-2xl border border-[#4b4654] bg-[#302e38] p-0 text-[#f2eff6] shadow-2xl backdrop:bg-[#100e15]/75"
        onClick={(event) => {
          if (event.target === event.currentTarget) {
            setConnectionDialog(null);
          }
        }}
        onClose={() => {
          setConnectionDialog(null);
          triggerButtonRef.current?.focus();
        }}
        ref={dialogRef}
      >
        {connectionDialog && (
          <>
            <div className="flex items-start justify-between gap-4 border-b border-[#474350] px-5 py-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#b59bea]">
                  Connected entries
                </p>
                <h2
                  className="mt-1 text-2xl font-semibold text-[#f2eff6]"
                  id="connections-dialog-title"
                >
                  {connectionDialog.heading}
                </h2>
              </div>
              <button
                aria-label="Close connections"
                className="flex h-9 w-9 items-center justify-center rounded-full text-xl text-[#c1bbc9] hover:bg-[#403b4c] focus-visible:outline-2 focus-visible:outline-[#b59bea]"
                onClick={() => setConnectionDialog(null)}
                type="button"
              >
                &times;
              </button>
            </div>
            <ul className="max-h-[55vh] list-none space-y-1 overflow-y-auto p-3">
              {connectionDialog.entries.map((entry) => (
                <li key={entry.id}>
                  <button
                    className="flex w-full items-center justify-between rounded-xl px-4 py-3 text-left transition hover:bg-[#403b4c] focus-visible:outline-2 focus-visible:outline-[#b59bea]"
                    onClick={() => selectConnectedEntry(entry)}
                    type="button"
                  >
                    <span>
                      <span className="block font-semibold text-[#f2eff6]">
                        {entry.name}
                      </span>
                      <span className="mt-1 block text-xs text-[#aaa4b2]">
                        {ENTRY_TYPE_LABELS[entry.entry_type_id]}
                      </span>
                    </span>
                    <span aria-hidden="true" className="text-[#c2aaf5]">
                      &rarr;
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
      </dialog>
    </main>
  );
}

function EntryNavigationButton({
  direction,
  entry,
  onSelect,
}: {
  direction: "previous" | "next";
  entry: CatalogBrowserEntry | null;
  onSelect: () => void;
}) {
  if (!entry) {
    return null;
  }

  const isPrevious = direction === "previous";
  return (
    <button
      aria-label={`${isPrevious ? "Previous" : "Next"} entry: ${entry.name}`}
      className="flex h-10 w-8 shrink-0 items-center justify-center rounded-full text-lg text-[#8f879c] transition hover:bg-[#302e38] hover:text-[#c2aaf5] focus-visible:bg-[#302e38] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#b59bea]"
      onClick={onSelect}
      type="button"
    >
      <span aria-hidden="true">{isPrevious ? "\u2190" : "\u2192"}</span>
    </button>
  );
}

function FilterSelect({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: CatalogBrowserEntry[];
  value: string;
  onChange: (value: string) => void;
}) {
  const id = `filter-${label.toLocaleLowerCase()}`;
  return (
    <label className="block text-xs font-medium text-[#c1bbc9]" htmlFor={id}>
      {label}
      <select
        className="mt-1 block w-full rounded-lg border border-[#514b5d] bg-[#27252e] px-3 py-2 text-sm text-[#f2eff6] focus:border-[#b59bea] focus:outline-none focus:ring-2 focus:ring-[#b59bea]/25"
        id={id}
        onChange={(event) => onChange(event.target.value)}
        value={value}
      >
        <option value="">
          All {label === "Species" ? "species" : `${label.toLowerCase()}s`}
        </option>
        {options.map((entry) => (
          <option key={entry.id} value={entry.id}>
            {entry.name}
          </option>
        ))}
      </select>
    </label>
  );
}
