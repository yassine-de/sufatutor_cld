import { createServerClient } from "@supabase/ssr";
import { io } from "next/cache";
import { cookies } from "next/headers";

// Per-request client that acts as the signed-in user (RLS applies).
export async function createClient() {
  const cookieStore = await cookies();
  // supabase-js reads Date.now() to check the session expiry; Cache Components only allows
  // that after io(), which suspends during prerendering and resolves at request time.
  await io();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            // Called from a Server Component: cookies are refreshed by the proxy instead.
          }
        },
      },
    },
  );
}
