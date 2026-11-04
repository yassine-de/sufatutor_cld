import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// Verifies the session with the auth server (unlike the proxy's optimistic check) and
// returns the user, or sends the visitor to the login page. Deduplicated per request.
export const requireUser = cache(async (lang: string) => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect(`/${lang}/login`);
  return data.user;
});
