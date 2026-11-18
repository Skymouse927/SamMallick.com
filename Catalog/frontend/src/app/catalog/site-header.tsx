import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSiteLogo } from "./site-logo-data";

export default function SiteHeader() {
  return (
    <Suspense fallback={<SiteHeaderContent logoUrl={null} />}>
      <DynamicSiteHeader />
    </Suspense>
  );
}

async function DynamicSiteHeader() {
  await connection();
  const supabase = await createClient();
  const siteLogo = await getSiteLogo(supabase);
  return <SiteHeaderContent logoUrl={siteLogo?.url ?? null} />;
}

function SiteHeaderContent({ logoUrl }: { logoUrl: string | null }) {
  return (
    <header className="border-b border-[#474350] bg-[#2b2932]">
      <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-4 px-5 py-3 sm:px-8">
        <Link
          aria-label="sammallick.com home"
          className="inline-flex items-center gap-3 rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#b59bea]"
          href="/"
        >
          <span className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-[#514268] text-lg font-semibold text-[#f2eff6]">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                alt=""
                className="h-full w-full object-cover"
                src={logoUrl}
              />
            ) : (
              <span aria-hidden="true">S</span>
            )}
          </span>
          <span className="text-xl font-semibold tracking-wide text-[#f2eff6] sm:text-2xl">
            sammallick.com
          </span>
        </Link>
        <nav aria-label="Site navigation" className="flex items-center gap-3">
          <Link
            className="rounded-full px-4 py-2 text-sm font-semibold text-[#d0cbd5] transition hover:bg-[#393642] hover:text-[#f2eff6] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#b59bea]"
            href="/catalog"
          >
            Catalog
          </Link>
          <Link
            className="rounded-full border border-[#625c6c] px-4 py-2 text-sm font-semibold text-[#eeeaf4] transition hover:border-[#b59bea] hover:bg-[#393642] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#b59bea]"
            href="/login"
          >
            Developer sign in
          </Link>
        </nav>
      </div>
    </header>
  );
}
