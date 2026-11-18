import { createClient } from "@/lib/supabase/server";

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

export async function getSiteLogo(supabase: SupabaseClient) {
  const { data: settings, error: settingsError } = await supabase
    .from("site_settings")
    .select("logo_path")
    .eq("singleton", true)
    .single();

  if (settingsError) {
    throw new Error(`Unable to load site settings: ${settingsError.message}`);
  }
  if (!settings.logo_path) {
    return null;
  }

  const { data, error } = await supabase.storage
    .from("catalog-images")
    .createSignedUrl(settings.logo_path, 3600);

  if (error) {
    throw new Error(`Unable to load the site logo: ${error.message}`);
  }

  return { url: data.signedUrl };
}
