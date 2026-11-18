"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type SaveEntryState = {
  error?: string;
  message?: string;
};

export type EntryType = "being" | "realm" | "species" | "group";

export type EntryOption = {
  id: string;
  name: string;
  entry_type_id: EntryType;
  status: "draft" | "published";
};

export type RelatedEntryState = {
  error?: string;
  createdEntry?: EntryOption;
};

export type DeleteEntryState = {
  error?: string;
};

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

const uuidPattern =
  /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;

const imageTypes = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
} as const;

function getString(formData: FormData, key: string): string | null {
  const value = formData.get(key);
  return typeof value === "string" ? value : null;
}

function getUuidList(formData: FormData, key: string): string[] | null {
  const values = formData.getAll(key);
  if (
    values.some(
      (value) => typeof value !== "string" || !uuidPattern.test(value),
    )
  ) {
    return null;
  }
  return [
    ...new Set(
      values.filter((value): value is string => typeof value === "string"),
    ),
  ];
}

function getImageFile(
  formData: FormData,
): { file: File | null; error?: string } {
  const imageValue = formData.get("image");
  if (imageValue !== null && !(imageValue instanceof File)) {
    return { file: null, error: "The selected image could not be read." };
  }
  const file = imageValue instanceof File && imageValue.size > 0
    ? imageValue
    : null;
  if (file && !Object.hasOwn(imageTypes, file.type)) {
    return { file: null, error: "Choose a JPEG, PNG, or WebP image." };
  }
  if (file && file.size > 5 * 1024 * 1024) {
    return { file: null, error: "Images must be 5 MB or smaller." };
  }
  return { file };
}

async function uploadImage(
  supabase: SupabaseClient,
  entryId: string,
  file: File,
): Promise<{ path?: string; error?: string }> {
  const extension = Object.entries(imageTypes).find(
    ([mimeType]) => mimeType === file.type,
  )?.[1];
  if (!extension) {
    return { error: "Choose a JPEG, PNG, or WebP image." };
  }

  const path = `${entryId}/${crypto.randomUUID()}.${extension}`;
  const { error } = await supabase.storage
    .from("catalog-images")
    .upload(path, file, {
      contentType: file.type,
      cacheControl: "3600",
      upsert: false,
    });

  if (error) {
    return { error: `Image upload failed: ${error.message}` };
  }

  return { path };
}

async function removeUploadedImage(
  supabase: SupabaseClient,
  path: string,
): Promise<string | null> {
  const { error } = await supabase.storage
    .from("catalog-images")
    .remove([path]);
  return error?.message ?? null;
}

