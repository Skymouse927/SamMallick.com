# Catalog App Design

## Purpose

Build a public, searchable catalog of beings, realms, species, groups,
and other entry types as the catalog grows. Anyone can browse published
entries without signing in. Two invited developers can add and edit
entries, and more developers can be invited later.

## How the catalog works

### Entries and relationships

Each entry has a name, a description, an entry type, optional descriptive
tags, and space for one uploaded image with alt text. The initial entry
types are Being, Realm, Species, and Group.

Realms, species, and groups have their own pages. A developer adding a
being selects its realm, species, and groups from existing entries.
These links power the public filters and let visitors move between
related pages. Renaming a group updates its displayed name wherever
it is linked.

Descriptive tags cover traits such as `nocturnal` or `shapeshifter`.
A later phase can add relationships such as “allied with” or “founded by.”

### Public browsing

- Search by full or partial entry name, regardless of capitalization.
- Combine name search with filters for type, realm, species, group,
  and descriptive tags.
- Sort matching entries alphabetically by name by default.
- Show the entry image as a thumbnail in results and at a larger size
  on its detail page.
- Reflect changes to published names, tags, and links automatically.
  Developers do not have to maintain category lists by hand.

### Developer editing

1. Sign in with an invited developer account.
2. Create an entry and choose its type.
3. Add its name, description, applicable links, and descriptive tags.
4. Upload an image and add alt text. The image can be replaced later.
5. Save the entry as a draft or publish it.

Only developers can access drafts and change entries or images.
The app enforces these permissions on the server and in the database
and storage policies. Visitors can read published entries and view
their associated images.

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

Create migrations for entries, entry types, tags, and links. Set up
invited developer accounts and enforce draft and published visibility.

**Complete when** both invited developers can sign in, and signed-out
visitors can read published entries but cannot edit or access drafts.

### Phase 3 — Editing, images, and publishing

Build the developer forms for creating and editing entries, choosing
related entries, applying tags, and uploading or replacing an image.
Add draft and publish actions.

**Complete when** a developer can create a draft being, link it to a
realm and group, upload an image with alt text, and publish the entry.

### Phase 4 — Public catalog and search

Build the public listing and detail pages. Add partial-name search,
combinable filters, alphabetical sorting, and links between entries.

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

- Decide whether publishing requires an image or allows a placeholder.
- Confirm whether a being can link to multiple realms or species.
  The working assumption is one species and multiple groups.
- Confirm whether the first version needs file attachments beyond
  the entry image.