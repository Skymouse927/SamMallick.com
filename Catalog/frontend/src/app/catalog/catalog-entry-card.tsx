import Link from "next/link";
import {
  ENTRY_TYPE_LABELS,
  type CatalogEntry,
} from "./catalog-data";

type CatalogEntryCardProps = {
  entry: CatalogEntry;
  imageUrl: string | null;
};

export default function CatalogEntryCard({
  entry,
  imageUrl,
}: CatalogEntryCardProps) {
  return (
    <article className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <Link
        className="block h-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900"
        href={`/catalog/${entry.id}`}
      >
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            alt={entry.image_alt ?? ""}
            className="aspect-[4/3] w-full bg-zinc-100 object-cover"
            src={imageUrl}
          />
        ) : (
          <div
            aria-hidden="true"
            className="flex aspect-[4/3] w-full items-center justify-center bg-gradient-to-br from-amber-50 via-rose-50 to-indigo-100"
          >
            <span className="text-5xl font-semibold text-zinc-400">
              {entry.name.charAt(0).toUpperCase()}
            </span>
          </div>
        )}
        <div className="p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
            {ENTRY_TYPE_LABELS[entry.entry_type_id]}
          </p>
          <h2 className="mt-1 text-xl font-semibold text-zinc-950">
            {entry.name}
          </h2>
          {entry.description && (
            <p className="mt-2 line-clamp-3 text-sm leading-6 text-zinc-600">
              {entry.description}
            </p>
          )}
          <span className="mt-4 inline-block text-sm font-medium text-indigo-700">
            View entry <span aria-hidden="true">&rarr;</span>
          </span>
        </div>
      </Link>
    </article>
  );
}
