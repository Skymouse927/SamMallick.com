import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const siteUrl = process.env.CATALOG_SITE_URL ?? "http://localhost:3000";
const emails = process.argv.slice(2).map((email) => email.trim().toLowerCase());

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error(
    "Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the shell before reissuing developer invitations.",
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

const existingUsers = [];
for (let page = 1; ; page += 1) {
  const { data, error } = await supabase.auth.admin.listUsers({
    page,
    perPage: 100,
  });
  if (error) {
    throw new Error(`Unable to check pending developer accounts: ${error.message}`);
  }

  existingUsers.push(...data.users);
  if (data.users.length < 100) {
    break;
  }
}

const usersByEmail = new Map(
  existingUsers
    .filter((user) => user.email)
    .map((user) => [user.email.toLowerCase(), user]),
);

const invitations = emails.map((email) => {
  const user = usersByEmail.get(email);
  if (user && (user.confirmed_at || user.email_confirmed_at)) {
    throw new Error(
      "A requested account is already confirmed. No accounts were changed.",
    );
  }
  if (user && !user.invited_at) {
    throw new Error(
      "A requested account is not a pending invitation. No accounts were changed.",
    );
  }
  return { email, user };
});

for (const { email, user } of invitations) {
  if (user) {
    const { error: deleteError } = await supabase.auth.admin.deleteUser(user.id);
    if (deleteError) {
      throw new Error(
        `Unable to replace a pending developer invitation: ${deleteError.message}`,
      );
    }
  }

  const { data, error } = await supabase.auth.admin.inviteUserByEmail(email, {
    redirectTo: new URL("/auth/confirm", siteUrl).toString(),
  });
  if (error) {
    throw new Error(
      `Unable to send a replacement invitation: ${error.message}`,
    );
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
      `An invitation was sent, but developer access could not be granted: ${roleError.message}`,
    );
  }
}

console.log(
  `Reissued ${invitations.length} developer invitation(s). Open Mailpit to accept them.`,
);
