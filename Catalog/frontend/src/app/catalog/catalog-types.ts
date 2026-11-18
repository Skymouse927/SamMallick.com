export const ENTRY_TYPES = ["being", "realm", "species", "group"] as const;
export type EntryType = (typeof ENTRY_TYPES)[number];
export type RelationshipType = "realm" | "species" | "group";

export type CatalogEntry = {
  id: string;
  name: string;
  description: string;
  entry_type_id: EntryType;
  status: "draft" | "published";
  image_path: string | null;
  image_alt: string | null;
};

export type CatalogRelationship = {
  source_entry_id: string;
  relationship_type: RelationshipType;
  target_entry_id: string;
};

export const ENTRY_TYPE_LABELS: Record<EntryType, string> = {
  being: "Being",
  realm: "Realm",
  species: "Species",
  group: "Group",
};

export const RELATIONSHIP_LABELS: Record<RelationshipType, string> = {
  realm: "Realms",
  species: "Species",
  group: "Groups",
};
