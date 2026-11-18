"use client";

import Link from "next/link";
import { useActionState, useCallback, useState } from "react";
import {
  saveEntry,
  deleteEntry,
  type EntryOption,
  type EntryType,
  type DeleteEntryState,
  type SaveEntryState,
} from "./actions";
import RelatedEntryDialog from "./related-entry-dialog";

type RelationshipType = "realm" | "species" | "group";

type EntryFormValue = {
  id: string;
  name: string;
  description: string;
  entry_type_id: EntryType;
  image_alt: string | null;
  imageUrl: string | null;
  realmIds: string[];
  speciesId: string | null;
  groupIds: string[];
};

type EntryFormProps = {
  entry?: EntryFormValue;
  targets: EntryOption[];
};

const initialState: SaveEntryState = {};
const initialDeleteState: DeleteEntryState = {};

function targetLabel(target: EntryOption) {
  return `${target.name}${target.status === "draft" ? " (draft)" : ""}`;
}

function sortByName<T extends { name: string }>(items: T[]) {
  return [...items].sort((first, second) => first.name.localeCompare(second.name));
}

export default function EntryForm({
  entry,
  targets: initialTargets,
}: EntryFormProps) {
  const [entryType, setEntryType] = useState<EntryType>(
    entry?.entry_type_id ?? "being",
  );
  const [targets, setTargets] = useState(initialTargets);
  const [realmIds, setRealmIds] = useState(entry?.realmIds ?? []);
  const [speciesId, setSpeciesId] = useState(entry?.speciesId ?? "");
  const [groupIds, setGroupIds] = useState(entry?.groupIds ?? []);
  const [relatedType, setRelatedType] = useState<RelationshipType | null>(null);
  const [state, formAction, isPending] = useActionState(
    saveEntry,
    initialState,
  );
  const [deleteState, deleteFormAction, isDeletePending] = useActionState(
    deleteEntry,
    initialDeleteState,
  );

  const realms = targets.filter((target) => target.entry_type_id === "realm");
  const species = targets.filter((target) => target.entry_type_id === "species");
  const groups = targets.filter((target) => target.entry_type_id === "group");

  const handleRelatedEntryCreated = useCallback(
    (createdEntry: EntryOption) => {
      setTargets((current) =>
        sortByName([
          ...current.filter((target) => target.id !== createdEntry.id),
          createdEntry,
        ]),
      );

      if (createdEntry.entry_type_id === "realm") {
        setRealmIds((current) =>
          current.includes(createdEntry.id)
            ? current
            : [...current, createdEntry.id],
        );
      } else if (createdEntry.entry_type_id === "species") {
        setSpeciesId(createdEntry.id);
      } else if (createdEntry.entry_type_id === "group") {
        setGroupIds((current) =>
          current.includes(createdEntry.id)
            ? current
            : [...current, createdEntry.id],
        );
      }

      setRelatedType(null);
    },
    [],
  );

  return (
    <div>
      <form action={formAction} className="mt-8 space-y-8">
        {entry && <input name="id" type="hidden" value={entry.id} />}

        <section className="space-y-5 rounded-xl border border-zinc-200 bg-white p-6 text-zinc-900">
          <div>
            <label
              className="block text-sm font-medium text-zinc-800"
              htmlFor="name"
            >
              Name
            </label>
            <input
              autoComplete="off"
              className="mt-2 w-full rounded-md border border-zinc-300 px-3 py-2 text-zinc-950"
              defaultValue={entry?.name ?? ""}
              id="name"
              maxLength={200}
              name="name"
              required
            />
          </div>

          <div>
            <label
              className="block text-sm font-medium text-zinc-800"
              htmlFor="entry_type_id"
            >
              Entry type
            </label>
            <select
              className="mt-2 w-full rounded-md border border-zinc-300 px-3 py-2 text-zinc-950"
              id="entry_type_id"
              name="entry_type_id"
              onChange={(event) => {
                const value = event.currentTarget.value;
                if (
                  value === "being" ||
                  value === "realm" ||
                  value === "species" ||
                  value === "group"
                ) {
                  setEntryType(value);
                }
              }}
              value={entryType}
            >
              <option value="being">Being</option>
              <option value="realm">Realm</option>
              <option value="species">Species</option>
              <option value="group">Group</option>
            </select>
          </div>

          <div>
            <label
              className="block text-sm font-medium text-zinc-800"
              htmlFor="description"
            >
              Description
            </label>
            <textarea
              className="mt-2 min-h-32 w-full rounded-md border border-zinc-300 px-3 py-2 text-zinc-950"
              defaultValue={entry?.description ?? ""}
              id="description"
              name="description"
              rows={5}
            />
          </div>
        </section>

        {entryType === "being" && (
          <section className="space-y-6 rounded-xl border border-zinc-200 bg-white p-6 text-zinc-900">
            <div>
              <h2 className="text-lg font-semibold text-zinc-950">
                Relationships
              </h2>
              <p className="mt-1 text-sm text-zinc-600">
                Select existing entries or create and link a new one. Draft
                entries are marked.
              </p>
            </div>

            <div>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <label
                  className="block text-sm font-medium text-zinc-800"
                  htmlFor="speciesId"
                >
                  Species
                </label>
                {entry && (
                  <button
                    className="text-sm font-medium text-zinc-700 underline hover:text-zinc-950"
                    onClick={() => setRelatedType("species")}
                    type="button"
                  >
                    Create species
                  </button>
                )}
              </div>
              <select
                className="mt-2 w-full rounded-md border border-zinc-300 px-3 py-2 text-zinc-950"
                onChange={(event) => setSpeciesId(event.currentTarget.value)}
                id="speciesId"
                name="speciesId"
                value={speciesId}
              >
                <option value="">No species selected</option>
                {species.map((target) => (
                  <option key={target.id} value={target.id}>
                    {targetLabel(target)}
                  </option>
                ))}
              </select>
            </div>

            <fieldset>
              <legend className="text-sm font-medium text-zinc-800">Realms</legend>
              {entry && (
                <button
                  className="mt-2 text-sm font-medium text-zinc-700 underline hover:text-zinc-950"
                  onClick={() => setRelatedType("realm")}
                  type="button"
                >
                  Create realm
                </button>
              )}
              {realms.length === 0 ? (
                <p className="mt-2 text-sm text-zinc-600">
                  No realm entries yet.
                </p>
              ) : (
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  {realms.map((target) => (
                    <label
                      className="flex items-center gap-2 text-sm text-zinc-700"
                      key={target.id}
                    >
                      <input
                        checked={realmIds.includes(target.id)}
                        name="realmIds"
                        onChange={() =>
                          setRealmIds((current) =>
                            current.includes(target.id)
                              ? current.filter((id) => id !== target.id)
                              : [...current, target.id],
                          )
                        }
                        type="checkbox"
                        value={target.id}
                      />
                      {targetLabel(target)}
                    </label>
                  ))}
                </div>
              )}
            </fieldset>

            <fieldset>
              <legend className="text-sm font-medium text-zinc-800">Groups</legend>
              {entry && (
                <button
                  className="mt-2 text-sm font-medium text-zinc-700 underline hover:text-zinc-950"
                  onClick={() => setRelatedType("group")}
                  type="button"
                >
                  Create group
                </button>
              )}
              {groups.length === 0 ? (
                <p className="mt-2 text-sm text-zinc-600">
                  No group entries yet.
                </p>
              ) : (
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  {groups.map((target) => (
                    <label
                      className="flex items-center gap-2 text-sm text-zinc-700"
                      key={target.id}
                    >
                      <input
                        checked={groupIds.includes(target.id)}
                        name="groupIds"
                        onChange={() =>
                          setGroupIds((current) =>
                            current.includes(target.id)
                              ? current.filter((id) => id !== target.id)
                              : [...current, target.id],
                          )
                        }
                        type="checkbox"
                        value={target.id}
                      />
                      {targetLabel(target)}
                    </label>
                  ))}
                </div>
              )}
            </fieldset>

            {!entry && (
              <p className="text-sm text-zinc-600">
                Save this Being first. You can then create and link new related
                entries from its edit page.
              </p>
            )}
          </section>
        )}

        <section className="space-y-5 rounded-xl border border-zinc-200 bg-white p-6 text-zinc-900">
          <div>
            <h2 className="text-lg font-semibold text-zinc-950">Image</h2>
            <p className="mt-1 text-sm text-zinc-600">
              Optional to publish. JPEG, PNG, or WebP, up to 5 MB. Images require
              descriptive alt text.
            </p>
            {entry?.imageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                alt={entry.image_alt ?? ""}
                className="mt-4 max-h-64 rounded-lg border border-zinc-200 object-contain"
                src={entry.imageUrl}
              />
            )}
            <label
              className="mt-4 block text-sm font-medium text-zinc-800"
              htmlFor="image"
            >
              {entry?.imageUrl ? "Replace image" : "Upload image"}
            </label>
            <input
              accept="image/jpeg,image/png,image/webp"
              className="mt-2 block w-full text-sm text-zinc-700"
              id="image"
              name="image"
              type="file"
            />
            <label
              className="mt-4 block text-sm font-medium text-zinc-800"
              htmlFor="image_alt"
            >
              Image alt text
            </label>
            <input
              className="mt-2 w-full rounded-md border border-zinc-300 px-3 py-2 text-zinc-950"
              defaultValue={entry?.image_alt ?? ""}
              id="image_alt"
              maxLength={500}
              name="image_alt"
            />
          </div>
        </section>

        {state.error && (
          <p
            className="rounded-md bg-red-50 p-3 text-sm text-red-800"
            role="alert"
          >
            {state.error}
          </p>
        )}
        {state.message && (
          <p
            className="rounded-md bg-emerald-50 p-3 text-sm text-emerald-800"
            role="status"
          >
            {state.message}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <button
            className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-100 disabled:opacity-60"
            disabled={isPending}
            name="status"
            type="submit"
            value="draft"
          >
            {isPending ? "Saving..." : "Save draft"}
          </button>
          <button
            className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-60"
            disabled={isPending}
            name="status"
            type="submit"
            value="published"
          >
            {isPending ? "Saving..." : "Publish entry"}
          </button>
          <Link
            className="px-2 py-2 text-sm text-zinc-600 hover:text-zinc-950"
            href="/developer"
          >
            Cancel
          </Link>
        </div>
      </form>

      {relatedType && entry && (
        <RelatedEntryDialog
          onClose={() => setRelatedType(null)}
          onCreated={handleRelatedEntryCreated}
          relationshipType={relatedType}
          sourceEntryId={entry.id}
        />
      )}
      {entry && (
        <section className="mt-12 border-t border-zinc-200 pt-8">
          <h2 className="text-lg font-semibold text-red-300">Delete entry</h2>
          <p className="mt-1 text-sm text-[#b8a4d8]">
            This permanently deletes this entry and its relationship links.
            Other linked entries will not be deleted.
          </p>
          {deleteState.error && (
            <p className="mt-3 text-sm text-red-800" role="alert">
              {deleteState.error}
            </p>
          )}
          <form
            action={deleteFormAction}
            className="mt-4"
            onSubmit={(event) => {
              if (
                !window.confirm(
                  `Permanently delete "${entry.name}"? This cannot be undone.`,
                )
              ) {
                event.preventDefault();
              }
            }}
          >
            <input name="id" type="hidden" value={entry.id} />
            <button
              className="rounded-md bg-red-700 px-4 py-2 text-sm font-medium text-white hover:bg-red-800 disabled:opacity-60"
              disabled={isDeletePending}
              type="submit"
            >
              {isDeletePending ? "Deleting..." : "Delete entry permanently"}
            </button>
          </form>
        </section>
      )}
    </div>
  );
}
