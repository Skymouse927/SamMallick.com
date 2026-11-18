import { createClient } from "@/lib/supabase/server";
import type { CatalogEntry, CatalogRelationship } from "./catalog-types";

export {
  ENTRY_TYPE_LABELS,
  ENTRY_TYPES,
  RELATIONSHIP_LABELS,
} from "./catalog-types";
export type {
  CatalogEntry,
  CatalogRelationship,
  EntryType,
  RelationshipType,
} from "./catalog-types";

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

export async function loadPublishedCatalog() {
  const supabase = await createClient();
  const [entriesResult, relationshipsResult] = await Promise.all([
    supabase
      .from("entries")
      .select(
        "id, name, description, entry_type_id, status, image_path, image_alt",
      )
      .eq("status", "published")
      .order("name"),
    supabase
      .from("entry_relationships")
      .select("source_entry_id, relationship_type, target_entry_id"),
  ]);

  if (entriesResult.error) {
    throw new Error(
      `Unable to load published catalog entries: ${entriesResult.error.message}`,
    );
  }
  if (relationshipsResult.error) {
    throw new Error(
      `Unable to load published catalog relationships: ${relationshipsResult.error.message}`,
    );
  }

  return {
    supabase,
    entries: entriesResult.data as CatalogEntry[],
    relationships: relationshipsResult.data as CatalogRelationship[],
  };
}

export async function getPublicImageUrl(
  supabase: SupabaseClient,
  imagePath: string | null,
): Promise<string | null> {
  if (!imagePath) {
    return null;
  }

  const { data, error } = await supabase.storage
    .from("catalog-images")
    .createSignedUrl(imagePath, 3600);

  if (error) {
    throw new Error(`Unable to load a published catalog image: ${error.message}`);
  }

  return data.signedUrl;
}

export function getRelationshipsByEntry(
  relationships: CatalogRelationship[],
): Map<string, CatalogRelationship[]> {
  const grouped = new Map<string, CatalogRelationship[]>();
  for (const relationship of relationships) {
    const entryRelationships =
      grouped.get(relationship.source_entry_id) ?? [];
    entryRelationships.push(relationship);
    grouped.set(relationship.source_entry_id, entryRelationships);
  }
  return grouped;
}
