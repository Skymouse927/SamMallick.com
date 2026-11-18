"use client";

import { useActionState } from "react";
import {
  saveSiteLogo,
  type SiteLogoState,
} from "./site-logo-actions";

const initialState: SiteLogoState = {};

export default function SiteLogoForm({
  currentLogoUrl,
}: {
  currentLogoUrl: string | null;
}) {
  const [state, formAction, isPending] = useActionState(
    saveSiteLogo,
    initialState,
  );

  return (
    <form
      action={formAction}
      className="mt-4 space-y-4 rounded-lg border border-zinc-200 bg-white p-5"
    >
      <div className="flex items-center gap-4">
        {currentLogoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            alt=""
            className="h-12 w-12 rounded-full border border-zinc-200 object-cover"
            src={currentLogoUrl}
          />
        ) : (
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-zinc-900 text-lg font-semibold text-white">
            S
          </span>
        )}
        <p className="text-sm text-zinc-600">
          This image appears in the circular mark at the top left of the site.
        </p>
      </div>

      <div>
        <label
          className="block text-sm font-medium text-zinc-800"
          htmlFor="site-logo"
        >
          Choose image from your computer
        </label>
        <input
          accept="image/jpeg,image/png,image/webp"
          className="mt-2 block w-full text-sm text-zinc-700"
          id="site-logo"
          name="site_logo"
          required
          type="file"
        />
        <p className="mt-1 text-xs text-zinc-500">
          JPEG, PNG, or WebP; up to 5 MB. The image is cropped to fit a circle.
        </p>
      </div>

      {state.error && (
        <p className="rounded-md bg-red-50 p-3 text-sm text-red-800" role="alert">
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

      <button
        className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-60"
        disabled={isPending}
        type="submit"
      >
        {isPending ? "Uploading..." : "Upload site logo"}
      </button>
    </form>
  );
}
