"use client";

import { useActionState, useEffect, useRef } from "react";
import {
  createRelatedEntry,
  type EntryOption,
  type RelatedEntryState,
} from "./actions";

type RelationshipType = "realm" | "species" | "group";

type RelatedEntryDialogProps = {
  sourceEntryId: string;
  relationshipType: RelationshipType;
  onClose: () => void;
  onCreated: (entry: EntryOption) => void;
};

const initialState: RelatedEntryState = {};

const titleByType: Record<RelationshipType, string> = {
  realm: "Realm",
  species: "Species",
  group: "Group",
};

export default function RelatedEntryDialog({
  sourceEntryId,
  relationshipType,
  onClose,
  onCreated,
}: RelatedEntryDialogProps) {
  const [state, formAction, isPending] = useActionState(
    createRelatedEntry,
    initialState,
  );
  const notifiedEntryId = useRef<string | null>(null);
  const title = titleByType[relationshipType];

  useEffect(() => {
    if (
      state.createdEntry &&
      notifiedEntryId.current !== state.createdEntry.id
    ) {
      notifiedEntryId.current = state.createdEntry.id;
      onCreated(state.createdEntry);
    }
  }, [onCreated, state.createdEntry]);

  return (
    <div
      aria-labelledby="related-entry-title"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 px-4 py-8"
      role="dialog"
    >
      <section className="w-full max-w-2xl rounded-xl bg-white p-6 shadow-xl">
        <header className="flex items-start justify-between gap-4">
          <div>
            <h2
              className="text-xl font-semibold text-zinc-950"
              id="related-entry-title"
            >
              Create {title}
            </h2>
            <p className="mt-1 text-sm text-zinc-600">
              This entry will be linked to the Being and available to reuse.
            </p>
            {relationshipType === "species" && (
              <p className="mt-1 text-sm text-amber-800">
                A Being can link to one species. Creating this species will
                replace its current species link.
              </p>
            )}
          </div>
          <button
            aria-label="Close create related entry"
            className="rounded-md px-2 py-1 text-zinc-600 hover:bg-zinc-100"
            disabled={isPending}
            onClick={onClose}
            type="button"
          >
            Close
          </button>
        </header>

        <form action={formAction} className="mt-6 space-y-6">
          <input name="sourceEntryId" type="hidden" value={sourceEntryId} />
          <input
            name="relationshipType"
            type="hidden"
            value={relationshipType}
          />

          <div>
            <label
              className="block text-sm font-medium text-zinc-800"
              htmlFor="related-name"
            >
              Name
            </label>
            <input
              autoComplete="off"
              className="mt-2 w-full rounded-md border border-zinc-300 px-3 py-2 text-zinc-950"
              id="related-name"
              maxLength={200}
              name="name"
              required
            />
          </div>

          <div>
            <label
              className="block text-sm font-medium text-zinc-800"
              htmlFor="related-description"
            >
              Description
            </label>
            <textarea
              className="mt-2 min-h-24 w-full rounded-md border border-zinc-300 px-3 py-2 text-zinc-950"
              id="related-description"
              name="description"
              rows={4}
            />
          </div>

          <section>
            <h3 className="text-sm font-medium text-zinc-800">Image</h3>
            <p className="mt-1 text-sm text-zinc-600">
              Optional. JPEG, PNG, or WebP up to 5 MB. Images require alt text.
            </p>
            <input
              accept="image/jpeg,image/png,image/webp"
              className="mt-3 block w-full text-sm text-zinc-700"
              name="image"
              type="file"
            />
            <label
              className="mt-3 block text-sm font-medium text-zinc-800"
              htmlFor="related-image-alt"
            >
              Image alt text
            </label>
            <input
              className="mt-2 w-full rounded-md border border-zinc-300 px-3 py-2 text-zinc-950"
              id="related-image-alt"
              maxLength={500}
              name="image_alt"
            />
          </section>

          {state.error && (
            <p
              className="rounded-md bg-red-50 p-3 text-sm text-red-800"
              role="alert"
            >
              {state.error}
            </p>
          )}

          <div className="flex flex-wrap gap-3">
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
          </div>
        </form>
      </section>
    </div>
  );
}
