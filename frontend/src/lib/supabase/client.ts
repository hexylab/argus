import { createBrowserClient } from "@supabase/ssr";

/**
 * Create a Supabase client for use in Client Components.
 *
 * This client is used in browser environments (Client Components)
 * for authentication and data operations.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
