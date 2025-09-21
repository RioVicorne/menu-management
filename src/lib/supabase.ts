import { createClient } from "@supabase/supabase-js";
import { logger } from "./logger";

// Check if environment variables are set
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  logger.warn(
    "Supabase environment variables are not set. Using mock data mode.",
  );
  logger.info("URL:", supabaseUrl);
  logger.info("Key:", supabaseAnonKey ? "Present" : "Missing");
}

export const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null;
