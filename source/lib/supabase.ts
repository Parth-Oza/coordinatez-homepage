import { createClient } from "@supabase/supabase-js";

export const SUPABASE_URL = "https://xeznqeyramjaofqxjvrs.supabase.co";
export const SUPABASE_PUBLISHABLE_KEY =
  "sb_publishable_l3ceMcOxQFDMc855RPpOMA_0KJ-vTZw";

export const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  },
);

export const publicSiteUrl =
  "https://parth-oza.github.io/coordinatez-homepage/";
