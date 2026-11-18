"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type SiteLogoState = {
  error?: string;
  message?: string;
};

const imageTypes = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
} as const;

export async function saveSiteLogo(
  _previousState: SiteLogoState,
  formData: FormData,
): Promise<SiteLogoState> {
  const supabase = await createClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (!userData.user) {
    redirect("/login");
  }
  if (userError) {
    return { error: `Unable to verify your sign-in: ${userError.message}` };
  }
  if (userData.user.app_metadata.catalog_role !== "developer") {
    return { error: "Catalog developer access is required to change the logo." };
  }

  const image = formData.get("site_logo");
  if (!(image instanceof File) || image.size === 0) {
    return { error: "Choose an image to upload." };
  }
  const extension = Object.entries(imageTypes).find(
    ([mimeType]) => mimeType === image.type,
  )?.[1];
  if (!extension) {
    return { error: "Choose a JPEG, PNG, or WebP image." };
  }
  if (image.size > 5 * 1024 * 1024) {
    return { error: "Images must be 5 MB or smaller." };
  }

  const { data: settings, error: settingsError } = await supabase
    .from("site_settings")
    .select("logo_path")
    .eq("singleton", true)
    .single();

  if (settingsError) {
    return { error: `Unable to load site settings: ${settingsError.message}` };
  }

  const newPath = `site-logo/${crypto.randomUUID()}.${extension}`;
  const { error: uploadError } = await supabase.storage
    .from("catalog-images")
    .upload(newPath, image, {
      contentType: image.type,
      cacheControl: "3600",
      upsert: false,
    });

  if (uploadError) {
    return { error: `Logo upload failed: ${uploadError.message}` };
  }

  const { data: updatedSettings, error: updateError } = await supabase
    .from("site_settings")
    .update({ logo_path: newPath })
    .eq("singleton", true)
    .select("logo_path")
    .single();

  if (updateError || !updatedSettings) {
    const updateMessage =
      updateError?.message ?? "No site settings row was updated.";
    const { error: cleanupError } = await supabase.storage
      .from("catalog-images")
      .remove([newPath]);
    if (cleanupError) {
      return {
        error: `Logo update failed: ${updateMessage}. The uploaded image could not be removed: ${cleanupError.message}`,
      };
    }
    return { error: `Logo update failed: ${updateMessage}` };
  }

  revalidatePath("/");
  revalidatePath("/catalog");
  revalidatePath("/catalog/[id]", "page");
  revalidatePath("/developer");

  if (settings.logo_path) {
    const { error: cleanupError } = await supabase.storage
      .from("catalog-images")
      .remove([settings.logo_path]);
    if (cleanupError) {
      return {
        message: `Logo updated, but the previous image could not be removed: ${cleanupError.message}`,
      };
    }
  }

  return { message: "Site logo updated." };
}