export async function saveEntry(
  _previousState: SaveEntryState,
  formData: FormData,
): Promise<SaveEntryState> {
  const supabase = await createClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (!userData.user) {
    redirect("/login");
  }
  if (userError) {
    return { error: `Unable to verify your sign-in: ${userError.message}` };
  }
  if (userData.user.app_metadata.catalog_role !== "developer") {
    return { error: "Catalog developer access is required to save entries." };
  }

  const requestedId = getString(formData, "id");
  if (requestedId && !uuidPattern.test(requestedId)) {
    return { error: "The entry ID is invalid." };
  }

  const entryId = requestedId || crypto.randomUUID();
  const name = getString(formData, "name")?.trim() ?? "";
  const description = getString(formData, "description")?.trim() ?? "";
  const entryType = getString(formData, "entry_type_id");
  const status = getString(formData, "status");
  const imageAlt = getString(formData, "image_alt")?.trim() ?? "";
  const realmIds = getUuidList(formData, "realmIds");
  const groupIds = getUuidList(formData, "groupIds");
  const speciesId = getString(formData, "speciesId") || null;

  if (!name) {
    return { error: "Enter an entry name." };
  }
  if (!["being", "realm", "species", "group"].includes(entryType ?? "")) {
    return { error: "Choose a valid entry type." };
  }
  if (status !== "draft" && status !== "published") {
    return { error: "Choose Save draft or Publish entry." };
  }
  if (!realmIds || !groupIds) {
    return { error: "One or more selected realm or group IDs are invalid." };
  }
  if (speciesId && !uuidPattern.test(speciesId)) {
    return { error: "The selected species ID is invalid." };
  }
  const { data: existingEntry, error: existingEntryError } = requestedId
    ? await supabase
        .from("entries")
        .select("image_path")
        .eq("id", entryId)
        .maybeSingle()
    : { data: null, error: null };

  if (existingEntryError) {
    return { error: `Unable to load the entry: ${existingEntryError.message}` };
  }
  if (requestedId && !existingEntry) {
    return { error: "The entry no longer exists or is not accessible." };
  }

  const imageResult = getImageFile(formData);
  if (imageResult.error) {
    return { error: imageResult.error };
  }
  const imageFile = imageResult.file;

  const oldImagePath = existingEntry?.image_path ?? null;
  if (!imageFile && !oldImagePath && imageAlt) {
    return { error: "Alt text can only be saved when an image is present." };
  }
  if ((imageFile || oldImagePath) && !imageAlt) {
    return { error: "Add descriptive alt text for the image." };
  }
  if (imageAlt.length > 500) {
    return { error: "Image alt text cannot exceed 500 characters." };
  }

  let imagePath = oldImagePath;
  let newImagePath: string | null = null;
  if (imageFile) {
    const uploadResult = await uploadImage(supabase, entryId, imageFile);
    if (uploadResult.error || !uploadResult.path) {
      return { error: uploadResult.error ?? "Image upload failed." };
    }
    newImagePath = uploadResult.path;
    imagePath = uploadResult.path;
  }

  const { error: saveError } = await supabase.rpc("save_catalog_entry", {
    p_entry_id: entryId,
    p_name: name,
    p_description: description,
    p_entry_type_id: entryType,
    p_status: status,
    p_realm_ids: entryType === "being" ? realmIds : [],
    p_species_id: entryType === "being" ? speciesId : null,
    p_group_ids: entryType === "being" ? groupIds : [],
    p_image_path: imagePath,
    p_image_alt: imagePath ? imageAlt : null,
  });

  if (saveError) {
    if (newImagePath) {
      const cleanupError = await removeUploadedImage(supabase, newImagePath);
      if (cleanupError) {
        return {
          error: `Entry save failed: ${saveError.message}. The new image could not be cleaned up: ${cleanupError}`,
        };
      }
    }
    return { error: `Entry save failed: ${saveError.message}` };
  }

  revalidatePath("/developer");
  revalidatePath(`/developer/entries/${entryId}/edit`);

  if (!requestedId) {
    redirect(`/developer/entries/${entryId}/edit`);
  }

  if (newImagePath && oldImagePath) {
    const { error: cleanupError } = await supabase.storage
      .from("catalog-images")
      .remove([oldImagePath]);
    if (cleanupError) {
      return {
        message: `Entry saved, but the previous image could not be removed: ${cleanupError.message}`,
      };
    }
  }

  return { message: "Entry saved." };
}

