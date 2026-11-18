import Image from "next/image";
import Link from "next/link";
import SiteHeader from "./catalog/site-header";

export default function Home() {
  return (
    <main className="dark-theme flex min-h-screen flex-col bg-[#19182f] text-[#f2eff6]">
      <SiteHeader />
      <section className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-5 py-6 sm:px-8 sm:py-8">
        <div className="grid flex-1 gap-5 md:grid-cols-2 md:gap-7">
          <Link
            className="group relative isolate flex min-h-[28rem] flex-col items-center justify-center gap-8 overflow-hidden rounded-[2rem] border border-[#4e4a59] bg-[#302e38] p-7 text-center shadow-[0_8px_24px_rgba(0,0,0,0.18)] transition hover:-translate-y-1 hover:border-[#a98ce8] hover:shadow-[0_18px_40px_rgba(0,0,0,0.3)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#b59bea] sm:min-h-[32rem] sm:p-10 md:min-h-[calc(100vh-10rem)]"
            href="/catalog"
          >
            <Image
              alt=""
              className="z-0 object-cover transition-transform duration-500 group-hover:scale-105"
              fill
              priority
              sizes="(min-width: 768px) 50vw, 100vw"
              src="/catalog-background.webp"
            />
            <span
              aria-hidden="true"
              className="absolute inset-0 z-10 bg-[#19182f]/65 transition-colors group-hover:bg-[#19182f]/55"
            />
            <span className="relative z-20 flex h-12 w-12 items-center justify-center rounded-full bg-[#493e5d]/90 text-xl text-[#d2c1ff]">
              C
            </span>
            <span className="relative z-20 flex flex-col items-center text-center">
              <span className="block text-4xl font-medium tracking-tight sm:text-5xl">
                Catalog
              </span>
              <span className="mt-7 inline-flex items-center gap-2 text-sm font-semibold text-[#c2aaf5]">
                Explore the catalog
                <span
                  aria-hidden="true"
                  className="transition-transform group-hover:translate-x-1"
                >
                  &rarr;
                </span>
              </span>
            </span>
          </Link>

          <button
            aria-disabled="true"
            className="flex min-h-[28rem] cursor-not-allowed flex-col items-center justify-center gap-8 rounded-[2rem] border border-dashed border-[#4a4651] bg-[#292831] p-7 text-center opacity-80 sm:min-h-[32rem] sm:p-10 md:min-h-[calc(100vh-10rem)]"
            disabled
            type="button"
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#393642] text-xl text-[#aaa4b2]">
              +
            </span>
            <span className="flex flex-col items-center text-center">
              <span className="block text-4xl font-medium tracking-tight text-[#d0cbd5] sm:text-5xl">
                Future additions
              </span>
              <span className="mt-3 block max-w-sm text-base leading-7 text-[#aaa4b2]">
                More parts of the site will be added here in the future.
              </span>
              <span className="mt-7 inline-flex rounded-full border border-[#4a4651] px-4 py-2 text-sm font-medium text-[#aaa4b2]">
                Coming later
              </span>
            </span>
          </button>
        </div>
      </section>
    </main>
  );
}
