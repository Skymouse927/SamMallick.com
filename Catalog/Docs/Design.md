# Catalog App Design

## Purpose

Build a website that starts with a public, searchable catalog of beings,
realms, species, groups, and other catalog entry types. Anyone can browse
published catalog entries without signing in. Invited developers can add
and edit catalog entries, and more developers can be invited later.

The catalog is the first section of the website, not the limit of its scope.
Once the catalog is established, the site may grow to include games and other
features.

## Website structure and future growth

- Keep the root route available for site-wide home, navigation, and future
  sections. Build the catalog under `/catalog`; a future games section can use
  `/games`.
- Keep catalog and future feature data, rules, pages, storage, and access
  policies in their own feature areas. Catalog `entries` describe catalog
  subjects; do not represent games as another catalog entry type.
- Share the site shell, visual foundations, account identity, and utilities
  where they are genuinely common. Keep feature permissions separate, so
  catalog developer access does not automatically grant access to future
  features.
- Prefer clear module boundaries and additive migrations. Do not introduce
  separate services, databases, or a plugin framework until a real feature
  needs them.
- Design future features when their requirements are known rather than
  pre-committing their data models now.

## How the catalog works

### Entries and relationships

Each entry has a name, a description, an entry type, and space for one optional
uploaded image with alt text. The initial entry types are Being, Realm, Species,
and Group.

Realms, species, and groups have their own pages. A developer adding a
being selects its realm, species, and groups from existing entries.
These links power the public filters and let visitors move between
related pages. Renaming a group updates its displayed name wherever
it is linked.

A later phase can add relationships such as “allied with” or “founded by.”

### Public browsing

- Search by full or partial entry name, regardless of capitalization.
- Combine name search with filters for type, realm, species, and group.
- Sort matching entries alphabetically by name by default.
- Show the entry image as a thumbnail in results and at a larger size
  on its detail page.
- Reflect changes to published names and links automatically.
  Developers do not have to maintain category lists by hand.

### Developer editing

1. Sign in with an invited developer account.
2. Create an entry and choose its type.
3. Add its name, description, and applicable links.
4. Upload an image and add alt text. The image can be replaced later.
5. Save the entry as a draft or publish it.

While editing a Being, developers can create a Realm, Species, or Group using
its full entry form. The new entry is linked to the Being and becomes available
for reuse in other entries. A Being can link to only one Species.

Only developers can access drafts and change entries or images.
The app enforces these permissions on the server and in the database
and storage policies. Images are stored privately; visitors can view an
image only when its associated entry is published.

## Development setup and budget

- Use VS Code, Node.js, Next.js, and TypeScript for the web app.
- Use local Supabase for PostgreSQL, authentication, and image storage.
- Use Git and a GitHub Free repository for the design doc, application
  code, database migrations, and pull requests.
- Keep credentials and catalog uploads outside Git.
- Keep local development and testing at $0. Public hosting is a separate
  decision that depends on storage and download usage.

## Phased development workflow

Track each phase in a GitHub issue. Work on a branch, commit changes
as they are made, and push the branch so both developers can see the
history. Use sample entries and images for local verification.

### Phase 1 — Repository and local setup

Commit this design doc, scaffold the application, and document how
to install dependencies and start the local app and database.

**Complete when** both developers can clone the repository and run
the same starter app locally.

### Phase 2 — Data model and developer access

Create migrations for entries, entry types, and links. Set up
invited developer accounts and enforce draft and published visibility.

**Complete when** both invited developers can sign in, and signed-out
visitors can read published entries but cannot edit or access drafts.

### Phase 3 — Editing, images, and publishing

Build the developer forms for creating and editing entries, choosing
related entries, and uploading or replacing an image.
Add draft and publish actions.

**Complete when** a developer can create a draft being, link it to a
realm and group, upload an image with alt text, and publish the entry.

### Phase 4 — Public catalog and search

Build the public catalog listing and detail pages under `/catalog`. Add
partial-name search, combinable filters, alphabetical sorting, and links
between entries. Keep the site root available for overall website navigation.

**Complete when** a visitor can find a published being by part of its
name, narrow the results by realm or group, view its image, and follow
a link to a related entry.

### Phase 5 — Verification and code review (CR)

Run the build, linting, and available tests. Verify the full workflow
with both a developer account and a signed-out visitor. Check draft
visibility, editing permissions, image replacement, and search with
multiple filters.

Open a GitHub pull request for the first working version. Include a
summary, local verification steps, and any known limitations. The
other developer reviews the code and tries the workflow. Address
review findings in the same pull request.

**Complete when** the reviewer approves the pull request and all
required checks pass. This workflow ends at code review approval.

## Open design decisions

## Confirmed catalog rules

- Publishing does not require an image. If an image is present, it requires
  descriptive alt text.
- A being can link to one species, multiple realms, and multiple groups.
- The first version supports one entry image only; other file attachments are
  out of scope.