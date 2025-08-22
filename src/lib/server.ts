import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export const createClient = () => {
  const cookieStore = cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: async () => (await cookieStore).getAll(),
        setAll: (cookiesToSet) => {
          try {
            cookiesToSet.forEach(async ({ name, value, options }) => (await cookieStore).set(name, value, options));
          } catch {
            // Ignore errors outside write periods (e.g., static rendering)
          }
        },
      },
    }
  );
};