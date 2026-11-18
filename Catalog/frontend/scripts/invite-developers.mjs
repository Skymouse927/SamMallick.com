import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const siteUrl = process.env.CATALOG_SITE_URL ?? "http://localhost:3000";
const emails = process.argv.slice(2).map((email) => email.trim().toLowerCase());

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error(
    "Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the shell before inviting developers.",
  );
}

if (emails.length === 0 || emails.some((email) => !email.includes("@"))) {
  throw new Error(
    "Provide one or more valid email addresses after the command.",
  );
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

for (const email of emails) {
  const { data, error } = await supabase.auth.admin.inviteUserByEmail(email, {
    redirectTo: new URL("/auth/confirm", siteUrl).toString(),
  });
  if (error) {
    const cause =
      error.cause instanceof Error ? ` (${error.cause.message})` : "";
    throw new Error(`Unable to invite ${email}: ${error.message}${cause}`);
  }

  const { error: roleError } = await supabase.auth.admin.updateUserById(
    data.user.id,
    {
      app_metadata: {
        ...data.user.app_metadata,
        catalog_role: "developer",
      },
    },
  );

  if (roleError) {
    throw new Error(
      `Invitation was sent to ${email}, but developer access could not be granted: ${roleError.message}`,
    );
  }

  console.log(`Invited ${email} as a Catalog developer.`);
}
