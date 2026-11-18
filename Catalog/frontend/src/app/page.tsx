import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col bg-zinc-50">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-5">
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
      <section className="mx-auto flex w-full max-w-7xl flex-1 items-center px-6 py-20">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-wider text-indigo-700">
            Welcome
          </p>
          <h1 className="mt-4 text-5xl font-bold tracking-tight text-zinc-950 sm:text-6xl">
            Discover the world of Sam Mallick.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-zinc-600">
            Explore the beings, realms, species, and groups that bring it to
            life.
          </p>
          <Link
            className="mt-8 inline-flex rounded-md bg-zinc-900 px-5 py-3 text-sm font-semibold text-white hover:bg-zinc-700"
            href="/catalog"
          >
            Explore the catalog
          </Link>
        </div>
      </section>
    </main>
  );
}