export async function createRelatedEntry(
  _previousState: RelatedEntryState,
  formData: FormData,
): Promise<RelatedEntryState> {
  const supabase = await createClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (!userData.user) {
    redirect("/login");
  }
  if (userError) {
    return { error: `Unable to verify your sign-in: ${userError.message}` };
  }
  if (userData.user.app_metadata.catalog_role !== "developer") {
    return { error: "Catalog developer access is required to create entries." };
  }

  const sourceEntryId = getString(formData, "sourceEntryId");
  const relationshipType = getString(formData, "relationshipType");
  const name = getString(formData, "name")?.trim() ?? "";
  const description = getString(formData, "description")?.trim() ?? "";
  const status = getString(formData, "status");
  const imageAlt = getString(formData, "image_alt")?.trim() ?? "";

  if (!sourceEntryId || !uuidPattern.test(sourceEntryId)) {
    return { error: "The Being ID is invalid." };
  }
  if (
    relationshipType !== "realm" &&
    relationshipType !== "species" &&
    relationshipType !== "group"
  ) {
    return { error: "Choose a valid related entry type." };
  }
  if (!name) {
    return { error: "Enter a name for the related entry." };
  }
  if (status !== "draft" && status !== "published") {
    return { error: "Choose Save draft or Publish entry." };
  }
  const { data: sourceEntry, error: sourceEntryError } = await supabase
    .from("entries")
    .select("entry_type_id")
    .eq("id", sourceEntryId)
    .maybeSingle();
  if (sourceEntryError) {
    return {
      error: `Unable to load the Being: ${sourceEntryError.message}`,
    };
  }
  if (sourceEntry?.entry_type_id !== "being") {
    return { error: "Related entries can only be created from a Being." };
  }

  const imageResult = getImageFile(formData);
  if (imageResult.error) {
    return { error: imageResult.error };
  }
  const imageFile = imageResult.file;

  if (!imageFile && imageAlt) {
    return { error: "Alt text can only be saved when an image is present." };
  }
  if (imageFile && !imageAlt) {
    return { error: "Add descriptive alt text for the image." };
  }
  if (imageAlt.length > 500) {
    return { error: "Image alt text cannot exceed 500 characters." };
  }

  const entryId = crypto.randomUUID();
  let imagePath: string | null = null;
  if (imageFile) {
    const uploadResult = await uploadImage(supabase, entryId, imageFile);
    if (uploadResult.error || !uploadResult.path) {
      return { error: uploadResult.error ?? "Image upload failed." };
    }
    imagePath = uploadResult.path;
  }

  const { error: saveError } = await supabase.rpc(
    "create_catalog_related_entry",
    {
      p_entry_id: entryId,
      p_source_entry_id: sourceEntryId,
      p_relationship_type: relationshipType,
      p_name: name,
      p_description: description,
      p_status: status,
      p_image_path: imagePath,
      p_image_alt: imagePath ? imageAlt : null,
    },
  );

  if (saveError) {
    if (imagePath) {
      const cleanupError = await removeUploadedImage(supabase, imagePath);
      if (cleanupError) {
        return {
          error: `Related entry save failed: ${saveError.message}. The uploaded image could not be cleaned up: ${cleanupError}`,
        };
      }
    }
    return { error: `Related entry save failed: ${saveError.message}` };
  }

  revalidatePath("/developer");
  revalidatePath(`/developer/entries/${sourceEntryId}/edit`);

  return {
    createdEntry: {
      id: entryId,
      name,
      entry_type_id: relationshipType,
      status,
    },
  };
}

export async function deleteEntry(
  _previousState: DeleteEntryState,
  formData: FormData,
): Promise<DeleteEntryState> {
  const supabase = await createClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (!userData.user) {
    redirect("/login");
  }
  if (userError) {
    return { error: `Unable to verify your sign-in: ${userError.message}` };
  }
  if (userData.user.app_metadata.catalog_role !== "developer") {
    return { error: "Catalog developer access is required to delete entries." };
  }

  const entryId = getString(formData, "id");
  if (!entryId || !uuidPattern.test(entryId)) {
    return { error: "The entry ID is invalid." };
  }

  const { data: entry, error: entryError } = await supabase
    .from("entries")
    .select("image_path")
    .eq("id", entryId)
    .maybeSingle();
  if (entryError) {
    return { error: `Unable to load the entry before deletion: ${entryError.message}` };
  }
  if (!entry) {
    return { error: "The entry no longer exists or is not accessible." };
  }

  const { data: deletedEntry, error: deleteError } = await supabase
    .from("entries")
    .delete()
    .eq("id", entryId)
    .select("id")
    .maybeSingle();
  if (deleteError) {
    return { error: `Unable to delete the entry: ${deleteError.message}` };
  }
  if (!deletedEntry) {
    return { error: "The entry was not deleted; it may already be gone." };
  }

  revalidatePath("/developer");

  if (entry.image_path) {
    const { error: imageError } = await supabase.storage
      .from("catalog-images")
      .remove([entry.image_path]);
    if (imageError) {
      redirect("/developer?deleted=image-cleanup-failed");
    }
  }

  redirect("/developer?deleted=success");
}
